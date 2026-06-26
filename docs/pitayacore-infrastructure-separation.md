# PitayaCore Infrastructure Separation

## Goal

Create an isolated PitayaCore stack without modifying the legacy system.

## Target Topology

- Docker network: `pitayacode_net`
- MySQL container: `pitaya-mysql-prod`
- PostgreSQL container: `pitaya-postgres-prod`
- MySQL database: `pitayacore_db`
- PostgreSQL database: `pitayacore_vectors`
- Production config source: `api/.env.prod`

## Phase 1: Audit Source Databases

Run these on the legacy source containers.

### MySQL audit

```powershell
docker exec -i luxury-mysql-prod mysql -uroot -pluxury_pass -e "
SELECT table_schema AS db_name,
       COUNT(*) AS total_tables,
       ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
FROM information_schema.tables
WHERE table_schema = 'acuacore_db';

SELECT COUNT(*) AS foreign_keys
FROM information_schema.referential_constraints
WHERE constraint_schema = 'acuacore_db';

SELECT COUNT(*) AS triggers
FROM information_schema.triggers
WHERE trigger_schema = 'acuacore_db';

SELECT COUNT(*) AS procedures
FROM information_schema.routines
WHERE routine_schema = 'acuacore_db' AND routine_type = 'PROCEDURE';

SELECT COUNT(*) AS views
FROM information_schema.views
WHERE table_schema = 'acuacore_db';
"
```

### PostgreSQL audit

```powershell
docker exec -i acua-core-postgres psql -U acuacore_user -d acuacore_vectors -c "
SELECT COUNT(*) AS total_tables
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

SELECT pg_size_pretty(pg_database_size(current_database())) AS size;

SELECT COUNT(*) AS foreign_keys
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public';

SELECT COUNT(*) AS views
FROM information_schema.views
WHERE table_schema = 'public';
"
```

## Phase 2: MySQL Clone Plan

1. Capture `SHOW CREATE DATABASE acuacore_db` and match charset/collation on the target.
2. Create `pitayacore_db` with the same charset/collation.
3. Dump source with routines, triggers, and events enabled.
4. Restore into `pitayacore_db`.
5. Verify table count, foreign keys, and row counts.

### MySQL backup

```powershell
docker exec luxury-mysql-prod mysqldump -uroot -pluxury_pass `
  --single-transaction --routines --triggers --events --hex-blob `
  --databases acuacore_db > acuacore_db.sql
```

### MySQL restore

```powershell
docker exec -i pitaya-mysql-prod mysql -uroot -pluxury_pass -e "
CREATE DATABASE IF NOT EXISTS pitayacore_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
"
docker exec -i pitaya-mysql-prod mysql -uroot -pluxury_pass pitayacore_db < acuacore_db.sql
```

## Phase 3: PostgreSQL Clone Plan

1. Capture installed extensions from the source database.
2. Create `pitayacore_vectors`.
3. Enable `vector` before restore.
4. Dump source with schema, data, and owners excluded.
5. Restore into `pitayacore_vectors`.
6. Verify indexes, extensions, and embedding rows.

### PostgreSQL backup

```powershell
docker exec acua-core-postgres pg_dump -U acuacore_user -d acuacore_vectors `
  --format=custom --no-owner --no-privileges > acuacore_vectors.dump
```

### PostgreSQL restore

```powershell
docker exec -i pitaya-postgres-prod psql -U acuacore_user -d postgres -c "CREATE DATABASE pitayacore_vectors;"
docker exec -i pitaya-postgres-prod psql -U acuacore_user -d pitayacore_vectors -c "CREATE EXTENSION IF NOT EXISTS vector;"
docker exec -i pitaya-postgres-prod pg_restore -U acuacore_user -d pitayacore_vectors --no-owner --no-privileges < acuacore_vectors.dump
```

## Phase 4: Docker Network

```powershell
docker network create pitayacode_net
```

If it already exists, leave it untouched.

## Phase 5: Docker Compose

- Use `docker-compose.yml` for the PitayaCore local stack.
- Use `docker-compose.prod.yml` for production deployment.
- Both files now point at `api/.env.prod`.
- Both files use `pitayacode_net`.
- Both files use `pitaya-mysql-prod` and `pitaya-postgres-prod`.

## Phase 6: PitayaCore Config

Update only PitayaCore runtime config:

- `DATABASE_URL` -> `pitaya-mysql-prod/pitayacore_db`
- `VECTOR_DATABASE_URL` -> `pitaya-postgres-prod/pitayacore_vectors`
- `PITAYACORE_API_URL` -> PitayaCore API endpoint

## Phase 7: Migration Checklist

1. Backup `acuacore_db`.
2. Backup `acuacore_vectors`.
3. Create `pitayacore_db`.
4. Create `pitayacore_vectors`.
5. Restore MySQL dump.
6. Restore PostgreSQL dump.
7. Validate record counts.
8. Validate foreign keys.
9. Validate Prisma connectivity.
10. Validate pgvector queries and embeddings.

## Executable Scripts

- `backup_pitayacore.ps1` creates timestamped backups plus a manifest.
- `restore_pitayacore.ps1` restores the latest backup set by default, or a chosen backup set with `-BackupSet`.

## Validation Checklist

- AcuaCore still connects to `acuacore_db` and `acuacore_vectors`.
- PitayaCore connects to `pitayacore_db` and `pitayacore_vectors`.
- `npx prisma validate` succeeds for both schemas.
- MySQL foreign keys are present.
- PostgreSQL `vector` extension is installed.
- Embedding reads and writes succeed.
- Agent queries still resolve correctly.

## Rollback Plan

1. Stop PitayaCore containers.
2. Restore `api/.env.prod` from backup if needed.
3. Point PitayaCore back to the previous database hosts only if the rollback requires it.
4. Drop only `pitayacore_db` and `pitayacore_vectors` if they were newly created and are no longer needed.
5. Restore the last known-good dumps into the target databases.

The legacy system is never modified during rollback.
