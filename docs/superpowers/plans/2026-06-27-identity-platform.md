# PitayaCore Identity Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform PitayaCore into the central Identity and Authorization Platform for all PitayaCode products (Lumo, Vision, Mando, AcuaCore Next, etc.).

**Architecture:** Multi-tenant RBAC with vertical-scoped roles, centralized identity, decentralized business domains. Users exist once in PitayaCore and carry context (tenant + vertical + role) across all products.

**Tech Stack:** NestJS, Prisma (MySQL), Passport JWT, bcrypt, AsyncLocalStorage

## Global Constraints

- MySQL is the identity database (Postgres remains vector-only)
- Prisma client: `@prisma/mysql-client` (custom output path)
- `User.email` remains globally unique during migration (Phase 1 constraint — no data loss)
- All new models use UUID primary keys with `@default(uuid())`
- All timestamps use `@default(now())` / `@updatedAt`
- Existing `User.role` enum is preserved until Phase 4 cutover
- Existing `User.permissions` JSON blob is preserved until Phase 4 cutover
- `CombinedAuthGuard` header bypass (`x-user-role: SYSTEM`) is preserved until security hardening phase
- No breaking changes to JWT payload structure until Phase 6
- All vertical business domains (Lumo profiles, Vision assets, etc.) remain in PitayaCore MySQL for now

---

## Phase 1: Analysis Report

### Current State Summary

**EXISTING entities (schema + code):**

| Model | Status | Notes |
|---|---|---|
| `Tenant` | ACTIVE | Core multi-tenancy, 17+ relations |
| `User` | ACTIVE | Globally unique email, flat role enum, JSON permissions |
| `User_role` enum | ACTIVE | OWNER, EXPERT, ADVISOR, DIRECTOR, ADMIN, OPERATOR, PRODUCER, SYSTEM |
| `Feature` | ACTIVE | Simple name-only model, used by FeatureFlagGuard |
| `TenantFeature` | ACTIVE | Per-tenant feature toggle, used by FeatureFlagGuard |
| `Vertical` | ACTIVE | Industry vertical registry (vision, aquaculture, etc.) |
| `TenantVertical` | ACTIVE | Many-to-many tenant-vertical join |
| `RolePermission` | DEAD CODE | Schema exists, never queried, never seeded |
| `AuditLog` | ACTIVE | Identity action trail |

**MISSING entities:**

| Entity | Priority | Purpose |
|---|---|---|
| `Role` | CRITICAL | Normalized role model (replace enum) |
| `Permission` | CRITICAL | Normalized permission model (replace JSON blob) |
| `UserRole` | CRITICAL | User-role-tenant assignment (multi-role support) |
| `RolePermission` (normalized) | CRITICAL | Role-permission join (existing model is flat strings) |
| `Organization` | HIGH | B2B hierarchy above Tenant |
| `Session` | HIGH | Session tracking, token revocation |
| `UserContext` | HIGH | User-tenant-vertical-role context switching |
| `VerticalRole` | HIGH | Role-vertical binding |
| `UserProfile` | MEDIUM | Avatar, phone, preferences, MFA |
| `Invitation` | MEDIUM | User onboarding flow |
| `ParentProfile` | MEDIUM | Lumo domain: parent profile |
| `TeacherProfile` | MEDIUM | Lumo domain: teacher profile |
| `ChildProfile` | MEDIUM | Lumo domain: child profile |

**INCOMPATIBLE entities:**

| Issue | Severity | Current | Target |
|---|---|---|---|
| `User.email` global unique | BREAKING | `@unique` (global) | `@@unique([tenantId, email])` (deferred — data audit needed) |
| `User.role` flat enum | BREAKING | `User_role` enum field | Relation to `Role` model via `UserRole[]` |
| `User.permissions` JSON blob | MODERATE | `Json?` unstructured | Normalized `RolePermission` tables |
| Password plaintext in `UsersService.create()` | CRITICAL | `data.password \|\| 'pitayacore123'` stored raw | Always `bcrypt.hash()` |
| `x-user-role: SYSTEM` header bypass | CRITICAL | Anyone can send header, get full access | Remove or require HMAC signature |

**Migration complexity:** HIGH — 3 breaking changes (email uniqueness, role enum, permissions JSON), 2 critical security fixes, ~15 new models.

---

## Phase 2: Identity Core Schema

### Task 1: Add `Organization` model

**Files:**
- Modify: `api/prisma/mysql.prisma`

**Interfaces:**
- Produces: `Organization` model available for Prisma queries

- [ ] **Step 1: Add Organization model to Prisma schema**

Add after the `Tenant` model (line 50):

```prisma
model Organization {
  id        String   @id @default(uuid())
  name      String
  slug      String?  @unique
  status    Status   @default(ACTIVE)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenants Tenant[]
}
```

- [ ] **Step 2: Add `organizationId` FK to Tenant model**

Add field to `Tenant` model (after `slug`):

```prisma
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id])
```

Add index at bottom of Tenant model:

```prisma
  @@index([organizationId])
```

- [ ] **Step 3: Generate Prisma client and verify**

Run: `cd api && npx prisma generate --schema=prisma/mysql.prisma`
Expected: Client generated successfully

- [ ] **Step 4: Push schema to local database**

Run: `cd api && npx prisma db push`
Expected: Schema pushed, Organization table created

- [ ] **Step 5: Commit**

```bash
git add api/prisma/mysql.prisma
git commit -m "feat(identity): add Organization model with Tenant FK"
```

---

### Task 2: Enhance `User` model with identity fields

**Files:**
- Modify: `api/prisma/mysql.prisma`

**Interfaces:**
- Produces: Enhanced `User` model with `avatarUrl`, `phone`, `lastLoginAt`, `emailVerified`

- [ ] **Step 1: Add identity fields to User model**

Add after `permissions` field (line 75):

```prisma
  avatarUrl     String?
  phone         String?
  lastLoginAt   DateTime?
  emailVerified Boolean  @default(false)
```

- [ ] **Step 2: Generate Prisma client**

Run: `cd api && npx prisma generate --schema=prisma/mysql.prisma`
Expected: Client generated successfully

- [ ] **Step 3: Push schema to local database**

Run: `cd api && npx prisma db push`
Expected: Schema pushed, new columns added to User table

- [ ] **Step 4: Commit**

```bash
git add api/prisma/mysql.prisma
git commit -m "feat(identity): add avatarUrl, phone, lastLoginAt, emailVerified to User"
```

---

### Task 3: Add `Session` model

**Files:**
- Modify: `api/prisma/mysql.prisma`

**Interfaces:**
- Produces: `Session` model for token tracking and revocation

- [ ] **Step 1: Add Session model to Prisma schema**

Add after the `User` model block:

```prisma
model Session {
  id           String    @id @default(uuid())
  userId       String
  token        String    @unique
  ipAddress    String?
  userAgent    String?
  expiresAt    DateTime
  revokedAt    DateTime?
  createdAt    DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
}
```

- [ ] **Step 2: Add sessions relation to User model**

Add inside User model (after `tenant` relation):

```prisma
  sessions Session[]
```

- [ ] **Step 3: Generate Prisma client and push schema**

Run: `cd api && npx prisma generate --schema=prisma/mysql.prisma && npx prisma db push`
Expected: Session table created

- [ ] **Step 4: Commit**

```bash
git add api/prisma/mysql.prisma
git commit -m "feat(identity): add Session model for token lifecycle management"
```

---

## Phase 3: RBAC Schema

### Task 4: Create `Role` model

**Files:**
- Modify: `api/prisma/mysql.prisma`

**Interfaces:**
- Produces: `Role` model with vertical scoping

- [ ] **Step 1: Add Role model to Prisma schema**

Replace the existing `RolePermission` model (lines 942-952) with the full RBAC block:

```prisma
// RBAC SYSTEM
model Role {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  description String?  @db.Text
  isSystem    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  permissions RolePermission[]
  userRoles   UserRole[]
  verticalRoles VerticalRole[]
}
```

- [ ] **Step 2: Generate and push**

Run: `cd api && npx prisma generate --schema=prisma/mysql.prisma && npx prisma db push`
Expected: Role table created

- [ ] **Step 3: Commit**

```bash
git add api/prisma/mysql.prisma
git commit -m "feat(identity): add Role model with system/tenant scoping"
```

---

### Task 5: Create `Permission` model

**Files:**
- Modify: `api/prisma/mysql.prisma`

**Interfaces:**
- Produces: `Permission` model for normalized permission storage

- [ ] **Step 1: Add Permission model**

Add after `Role` model:

```prisma
model Permission {
  id          String   @id @default(uuid())
  key         String   @unique  // e.g., "agents:create", "conversations:read"
  resource    String           // e.g., "agents", "conversations"
  action      String           // e.g., "create", "read", "update", "delete"
  description String?  @db.Text
  createdAt   DateTime @default(now())

  rolePermissions RolePermission[]
}
```

- [ ] **Step 2: Replace RolePermission model**

Replace the existing `RolePermission` model with:

```prisma
model RolePermission {
  id           String   @id @default(uuid())
  roleId       String
  permissionId String
  createdAt    DateTime @default(now())

  role       Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([roleId, permissionId])
  @@index([roleId])
  @@index([permissionId])
}
```

- [ ] **Step 3: Generate and push**

Run: `cd api && npx prisma generate --schema=prisma/mysql.prisma && npx prisma db push`
Expected: Permission and normalized RolePermission tables created

- [ ] **Step 4: Commit**

```bash
git add api/prisma/mysql.prisma
git commit -m "feat(identity): add Permission model and normalize RolePermission join table"
```

---

### Task 6: Create `UserRole` model

**Files:**
- Modify: `api/prisma/mysql.prisma`

**Interfaces:**
- Produces: `UserRole` for multi-role user assignments per tenant

- [ ] **Step 1: Add UserRole model**

Add after `RolePermission`:

```prisma
model UserRole {
  id         String   @id @default(uuid())
  userId     String
  roleId     String
  tenantId   String
  assignedAt DateTime @default(now())
  assignedBy String?

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  role   Role   @relation(fields: [roleId], references: [id], onDelete: Cascade)
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([userId, roleId, tenantId])
  @@index([userId])
  @@index([roleId])
  @@index([tenantId])
}
```

- [ ] **Step 2: Add relations to existing models**

Add to `User` model:

```prisma
  userRoles UserRole[]
```

Add to `Tenant` model:

```prisma
  userRoles UserRole[]
```

- [ ] **Step 3: Generate and push**

Run: `cd api && npx prisma generate --schema=prisma/mysql.prisma && npx prisma db push`
Expected: UserRole join table created

- [ ] **Step 4: Commit**

```bash
git add api/prisma/mysql.prisma
git commit -m "feat(identity): add UserRole for multi-role user-tenant assignments"
```

---

### Task 7: Create `VerticalRole` model

**Files:**
- Modify: `api/prisma/mysql.prisma`

**Interfaces:**
- Produces: `VerticalRole` for binding roles to verticals

- [ ] **Step 1: Add VerticalRole model**

```prisma
model VerticalRole {
  id         String   @id @default(uuid())
  verticalId String
  roleId     String
  createdAt  DateTime @default(now())

  vertical Vertical @relation(fields: [verticalId], references: [id], onDelete: Cascade)
  role     Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([verticalId, roleId])
  @@index([verticalId])
  @@index([roleId])
}
```

- [ ] **Step 2: Generate and push**

Run: `cd api && npx prisma generate --schema=prisma/mysql.prisma && npx prisma db push`
Expected: VerticalRole table created

- [ ] **Step 3: Commit**

```bash
git add api/prisma/mysql.prisma
git commit -m "feat(identity): add VerticalRole for vertical-scoped role bindings"
```

---

## Phase 4: User Context & Feature Flags Schema

### Task 8: Create `UserContext` model

**Files:**
- Modify: `api/prisma/mysql.prisma`

**Interfaces:**
- Produces: `UserContext` for multi-tenant, multi-vertical, multi-role user context switching

- [ ] **Step 1: Add UserContext model**

```prisma
model UserContext {
  id         String   @id @default(uuid())
  userId     String
  tenantId   String
  verticalId String?
  roleId     String
  isDefault  Boolean  @default(false)
  createdAt  DateTime @default(now())

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant   Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  vertical Vertical? @relation(fields: [verticalId], references: [id])
  role     Role      @relation(fields: [roleId], references: [id])

  @@unique([userId, tenantId, verticalId, roleId])
  @@index([userId])
  @@index([tenantId])
  @@index([verticalId])
  @@index([roleId])
}
```

- [ ] **Step 2: Add relation to User model**

Add to `User` model:

```prisma
  userContexts UserContext[]
```

- [ ] **Step 3: Generate and push**

Run: `cd api && npx prisma generate --schema=prisma/mysql.prisma && npx prisma db push`
Expected: UserContext table created

- [ ] **Step 4: Commit**

```bash
git add api/prisma/mysql.prisma
git commit -m "feat(identity): add UserContext for multi-tenant-vertical-role context switching"
```

---

### Task 9: Enhance `Feature` model

**Files:**
- Modify: `api/prisma/mysql.prisma`

**Interfaces:**
- Produces: Enhanced `Feature` with `slug`, `description`, `status`

- [ ] **Step 1: Add fields to Feature model**

Replace existing `Feature` model (lines 313-318):

```prisma
model Feature {
  id             String          @id @default(uuid())
  name           String          @unique
  slug           String          @unique
  description    String?         @db.Text
  status         String          @default("ACTIVE")
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  tenantFeatures TenantFeature[]
}
```

- [ ] **Step 2: Generate and push**

Run: `cd api && npx prisma generate --schema=prisma/mysql.prisma && npx prisma db push`
Expected: Feature table updated with new columns

- [ ] **Step 3: Commit**

```bash
git add api/prisma/mysql.prisma
git commit -m "feat(identity): enhance Feature model with slug, description, status"
```

---

## Phase 5: Lumo Domain Model

### Task 10: Create Lumo profile models

**Files:**
- Modify: `api/prisma/mysql.prisma`

**Interfaces:**
- Produces: `ParentProfile`, `TeacherProfile`, `ChildProfile`, `School`, `Classroom`

- [ ] **Step 1: Add Lumo domain models**

```prisma
// LUMO DOMAIN PROFILES
model ParentProfile {
  id          String   @id @default(uuid())
  userId      String   @unique
  tenantId    String
  phone       String?
  preferences Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
}

model TeacherProfile {
  id             String   @id @default(uuid())
  userId         String   @unique
  tenantId       String
  employeeCode   String?
  specialization String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  classrooms Classroom[]

  @@index([tenantId])
}

model ChildProfile {
  id             String   @id @default(uuid())
  userId         String   @unique
  tenantId       String
  birthDate      DateTime?
  grade          String?
  learningProfile Json?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
}

model School {
  id        String   @id @default(uuid())
  tenantId  String
  name      String
  address   String?
  status    Status   @default(ACTIVE)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant     Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  classrooms Classroom[]

  @@index([tenantId])
}

model Classroom {
  id         String   @id @default(uuid())
  tenantId   String
  schoolId   String?
  teacherId  String?
  name       String
  grade      String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  tenant   Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  school   School?         @relation(fields: [schoolId], references: [id])
  teacher  TeacherProfile? @relation(fields: [teacherId], references: [id])

  @@index([tenantId])
  @@index([schoolId])
  @@index([teacherId])
}
```

- [ ] **Step 2: Generate and push**

Run: `cd api && npx prisma generate --schema=prisma/mysql.prisma && npx prisma db push`
Expected: All Lumo domain tables created

- [ ] **Step 3: Commit**

```bash
git add api/prisma/mysql.prisma
git commit -m "feat(identity): add Lumo domain profiles (Parent, Teacher, Child, School, Classroom)"
```

---

## Phase 6: Seed Data

### Task 11: Seed RBAC foundation data

**Files:**
- Create: `api/seed-identity.ts`

**Interfaces:**
- Produces: Roles, Permissions, VerticalRoles, and Feature flags seeded in database

- [ ] **Step 1: Create seed script**

```typescript
import { PrismaClient } from '@prisma/mysql-client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Identity Platform...');

  // 1. PERMISSIONS
  const permissions = [
    // User management
    { key: 'users:create', resource: 'users', action: 'create', description: 'Create users' },
    { key: 'users:read', resource: 'users', action: 'read', description: 'View users' },
    { key: 'users:update', resource: 'users', action: 'update', description: 'Update users' },
    { key: 'users:delete', resource: 'users', action: 'delete', description: 'Delete users' },
    // Tenant management
    { key: 'tenants:create', resource: 'tenants', action: 'create', description: 'Create tenants' },
    { key: 'tenants:read', resource: 'tenants', action: 'read', description: 'View tenants' },
    { key: 'tenants:update', resource: 'tenants', action: 'update', description: 'Update tenants' },
    { key: 'tenants:delete', resource: 'tenants', action: 'delete', description: 'Delete tenants' },
    // Agents
    { key: 'agents:create', resource: 'agents', action: 'create', description: 'Create agents' },
    { key: 'agents:read', resource: 'agents', action: 'read', description: 'View agents' },
    { key: 'agents:update', resource: 'agents', action: 'update', description: 'Update agents' },
    { key: 'agents:delete', resource: 'agents', action: 'delete', description: 'Delete agents' },
    // Skills
    { key: 'skills:create', resource: 'skills', action: 'create', description: 'Create skills' },
    { key: 'skills:read', resource: 'skills', action: 'read', description: 'View skills' },
    { key: 'skills:update', resource: 'skills', action: 'update', description: 'Update skills' },
    { key: 'skills:delete', resource: 'skills', action: 'delete', description: 'Delete skills' },
    // Knowledge Base
    { key: 'kb:create', resource: 'kb', action: 'create', description: 'Create knowledge entries' },
    { key: 'kb:read', resource: 'kb', action: 'read', description: 'View knowledge entries' },
    { key: 'kb:update', resource: 'kb', action: 'update', description: 'Update knowledge entries' },
    { key: 'kb:delete', resource: 'kb', action: 'delete', description: 'Delete knowledge entries' },
    // Conversations
    { key: 'conversations:create', resource: 'conversations', action: 'create', description: 'Create conversations' },
    { key: 'conversations:read', resource: 'conversations', action: 'read', description: 'View conversations' },
    { key: 'conversations:update', resource: 'conversations', action: 'update', description: 'Update conversations' },
    { key: 'conversations:delete', resource: 'conversations', action: 'delete', description: 'Delete conversations' },
    // Capsules
    { key: 'capsules:create', resource: 'capsules', action: 'create', description: 'Create capsules' },
    { key: 'capsules:read', resource: 'capsules', action: 'read', description: 'View capsules' },
    { key: 'capsules:update', resource: 'capsules', action: 'update', description: 'Update capsules' },
    { key: 'capsules:delete', resource: 'capsules', action: 'delete', description: 'Delete capsules' },
    // Vision
    { key: 'vision:characters:create', resource: 'vision:characters', action: 'create', description: 'Create characters' },
    { key: 'vision:characters:read', resource: 'vision:characters', action: 'read', description: 'View characters' },
    { key: 'vision:brands:create', resource: 'vision:brands', action: 'create', description: 'Create brands' },
    { key: 'vision:brands:read', resource: 'vision:brands', action: 'read', description: 'View brands' },
    { key: 'vision:campaigns:create', resource: 'vision:campaigns', action: 'create', description: 'Create vision campaigns' },
    { key: 'vision:campaigns:read', resource: 'vision:campaigns', action: 'read', description: 'View vision campaigns' },
    // Lumo
    { key: 'lumo:schools:manage', resource: 'lumo:schools', action: 'manage', description: 'Manage schools' },
    { key: 'lumo:classrooms:manage', resource: 'lumo:classrooms', action: 'manage', description: 'Manage classrooms' },
    { key: 'lumo:students:manage', resource: 'lumo:students', action: 'manage', description: 'Manage students' },
    { key: 'lumo:lessons:manage', resource: 'lumo:lessons', action: 'manage', description: 'Manage lessons' },
    { key: 'lumo:evaluations:manage', resource: 'lumo:evaluations', action: 'manage', description: 'Manage evaluations' },
    // Mando
    { key: 'mando:campaigns:manage', resource: 'mando:campaigns', action: 'manage', description: 'Manage Mando campaigns' },
    { key: 'mando:analytics:read', resource: 'mando:analytics', action: 'read', description: 'View Mando analytics' },
    // Aquaculture
    { key: 'aqua:farms:manage', resource: 'aqua:farms', action: 'manage', description: 'Manage farms' },
    { key: 'aqua:ponds:manage', resource: 'aqua:ponds', action: 'manage', description: 'Manage ponds' },
    { key: 'aqua:cycles:manage', resource: 'aqua:cycles', action: 'manage', description: 'Manage cycles' },
    // System
    { key: 'system:settings:manage', resource: 'system:settings', action: 'manage', description: 'Manage system settings' },
    { key: 'system:logs:read', resource: 'system:logs', action: 'read', description: 'View system logs' },
    { key: 'system:infra:manage', resource: 'system:infra', action: 'manage', description: 'Manage infrastructure' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: {},
      create: perm,
    });
  }
  console.log(`Seeded ${permissions.length} permissions`);

  // 2. ROLES
  const roles = [
    // System roles
    { name: 'System Admin', slug: 'system_admin', description: 'Full platform access', isSystem: true },
    { name: 'Platform Admin', slug: 'platform_admin', description: 'Cross-tenant administration', isSystem: true },
    // Tenant roles
    { name: 'Owner', slug: 'owner', description: 'Tenant owner with full access', isSystem: true },
    { name: 'Admin', slug: 'admin', description: 'Tenant administrator', isSystem: true },
    { name: 'Member', slug: 'member', description: 'Standard tenant member', isSystem: true },
    { name: 'Viewer', slug: 'viewer', description: 'Read-only access', isSystem: true },
    // Vision roles
    { name: 'Creative Director', slug: 'creative_director', description: 'Vision: leads creative strategy' },
    { name: 'Brand Manager', slug: 'brand_manager', description: 'Vision: manages brand assets' },
    { name: 'Campaign Manager', slug: 'campaign_manager', description: 'Vision: manages campaigns' },
    // Lumo roles
    { name: 'School Admin', slug: 'school_admin', description: 'Lumo: manages school' },
    { name: 'Teacher', slug: 'teacher', description: 'Lumo: teaches classes' },
    { name: 'Parent', slug: 'parent', description: 'Lumo: parent of student' },
    { name: 'Student', slug: 'student', description: 'Lumo: student' },
    // Mando roles
    { name: 'Operator', slug: 'operator', description: 'Mando: operates campaigns' },
    { name: 'Analyst', slug: 'analyst', description: 'Mando: analyzes data' },
    // Aquaculture roles
    { name: 'Farm Manager', slug: 'farm_manager', description: 'Aquaculture: manages farm' },
    { name: 'Technician', slug: 'technician', description: 'Aquaculture: field technician' },
    { name: 'Supervisor', slug: 'supervisor', description: 'Aquaculture: supervises operations' },
  ];

  const roleMap: Record<string, string> = {};
  for (const role of roles) {
    const created = await prisma.role.upsert({
      where: { slug: role.slug },
      update: {},
      create: role,
    });
    roleMap[role.slug] = created.id;
  }
  console.log(`Seeded ${roles.length} roles`);

  // 3. ROLE-PERMISSION ASSIGNMENTS
  const rolePermAssignments: Record<string, string[]> = {
    system_admin: permissions.map(p => p.key), // All permissions
    platform_admin: [
      'users:create', 'users:read', 'users:update',
      'tenants:create', 'tenants:read', 'tenants:update',
      'system:settings:manage', 'system:logs:read',
    ],
    owner: [
      'users:create', 'users:read', 'users:update', 'users:delete',
      'tenants:read', 'tenants:update',
      'agents:create', 'agents:read', 'agents:update', 'agents:delete',
      'skills:create', 'skills:read', 'skills:update', 'skills:delete',
      'kb:create', 'kb:read', 'kb:update', 'kb:delete',
      'conversations:create', 'conversations:read', 'conversations:update', 'conversations:delete',
      'capsules:create', 'capsules:read', 'capsules:update', 'capsules:delete',
    ],
    admin: [
      'users:create', 'users:read', 'users:update',
      'agents:read', 'agents:create', 'agents:update',
      'skills:read', 'skills:create', 'skills:update',
      'kb:read', 'kb:create', 'kb:update',
      'conversations:read', 'conversations:create', 'conversations:update',
      'capsules:read', 'capsules:create', 'capsules:update',
    ],
    member: [
      'users:read',
      'agents:read', 'skills:read', 'kb:read',
      'conversations:read', 'conversations:create', 'conversations:update',
      'capsules:read',
    ],
    viewer: [
      'users:read', 'agents:read', 'skills:read', 'kb:read',
      'conversations:read', 'capsules:read',
    ],
    creative_director: [
      'vision:characters:create', 'vision:characters:read',
      'vision:brands:create', 'vision:brands:read',
      'vision:campaigns:create', 'vision:campaigns:read',
    ],
    brand_manager: [
      'vision:brands:create', 'vision:brands:read',
      'vision:characters:read',
    ],
    campaign_manager: [
      'vision:campaigns:create', 'vision:campaigns:read',
      'vision:characters:read',
    ],
    school_admin: [
      'lumo:schools:manage', 'lumo:classrooms:manage',
      'lumo:students:manage', 'lumo:lessons:manage', 'lumo:evaluations:manage',
      'users:create', 'users:read', 'users:update',
    ],
    teacher: [
      'lumo:classrooms:manage', 'lumo:lessons:manage', 'lumo:evaluations:manage',
      'lumo:students:manage',
    ],
    parent: [
      'lumo:evaluations:manage',
    ],
    student: [],
    operator: [
      'mando:campaigns:manage', 'mando:analytics:read',
    ],
    analyst: [
      'mando:analytics:read',
    ],
    farm_manager: [
      'aqua:farms:manage', 'aqua:ponds:manage', 'aqua:cycles:manage',
    ],
    technician: [
      'aqua:ponds:manage', 'aqua:cycles:manage',
    ],
    supervisor: [
      'aqua:farms:manage', 'aqua:ponds:manage',
    ],
  };

  let rpCount = 0;
  for (const [roleSlug, permKeys] of Object.entries(rolePermAssignments)) {
    const roleId = roleMap[roleSlug];
    if (!roleId) continue;
    for (const permKey of permKeys) {
      const perm = await prisma.permission.findUnique({ where: { key: permKey } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId: perm.id } },
        update: {},
        create: { roleId, permissionId: perm.id },
      });
      rpCount++;
    }
  }
  console.log(`Seeded ${rpCount} role-permission assignments`);

  // 4. VERTICAL-ROLE ASSIGNMENTS
  const verticalRoleAssignments: Record<string, string[]> = {
    vision: ['creative_director', 'brand_manager', 'campaign_manager'],
    lumo: ['school_admin', 'teacher', 'parent', 'student'],
    mando: ['campaign_manager', 'operator', 'analyst'],
    aquaculture: ['farm_manager', 'technician', 'supervisor'],
  };

  let vrCount = 0;
  for (const [verticalSlug, roleSlugs] of Object.entries(verticalRoleAssignments)) {
    const vertical = await prisma.vertical.findUnique({ where: { slug: verticalSlug } });
    if (!vertical) continue;
    for (const roleSlug of roleSlugs) {
      const roleId = roleMap[roleSlug];
      if (!roleId) continue;
      await prisma.verticalRole.upsert({
        where: { verticalId_roleId: { verticalId: vertical.id, roleId } },
        update: {},
        create: { verticalId: vertical.id, roleId },
      });
      vrCount++;
    }
  }
  console.log(`Seeded ${vrCount} vertical-role assignments`);

  // 5. ENHANCED FEATURES
  const features = [
    { name: 'Character Studio', slug: 'CHARACTER_STUDIO', description: 'Vision: character creation and management' },
    { name: 'Brand Studio', slug: 'BRAND_STUDIO', description: 'Vision: brand asset management' },
    { name: 'Campaigns', slug: 'CAMPAIGNS', description: 'Vision: campaign management' },
    { name: 'Lumo Parent App', slug: 'LUMO_PARENT_APP', description: 'Lumo: parent mobile app' },
    { name: 'Lumo Teacher App', slug: 'LUMO_TEACHER_APP', description: 'Lumo: teacher dashboard' },
    { name: 'Lumo Child App', slug: 'LUMO_CHILD_APP', description: 'Lumo: student learning app' },
    { name: 'Lumo Analytics', slug: 'LUMO_ANALYTICS', description: 'Lumo: analytics dashboard' },
    { name: 'Agents', slug: 'AGENTS', description: 'AI agent management' },
    { name: 'Workflows', slug: 'WORKFLOWS', description: 'Workflow automation' },
    { name: 'Knowledge', slug: 'KNOWLEDGE', description: 'Knowledge base management' },
    { name: 'Memory', slug: 'MEMORY', description: 'AI memory and context' },
    { name: 'Ecommerce', slug: 'ECOMMERCE', description: 'E-commerce module' },
    { name: 'CRM', slug: 'CRM', description: 'Customer relationship management' },
    { name: 'Capsules', slug: 'CAPSULES', description: 'Capsule studio' },
  ];

  for (const feat of features) {
    await prisma.feature.upsert({
      where: { name: feat.name },
      update: { slug: feat.slug, description: feat.description },
      create: feat,
    });
  }
  console.log(`Seeded ${features.length} features`);

  // 6. MIGRATE EXISTING USERS TO UserRole TABLE
  const existingUsers = await prisma.user.findMany();
  let migratedUsers = 0;

  for (const user of existingUsers) {
    // Find or create matching role
    const roleSlug = user.role.toLowerCase();
    const roleId = roleMap[roleSlug] || roleMap['member'];

    if (roleId) {
      await prisma.userRole.upsert({
        where: { userId_roleId_tenantId: { userId: user.id, roleId, tenantId: user.tenantId } },
        update: {},
        create: {
          userId: user.id,
          roleId,
          tenantId: user.tenantId,
        },
      });
      migratedUsers++;
    }
  }
  console.log(`Migrated ${migratedUsers} users to UserRole table`);

  console.log('Identity Platform seeding complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run seed script**

Run: `cd api && npx ts-node seed-identity.ts`
Expected: All permissions, roles, vertical-roles, features seeded, existing users migrated to UserRole

- [ ] **Step 3: Commit**

```bash
git add api/seed-identity.ts
git commit -m "feat(identity): add RBAC seed script with permissions, roles, vertical-roles, features"
```

---

## Phase 7: Auth Service Refactor

### Task 12: Refactor `AuthService.login()` to use RBAC tables

**Files:**
- Modify: `api/src/modules/auth/auth.service.ts`

**Interfaces:**
- Consumes: `UserRole`, `Role`, `RolePermission`, `Permission` models
- Produces: JWT payload with `roles[]` array, permissions fetched from DB

- [ ] **Step 1: Refactor login method**

Replace `api/src/modules/auth/auth.service.ts` with:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../../common/database/database.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private db: DatabaseService,
  ) {}

  async login(email: string, password?: string, tenantId?: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.db.mysql.user.findFirst({
      where: { email: { equals: normalizedEmail } },
      include: {
        tenant: true,
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (password) {
      if (!user.password) {
        throw new UnauthorizedException('El usuario no tiene una contraseña configurada');
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new UnauthorizedException('Contraseña incorrecta');
      }
    }

    // Update lastLoginAt
    await this.db.mysql.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Build roles and permissions from RBAC tables
    const roles = user.userRoles.map(ur => ({
      id: ur.role.id,
      slug: ur.role.slug,
      name: ur.role.name,
      tenantId: ur.tenantId,
    }));

    const permissionKeys = new Set<string>();
    for (const ur of user.userRoles) {
      for (const rp of ur.role.permissions) {
        permissionKeys.add(rp.permission.key);
      }
    }

    // Fallback to legacy permissions if no RBAC data
    const legacyPermissions = user.permissions as any;
    const permissions = permissionKeys.size > 0
      ? { actions: Array.from(permissionKeys), menus: legacyPermissions?.menus || [] }
      : legacyPermissions || { menus: ['dashboard', 'conversations', 'settings'], actions: ['read'] };

    const payload = {
      sub: user.id,
      email: user.email,
      roles: roles.map(r => r.slug),
      tenantId: user.tenantId,
    };

    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles,
        tenantId: user.tenantId,
        tenantName: user.tenant?.name,
        permissions,
      },
    };
  }

  async getUserContexts(userId: string) {
    const contexts = await this.db.mysql.userContext.findMany({
      where: { userId },
      include: {
        tenant: { select: { id: true, name: true } },
        vertical: { select: { id: true, name: true, slug: true } },
        role: { select: { id: true, name: true, slug: true } },
      },
    });

    return contexts;
  }

  async switchContext(userId: string, contextId: string) {
    const context = await this.db.mysql.userContext.findFirst({
      where: { id: contextId, userId },
      include: {
        tenant: true,
        vertical: true,
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!context) {
      throw new UnauthorizedException('Context not found');
    }

    const permissionKeys = context.role.permissions.map(rp => rp.permission.key);

    const payload = {
      sub: userId,
      roles: [context.role.slug],
      tenantId: context.tenantId,
      verticalId: context.verticalId,
      contextId: context.id,
    };

    return {
      token: this.jwtService.sign(payload),
      context: {
        id: context.id,
        tenant: context.tenant,
        vertical: context.vertical,
        role: context.role,
        permissions: { actions: permissionKeys },
      },
    };
  }

  async validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (e) {
      return null;
    }
  }
}
```

- [ ] **Step 2: Update auth controller to accept tenantId**

Read `api/src/modules/auth/auth.controller.ts` and update the login endpoint to pass optional `tenantId`.

- [ ] **Step 3: Run lint**

Run: `cd api && npm run lint`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add api/src/modules/auth/auth.service.ts api/src/modules/auth/auth.controller.ts
git commit -m "feat(identity): refactor AuthService to use RBAC tables with context switching"
```

---

### Task 13: Update `UsersService.create()` to hash passwords

**Files:**
- Modify: `api/src/modules/users/users.service.ts`

**Interfaces:**
- Consumes: `bcrypt` for password hashing
- Produces: Users created with properly hashed passwords

- [ ] **Step 1: Add bcrypt import and hash password in create method**

In `api/src/modules/users/users.service.ts`, add import at top:

```typescript
import * as bcrypt from 'bcrypt';
```

Replace the `create` method (lines 38-70):

```typescript
  async create(requesterRole: string, requesterTenantId: string, data: any) {
    const tenantId =
      requesterRole.toUpperCase() === 'SYSTEM'
        ? data.tenantId
        : requesterTenantId;

    if (!tenantId) {
      throw new ForbiddenException('Tenant ID es requerido.');
    }

    if (data.email) {
      data.email = data.email.trim().toLowerCase();
    }

    const plainPassword = data.password || 'pitayacore123';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const result = await this.db.mysql.user.create({
      data: {
        ...data,
        tenantId,
        password: hashedPassword,
      },
    });

    await this.db.logAction({
      tenantId,
      userId: data.email,
      action: 'CREATE',
      entity: 'USER',
      entityId: result.id,
      changes: { name: result.name, role: result.role },
    });

    return result;
  }
```

- [ ] **Step 2: Hash password in update method too**

Replace the password handling in `update` method (around line 90-97):

```typescript
    const updateData = { ...data };
    if (updateData.email) {
      updateData.email = updateData.email.trim().toLowerCase();
    }
    if (updateData.password && updateData.password !== '') {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    } else {
      delete updateData.password;
    }
```

- [ ] **Step 3: Run lint**

Run: `cd api && npm run lint`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add api/src/modules/users/users.service.ts
git commit -m "fix(security): hash passwords with bcrypt in UsersService.create() and update()"
```

---

## Phase 8: Authorization Guard

### Task 14: Create `RbacGuard` for permission-based authorization

**Files:**
- Create: `api/src/common/guards/rbac.guard.ts`
- Create: `api/src/common/decorators/require-permissions.decorator.ts`

**Interfaces:**
- Consumes: `UserRole`, `RolePermission` from request user object
- Produces: `@RequirePermissions('agents:create')` decorator

- [ ] **Step 1: Create permissions decorator**

Create `api/src/common/decorators/require-permissions.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSIONS_KEY = 'requirePermissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, permissions);
```

- [ ] **Step 2: Create RBAC guard**

Create `api/src/common/guards/rbac.guard.ts`:

```typescript
import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private db: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.sub) {
      throw new ForbiddenException('No authenticated user');
    }

    // SYSTEM role bypasses all permission checks
    if (user.roles?.includes('system_admin') || user.role === 'SYSTEM') {
      return true;
    }

    // Check permissions from JWT (set at login time)
    const userPermissions: string[] = user.permissions?.actions || [];

    // Check if user has any of the required permissions
    const hasPermission = requiredPermissions.some(p => userPermissions.includes(p));

    if (!hasPermission) {
      // Fallback: query DB for fresh permissions
      const dbPermissions = await this.db.mysql.rolePermission.findMany({
        where: {
          role: {
            userRoles: {
              some: { userId: user.sub },
            },
          },
        },
        include: { permission: true },
      });

      const freshPermissions = dbPermissions.map(rp => rp.permission.key);
      const hasFreshPermission = requiredPermissions.some(p => freshPermissions.includes(p));

      if (!hasFreshPermission) {
        throw new ForbiddenException(
          `Missing permissions: ${requiredPermissions.join(', ')}`,
        );
      }
    }

    return true;
  }
}
```

- [ ] **Step 3: Register RbacGuard as global guard**

In `api/src/app.module.ts`, add to providers:

```typescript
import { RbacGuard } from './common/guards/rbac.guard';

// In providers array:
{
  provide: APP_GUARD,
  useClass: RbacGuard,
},
```

Place it AFTER the `CombinedAuthGuard` entry (order matters — auth first, then RBAC).

- [ ] **Step 4: Run lint**

Run: `cd api && npm run lint`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add api/src/common/guards/rbac.guard.ts api/src/common/decorators/require-permissions.decorator.ts api/src/app.module.ts
git commit -m "feat(identity): add RbacGuard with @RequirePermissions decorator"
```

---

## Phase 9: Identity API Endpoints

### Task 15: Create Organizations CRUD module

**Files:**
- Create: `api/src/modules/organizations/organizations.module.ts`
- Create: `api/src/modules/organizations/organizations.service.ts`
- Create: `api/src/modules/organizations/organizations.controller.ts`

- [ ] **Step 1: Create organizations service**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class OrganizationsService {
  constructor(private db: DatabaseService) {}

  findAll() {
    return this.db.mysql.organization.findMany({
      include: { tenants: { select: { id: true, name: true } } },
    });
  }

  async findOne(id: string) {
    const org = await this.db.mysql.organization.findUnique({
      where: { id },
      include: { tenants: true },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  create(data: { name: string; slug?: string }) {
    return this.db.mysql.organization.create({ data });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.db.mysql.organization.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.db.mysql.organization.delete({ where: { id } });
  }
}
```

- [ ] **Step 2: Create organizations controller**

```typescript
import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}

  @Get()
  @RequirePermissions('tenants:read')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermissions('tenants:read')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions('tenants:create')
  create(@Body() body: { name: string; slug?: string }) {
    return this.service.create(body);
  }

  @Put(':id')
  @RequirePermissions('tenants:update')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @RequirePermissions('tenants:delete')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
```

- [ ] **Step 3: Create module and register in AppModule**

```typescript
import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
```

Add to `app.module.ts` imports: `OrganizationsModule`

- [ ] **Step 4: Run lint**

Run: `cd api && npm run lint`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add api/src/modules/organizations/
git commit -m "feat(identity): add Organizations CRUD module"
```

---

### Task 16: Create User Contexts API

**Files:**
- Create: `api/src/modules/user-contexts/user-contexts.module.ts`
- Create: `api/src/modules/user-contexts/user-contexts.service.ts`
- Create: `api/src/modules/user-contexts/user-contexts.controller.ts`

- [ ] **Step 1: Create user-contexts service**

```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class UserContextsService {
  constructor(private db: DatabaseService) {}

  findByUser(userId: string) {
    return this.db.mysql.userContext.findMany({
      where: { userId },
      include: {
        tenant: { select: { id: true, name: true } },
        vertical: { select: { id: true, name: true, slug: true } },
        role: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async create(data: {
    userId: string;
    tenantId: string;
    verticalId?: string;
    roleId: string;
    isDefault?: boolean;
  }) {
    // Verify role exists
    const role = await this.db.mysql.role.findUnique({ where: { id: data.roleId } });
    if (!role) throw new NotFoundException('Role not found');

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await this.db.mysql.userContext.updateMany({
        where: { userId: data.userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.db.mysql.userContext.create({ data });
  }

  async delete(id: string, userId: string) {
    const context = await this.db.mysql.userContext.findFirst({
      where: { id, userId },
    });
    if (!context) throw new NotFoundException('Context not found');
    return this.db.mysql.userContext.delete({ where: { id } });
  }

  async setDefault(id: string, userId: string) {
    const context = await this.db.mysql.userContext.findFirst({
      where: { id, userId },
    });
    if (!context) throw new NotFoundException('Context not found');

    await this.db.mysql.userContext.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    return this.db.mysql.userContext.update({
      where: { id },
      data: { isDefault: true },
    });
  }
}
```

- [ ] **Step 2: Create controller**

```typescript
import { Controller, Get, Post, Delete, Param, Body, Req } from '@nestjs/common';
import { UserContextsService } from './user-contexts.service';

@Controller('user-contexts')
export class UserContextsController {
  constructor(private readonly service: UserContextsService) {}

  @Get()
  findMine(@Req() req: any) {
    return this.service.findByUser(req.user.sub);
  }

  @Get(':userId')
  findByUser(@Param('userId') userId: string) {
    return this.service.findByUser(userId);
  }

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.service.delete(id, req.user.sub);
  }

  @Post(':id/default')
  setDefault(@Param('id') id: string, @Req() req: any) {
    return this.service.setDefault(id, req.user.sub);
  }
}
```

- [ ] **Step 3: Create module and register**

```typescript
import { Module } from '@nestjs/common';
import { UserContextsService } from './user-contexts.service';
import { UserContextsController } from './user-contexts.controller';

@Module({
  controllers: [UserContextsController],
  providers: [UserContextsService],
  exports: [UserContextsService],
})
export class UserContextsModule {}
```

Add to `app.module.ts` imports: `UserContextsModule`

- [ ] **Step 4: Run lint**

Run: `cd api && npm run lint`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add api/src/modules/user-contexts/
git commit -m "feat(identity): add User Contexts API for multi-tenant-vertical-role switching"
```

---

### Task 17: Create Roles & Permissions API

**Files:**
- Create: `api/src/modules/roles/roles.module.ts`
- Create: `api/src/modules/roles/roles.service.ts`
- Create: `api/src/modules/roles/roles.controller.ts`

- [ ] **Step 1: Create roles service**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class RolesService {
  constructor(private db: DatabaseService) {}

  findAll() {
    return this.db.mysql.role.findMany({
      include: {
        permissions: { include: { permission: true } },
        verticalRoles: { include: { vertical: true } },
      },
    });
  }

  async findOne(id: string) {
    const role = await this.db.mysql.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
        verticalRoles: { include: { vertical: true } },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  create(data: { name: string; slug: string; description?: string; isSystem?: boolean }) {
    return this.db.mysql.role.create({ data });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.db.mysql.role.update({ where: { id }, data });
  }

  async delete(id: string) {
    const role = await this.findOne(id);
    if (role.isSystem) throw new Error('Cannot delete system role');
    return this.db.mysql.role.delete({ where: { id } });
  }

  async setPermissions(roleId: string, permissionIds: string[]) {
    await this.findOne(roleId);

    // Remove existing
    await this.db.mysql.rolePermission.deleteMany({ where: { roleId } });

    // Add new
    const data = permissionIds.map(permissionId => ({ roleId, permissionId }));
    await this.db.mysql.rolePermission.createMany({ data });

    return this.findOne(roleId);
  }

  async getAllPermissions() {
    return this.db.mysql.permission.findMany();
  }
}
```

- [ ] **Step 2: Create controller and module, register in AppModule**

- [ ] **Step 3: Run lint**

Run: `cd api && npm run lint`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add api/src/modules/roles/
git commit -m "feat(identity): add Roles & Permissions CRUD API"
```

---

## Phase 10: Security Hardening

### Task 18: Remove `x-user-role` header bypass (optional — deferred)

**Files:**
- Modify: `api/src/common/guards/combined-auth.guard.ts`

**Note:** This is a BREAKING CHANGE for the web frontend. Defer until frontend is updated to use proper JWT.

- [ ] **Step 1: Remove header bypass block**

Remove lines 46-62 from `combined-auth.guard.ts` (the `x-user-role` bypass).

- [ ] **Step 2: Update frontend to use JWT instead of header bypass**

This requires changes to the web frontend's API calls. Defer to a separate plan.

- [ ] **Step 3: Commit**

```bash
git add api/src/common/guards/combined-auth.guard.ts
git commit -m "fix(security): remove x-user-role header bypass from CombinedAuthGuard"
```

---

## Entity Diagram

```
Organization (1) ──→ (N) Tenant
Tenant (1) ──→ (N) User
Tenant (1) ──→ (N) TenantVertical ──→ (1) Vertical
Tenant (1) ──→ (N) TenantFeature ──→ (1) Feature
Tenant (1) ──→ (N) UserRole ──→ (1) Role
Tenant (1) ──→ (N) UserContext

User (1) ──→ (N) UserRole ──→ (1) Role
User (1) ──→ (N) UserContext
User (1) ──→ (N) Session
User (1) ──→ (0..1) ParentProfile
User (1) ──→ (0..1) TeacherProfile
User (1) ──→ (0..1) ChildProfile

Role (1) ──→ (N) RolePermission ──→ (1) Permission
Role (1) ──→ (N) VerticalRole ──→ (1) Vertical
Role (1) ──→ (N) UserRole
Role (1) ──→ (N) UserContext

Vertical (1) ──→ (N) VerticalRole
Vertical (1) ──→ (N) TenantVertical
Vertical (1) ──→ (N) UserContext

School (1) ──→ (N) Classroom
TeacherProfile (1) ──→ (N) Classroom
```

## RBAC Matrix

| Role | users | tenants | agents | skills | kb | conversations | capsules | vision:* | lumo:* | mando:* | aqua:* | system:* |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| system_admin | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD |
| platform_admin | CRU | CRU | - | - | - | - | - | - | - | - | - | manage |
| owner | CRUD | RU | CRUD | CRUD | CRUD | CRUD | CRUD | - | - | - | - | - |
| admin | CRU | R | CRU | CRU | CRU | CRU | CRU | - | - | - | - | - |
| member | R | R | R | R | R | CRU | R | - | - | - | - | - |
| viewer | R | R | R | R | R | R | R | - | - | - | - | - |
| creative_director | - | - | - | - | - | - | - | CR | - | - | - | - |
| brand_manager | - | - | - | - | - | - | - | CR | - | - | - | - |
| campaign_manager | - | - | - | - | - | - | - | CR | - | M | - | - |
| school_admin | CRU | - | - | - | - | - | - | - | M | - | - | - |
| teacher | - | - | - | - | - | - | - | - | M | - | - | - |
| parent | - | - | - | - | - | - | - | - | M | - | - | - |
| farm_manager | - | - | - | - | - | - | - | - | - | - | M | - |
| technician | - | - | - | - | - | - | - | - | - | - | M | - |

## Vertical Matrix

| Vertical | Roles | Features |
|---|---|---|
| vision | creative_director, brand_manager, campaign_manager | CHARACTER_STUDIO, BRAND_STUDIO, CAMPAIGNS |
| lumo | school_admin, teacher, parent, student | LUMO_PARENT_APP, LUMO_TEACHER_APP, LUMO_CHILD_APP, LUMO_ANALYTICS |
| mando | campaign_manager, operator, analyst | CAMPAIGNS |
| aquaculture | farm_manager, technician, supervisor | - |

## User Context Example

```
User: francisco@pitayacode.io

Context 1 (default):
  Tenant: PitayaCode
  Vertical: Vision
  Role: Creative Director
  Permissions: vision:characters:create, vision:characters:read, vision:brands:create, vision:brands:read, vision:campaigns:create, vision:campaigns:read

Context 2:
  Tenant: PitayaCode
  Vertical: Lumo
  Role: Parent
  Permissions: lumo:evaluations:manage

Context 3:
  Tenant: PitayaCode
  Vertical: Mando
  Role: Campaign Manager
  Permissions: mando:campaigns:manage, mando:analytics:read, vision:campaigns:create, vision:campaigns:read
```

## Migration Strategy

1. **Phase 1-2 (Schema):** Additive only. New tables, new columns. No data loss. Deploy alongside existing code.
2. **Phase 3-4 (RBAC):** Additive + seed data. Populate RBAC tables from existing `User.role` enum values. Keep `User.role` and `User.permissions` as fallback.
3. **Phase 5 (Lumo):** Additive. New domain tables. No impact on existing code.
4. **Phase 6 (Seed):** Data migration. Migrate existing users to UserRole table. Run once.
5. **Phase 7 (Auth Refactor):** Code change. AuthService reads from RBAC tables. Falls back to legacy if empty.
6. **Phase 8 (Guard):** Additive. New guard registered globally. `@RequirePermissions` decorator available.
7. **Phase 9 (APIs):** Additive. New endpoints. No impact on existing code.
8. **Phase 10 (Security):** Breaking. Remove header bypass. Requires frontend update first.

**Rollback strategy:** Each phase is independently deployable. If RBAC tables are empty, AuthService falls back to legacy `User.role` enum and `User.permissions` JSON. No breaking changes until Phase 10.

## API Endpoints Summary

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/organizations` | tenants:read | List organizations |
| POST | `/organizations` | tenants:create | Create organization |
| GET | `/organizations/:id` | tenants:read | Get organization |
| PUT | `/organizations/:id` | tenants:update | Update organization |
| DELETE | `/organizations/:id` | tenants:delete | Delete organization |
| GET | `/roles` | - | List all roles |
| POST | `/roles` | system:settings:manage | Create role |
| GET | `/roles/:id` | - | Get role with permissions |
| PUT | `/roles/:id` | system:settings:manage | Update role |
| DELETE | `/roles/:id` | system:settings:manage | Delete role |
| POST | `/roles/:id/permissions` | system:settings:manage | Set role permissions |
| GET | `/roles/permissions` | - | List all permissions |
| GET | `/user-contexts` | - | Get current user's contexts |
| GET | `/user-contexts/:userId` | users:read | Get user's contexts |
| POST | `/user-contexts` | users:create | Create user context |
| DELETE | `/user-contexts/:id` | - | Delete own context |
| POST | `/user-contexts/:id/default` | - | Set default context |
| POST | `/auth/login` | @Public | Login (now returns roles) |
| POST | `/auth/switch-context` | - | Switch active context |
| GET | `/auth/context` | - | Get current context |
