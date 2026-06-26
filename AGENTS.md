# AGENTS.md — PitayaCore

Multi-tenant AI agent platform: NestJS API + two React frontends + Python CLI.

## Architecture

```
/ (root)        → Obsidian Command Center (Vite+React, port 3000, admin UI)
/api            → NestJS backend (port 2014 dev / 3015 Docker/prod)
/web            → React PWA frontend for end users (port 3000, proxied to API)
/cli            → Python admin CLI (httpx + rich)
```

**Dual database**: MySQL (transactional, Prisma) + PostgreSQL with pgvector (vectors, separate Prisma client).
- MySQL schema: `api/prisma/mysql.prisma` (40+ models)
- Postgres schema: `api/prisma/postgres.prisma` (single `VectorRecord` model, `vector(1536)`)
- Prisma clients generated to `@prisma/mysql-client` and `@prisma/postgres-client` (custom output paths)
- Both managed by `DatabaseService` (`api/src/common/database/database.service.ts`) — `@Global()` module

**Multi-tenancy**: `AsyncLocalStorage`-based via `TenantMiddleware`. Every request needs `x-tenant-id` header. `getTenantId()` throws if missing.

**Auth chain** (global `CombinedAuthGuard`):
1. `@Public()` decorator → bypass
2. `x-user-role: ADMIN|SYSTEM` header → bypass with mock user
3. `x-api-key` or `x-internal-key` header → matches `INTERNAL_API_KEY` env
4. JWT Bearer token → Passport JWT (1-day expiry)

Additional global guards: `ThrottlerGuard` (100 req/60s), `FeatureFlagGuard` (`@RequireFeature`), `TenantOwnershipGuard`.

## Commands

### Root (Obsidian Command Center)
```bash
npm run dev          # Vite dev server on port 3000
npm run build        # Vite build
npm run lint         # tsc --noEmit (typecheck only, no eslint)
```

### API (`cd api`)
```bash
npm run start:dev    # NestJS watch mode (port 2014)
npm run build        # nest build
npm run lint         # eslint "{src,apps,libs,test}/**/*.ts" --fix
npm run test         # jest (unit tests, *.spec.ts)
npm run test:e2e     # jest --config ./test/jest-e2e.json
npm run test:cov     # jest --coverage
npm run format       # prettier --write
npm run db:init-skills  # ts-node init-all-skills.ts
```

### Web (`cd web`)
```bash
npm run dev          # Vite dev server on port 3000
npm run build        # tsc -b && vite build (typecheck then build)
npm run lint         # eslint .
```

### Docker (from root)
```bash
docker compose up -d mysql postgres   # Start databases only
docker compose up -d                  # Start all services
```

### Dev launcher (Windows)
```powershell
.\dev.ps1   # Starts Docker + API + Web in separate PowerShell windows
```

## Environment Files

| File | Purpose |
|---|---|
| `api/.env` | Local dev (create from `.env.pitayacore`) |
| `api/.env.pitayacore` | Legacy shared config used by older compose files |
| `api/.env.production` | Production config (pitayacore branding) |
| `api/.env.prod` | Production master config (PitayaCore) |
| `web/.env` | `VITE_API_URL=http://localhost:3015` |
| `web/.env.production` | `VITE_API_URL=https://pitayacore-api.pitayacode.io` |
| `.env.pitayacore` | Root: `GEMINI_API_KEY` + `APP_URL` |

**Required env vars** (see `api/.env.prod` for current production values): `DATABASE_URL`, `VECTOR_DATABASE_URL`, `GEMINI_API_KEY`, `JWT_SECRET`, `INTERNAL_API_KEY`.

**Docker-compose** reads from `api/.env.prod` and expects `MYSQL_DATABASE`, `MYSQL_ROOT_PASSWORD`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`.

## Port Map

| Service | Local (direct) | Docker | Production |
|---|---|---|---|
| API (NestJS) | 2014 | 3015 | 3015 (`pitayacore-api`) |
| Web (Vite) | 3000 | — | `pitayacore.pitayacode.io` |
| MySQL | 3306 | 3306 | `pitaya-mysql-prod:3306` |
| PostgreSQL | 5434 | 5434 | `pitaya-postgres-prod:5432` |

## Database Names

| DB | Local/Current | Legacy/Prod |
|---|---|---|
| MySQL | `pitayacore_db` | `acuacore_db` |
| PostgreSQL | `pitayacore_vectors` | `acuacore_vectors` |

## Deployment Topology

| Layer | Local | Production |
|---|---|---|
| API server | `localhost:2014` | `46.224.155.43:3015` |
| Web host | `localhost:3000` | `185.212.71.206:65002` |
| MySQL container | `pitayacore-mysql` | `pitaya-mysql-prod` |
| PostgreSQL container | `pitayacore-pgvector` | `pitaya-postgres-prod` |
| Docker network | `pitaya_net` (legacy) | `pitayacode_net` |

## API Modules (28 registered in `app.module.ts`)

Key modules: `Tenants`, `Auth` (@Global), `Agents`, `Skills`, `KnowledgeBase`, `Conversations` (WebSocket), `Hitl`, `Capsules`, `Crm`, `Ecommerce`, `Workspace`, `Ai`, `Vision`, `Credits`, `VectorSearch`.

Global modules (injectable anywhere without import): `DatabaseModule`, `AuthModule`, `MailModule`.

## Web Architecture

- **No centralized API client** — every module makes inline `axios` calls with pattern: `import.meta.env.VITE_API_URL || 'http://localhost:3014'`
- **State**: `TenantContext` (single React Context) + `localStorage` for auth/tenant persistence. TanStack React Query configured but only used in workspace hooks.
- **Routing**: Hybrid — URL routing for public pages + capsule studio; tab-based SPA navigation inside dashboards (most module URLs not in address bar).
- **Module registry**: `web/src/modules/modules.config.ts` — 29 modules across 5 categories, controlled by `permissions.menus` and `enabledModules`.
- **PWA**: Full service worker via `vite-plugin-pwa`, auto-update.
- **i18n**: Spanish default, English fallback. Only ~20 keys translated; most UI hardcoded in Spanish.

## Web Proxy (dev)

`/api` → `http://localhost:2014`, `/socket.io` → `http://localhost:2014` (WebSocket). Configured in `web/vite.config.ts`.

## Prisma Workflow

```bash
cd api
npx prisma generate --schema=prisma/mysql.prisma     # Generate MySQL client
npx prisma generate --schema=prisma/postgres.prisma   # Generate Postgres client
npx prisma db push                                     # Push MySQL schema
npx prisma db push --schema=prisma/postgres.prisma     # Push Postgres schema
```

Both schemas must be generated separately. The Dockerfile does both in the builder stage.

## Seed Files

| File | Purpose |
|---|---|
| `seed-admin.ts` | Admin user `admin@pitayacode.io` / `pitaya123` |
| `seed-foundation.ts` | Verticals, features, suites, skills, agent templates, characters |
| `seed-agents.ts` | 15+ agents across tenants |
| `seed-suites.ts` | 10 skill suites with 33 skills |
| `init-skills-fixed.ts` | Aquaculture skill for Acuaequipos tenant |
| `init-all-skills.ts` | 8 aquaculture skills (`npm run db:init-skills`) |

Default tenant ID: `edd1ac37-5ff9-4e46-bc7f-fff3c414d718` (Acuaequipos).

## Deployment

- **API**: Hetzner server `46.224.155.43`, SSH key `~/.ssh/id_citaia`. Script: `.\scripts\deploy_api_hetzner.ps1`
- **Web**: Hostinger `185.212.71.206:65002`. Script: `.\scripts\deploy_web_hostinger.ps1`
- **Schema push to prod**: `.\scripts\push_schema_to_prod.ps1` (no data loss)
- **DB sync prod→local**: `.\scripts\sync_prod_to_local.ps1` (MySQL only)
- **Network**: Docker network `pitayacode_net` (external, must exist)

## Current Infra

| Area | Local | Production |
|---|---|---|
| API host | `localhost:2014` | `46.224.155.43:3015` |
| Web host | `localhost:3000` | `185.212.71.206:65002` |
| API container | `pitayacore-api` | `pitayacore-api` |
| MySQL container | `pitayacore-mysql` | `pitaya-mysql-prod` |
| PostgreSQL container | `pitayacore-pgvector` | `pitaya-postgres-prod` |
| MySQL database | `pitayacore_db` | `acuacore_db` -> `pitayacore_db` clone |
| PostgreSQL database | `pitayacore_vectors` | `acuacore_vectors` -> `pitayacore_vectors` clone |
| Production network | `pitaya_net` | `pitayacode_net` |

## Production Sync

- DB sync prod→local (MySQL): scripts/sync_prod_to_local.ps1
- DB sync prod→local (Postgres): scripts/sync_postgres_to_local.ps1
- DB sync local→prod (Postgres): scripts/sync_postgres_to_prod.ps1

## Testing

- **API unit tests**: `*.spec.ts` alongside source (jest + ts-jest)
- **API E2E**: `test/*.e2e-spec.ts` (supertest). All requests need `x-api-key` header.
- **Web**: One test file exists (`Inbox.test.tsx`) but test infra (vitest) is not installed. Cannot run web tests currently.
- **Test command order**: `npm run lint` (eslint) → `npm run test` (jest)

## Quirks & Gotchas

1. **Three separate Vite apps**: Root `/`, `/web`, and `/api` (NestJS) each have own `vite.config.ts`/`package.json`. Don't confuse them.
2. **Port inconsistency**: API defaults to `2014` via `nest start` but `3015` in Docker. Web `.env` says `3015` but Vite proxy targets `2014`. Components fallback to `3014`. Always check which port context you're in.
3. **Prisma custom output**: MySQL client at `@prisma/mysql-client`, Postgres at `@prisma/postgres-client` — not the standard `@prisma/client`.
4. **No `.env` at root for API**: Root `vite.config.ts` loads env from `.` (root dir) for `GEMINI_API_KEY`. API reads its own `.env` from `api/`.
5. **`strictNullChecks: false`** and `noImplicitAny: false` in API tsconfig — lenient TypeScript.
6. **Web has no `typecheck` script** — use `tsc -b` manually or rely on `npm run build` which runs `tsc -b && vite build`.
7. **`scratch/` directory** is gitignored and contains ad-hoc debug/admin scripts. Some have hardcoded credentials.
8. **CLI is Windows-only** — uses `msvcrt` for raw keyboard input.
9. **`dev.ps1` opens separate PowerShell windows** — not suitable for headless/CI environments.
10. **Global middleware** (`TenantMiddleware`) on ALL routes — even public endpoints receive it, but `getTenantId()` only throws if called without context.
11. **WebSocket** only used in `Inbox.tsx` and `CapsuleChat.tsx` on the web side.
12. **Most web components are monolithic** — 500-1400 lines each, inline API calls, no service layer.
