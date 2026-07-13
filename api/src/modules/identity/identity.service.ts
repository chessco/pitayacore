import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class IdentityService {
  constructor(private db: DatabaseService) {}

  async getStatus() {
    const [
      roles,
      permissions,
      rolePermissions,
      userRoles,
      verticalRoles,
      userContexts,
      features,
      organizations,
      sessions,
    ] = await Promise.all([
      this.db.mysql.role.count(),
      this.db.mysql.permission.count(),
      this.db.mysql.rolePermission.count(),
      this.db.mysql.userRole.count(),
      this.db.mysql.verticalRole.count(),
      this.db.mysql.userContext.count(),
      this.db.mysql.feature.count(),
      this.db.mysql.organization.count(),
      this.db.mysql.session.count(),
    ]);

    return {
      tables: {
        roles: { count: roles, status: roles > 0 ? 'ok' : 'empty' },
        permissions: {
          count: permissions,
          status: permissions > 0 ? 'ok' : 'empty',
        },
        rolePermissions: {
          count: rolePermissions,
          status: rolePermissions > 0 ? 'ok' : 'empty',
        },
        userRoles: { count: userRoles, status: userRoles > 0 ? 'ok' : 'empty' },
        verticalRoles: {
          count: verticalRoles,
          status: verticalRoles > 0 ? 'ok' : 'empty',
        },
        userContexts: {
          count: userContexts,
          status: userContexts > 0 ? 'ok' : 'empty',
        },
        features: { count: features, status: features > 0 ? 'ok' : 'empty' },
        organizations: {
          count: organizations,
          status: organizations > 0 ? 'ok' : 'empty',
        },
        sessions: { count: sessions, status: 'ok' },
      },
      overall:
        roles > 0 &&
        permissions > 0 &&
        rolePermissions > 0 &&
        userRoles > 0 &&
        features > 0
          ? 'ready'
          : 'needs_seed',
    };
  }

  async getRoles() {
    return this.db.mysql.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
        verticalRoles: {
          include: { vertical: true },
        },
        _count: { select: { userRoles: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getPermissions() {
    return this.db.mysql.permission.findMany({
      include: {
        _count: { select: { rolePermissions: true } },
      },
      orderBy: { resource: 'asc' },
    });
  }

  async getUserRoles() {
    return this.db.mysql.userRole.findMany({
      include: {
        user: { select: { id: true, email: true, name: true } },
        role: { select: { id: true, name: true, slug: true } },
        tenant: { select: { id: true, name: true } },
      },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async getVerticalRoles() {
    return this.db.mysql.verticalRole.findMany({
      include: {
        vertical: true,
        role: true,
      },
    });
  }

  async getUserContexts() {
    return this.db.mysql.userContext.findMany({
      include: {
        user: { select: { id: true, email: true, name: true } },
        tenant: { select: { id: true, name: true } },
        vertical: { select: { id: true, name: true, slug: true } },
        role: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFeatures() {
    return this.db.mysql.feature.findMany({
      include: {
        tenantFeatures: {
          include: { tenant: { select: { id: true, name: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // --- CRUD Roles ---
  async createRole(data: any) {
    const { permissionIds, ...roleData } = data;
    const role = await this.db.mysql.role.create({ data: roleData });
    if (permissionIds && permissionIds.length > 0) {
      await Promise.all(
        permissionIds.map((id: string) =>
          this.db.mysql.rolePermission.create({
            data: { roleId: role.id, permissionId: id },
          }),
        ),
      );
    }
    return role;
  }

  async updateRole(id: string, data: any) {
    const { permissionIds, ...roleData } = data;
    const role = await this.db.mysql.role.update({
      where: { id },
      data: roleData,
    });

    if (permissionIds !== undefined) {
      await this.db.mysql.rolePermission.deleteMany({ where: { roleId: id } });
      if (permissionIds.length > 0) {
        await Promise.all(
          permissionIds.map((permId: string) =>
            this.db.mysql.rolePermission.create({
              data: { roleId: id, permissionId: permId },
            }),
          ),
        );
      }
    }
    return role;
  }

  async deleteRole(id: string) {
    const role = await this.db.mysql.role.findUnique({ where: { id } });
    if (role?.isSystem) {
      throw new Error('No se puede eliminar un rol del sistema');
    }
    return this.db.mysql.role.delete({ where: { id } });
  }

  // --- CRUD Permissions ---
  async createPermission(data: any) {
    return this.db.mysql.permission.create({ data });
  }

  async updatePermission(id: string, data: any) {
    return this.db.mysql.permission.update({ where: { id }, data });
  }

  async deletePermission(id: string) {
    return this.db.mysql.permission.delete({ where: { id } });
  }

  // --- CRUD UserContext ---
  async createUserContext(data: any) {
    return this.db.mysql.userContext.create({ data });
  }

  async updateUserContext(id: string, data: any) {
    return this.db.mysql.userContext.update({ where: { id }, data });
  }

  async deleteUserContext(id: string) {
    return this.db.mysql.userContext.delete({ where: { id } });
  }

  // --- CRUD VerticalRole ---
  async createVerticalRole(data: any) {
    return this.db.mysql.verticalRole.create({ data });
  }

  async deleteVerticalRole(id: string) {
    return this.db.mysql.verticalRole.delete({ where: { id } });
  }

  async seed() {
    const logs: string[] = [];
    const log = (msg: string) => {
      logs.push(msg);
      console.log(`[SEED] ${msg}`);
    };

    try {
      // 1. PERMISSIONS
      const permissions = [
        {
          key: 'users:create',
          resource: 'users',
          action: 'create',
          description: 'Create users',
        },
        {
          key: 'users:read',
          resource: 'users',
          action: 'read',
          description: 'View users',
        },
        {
          key: 'users:update',
          resource: 'users',
          action: 'update',
          description: 'Update users',
        },
        {
          key: 'users:delete',
          resource: 'users',
          action: 'delete',
          description: 'Delete users',
        },
        {
          key: 'tenants:create',
          resource: 'tenants',
          action: 'create',
          description: 'Create tenants',
        },
        {
          key: 'tenants:read',
          resource: 'tenants',
          action: 'read',
          description: 'View tenants',
        },
        {
          key: 'tenants:update',
          resource: 'tenants',
          action: 'update',
          description: 'Update tenants',
        },
        {
          key: 'tenants:delete',
          resource: 'tenants',
          action: 'delete',
          description: 'Delete tenants',
        },
        {
          key: 'agents:create',
          resource: 'agents',
          action: 'create',
          description: 'Create agents',
        },
        {
          key: 'agents:read',
          resource: 'agents',
          action: 'read',
          description: 'View agents',
        },
        {
          key: 'agents:update',
          resource: 'agents',
          action: 'update',
          description: 'Update agents',
        },
        {
          key: 'agents:delete',
          resource: 'agents',
          action: 'delete',
          description: 'Delete agents',
        },
        {
          key: 'skills:create',
          resource: 'skills',
          action: 'create',
          description: 'Create skills',
        },
        {
          key: 'skills:read',
          resource: 'skills',
          action: 'read',
          description: 'View skills',
        },
        {
          key: 'skills:update',
          resource: 'skills',
          action: 'update',
          description: 'Update skills',
        },
        {
          key: 'skills:delete',
          resource: 'skills',
          action: 'delete',
          description: 'Delete skills',
        },
        {
          key: 'kb:create',
          resource: 'kb',
          action: 'create',
          description: 'Create knowledge entries',
        },
        {
          key: 'kb:read',
          resource: 'kb',
          action: 'read',
          description: 'View knowledge entries',
        },
        {
          key: 'kb:update',
          resource: 'kb',
          action: 'update',
          description: 'Update knowledge entries',
        },
        {
          key: 'kb:delete',
          resource: 'kb',
          action: 'delete',
          description: 'Delete knowledge entries',
        },
        {
          key: 'conversations:create',
          resource: 'conversations',
          action: 'create',
          description: 'Create conversations',
        },
        {
          key: 'conversations:read',
          resource: 'conversations',
          action: 'read',
          description: 'View conversations',
        },
        {
          key: 'conversations:update',
          resource: 'conversations',
          action: 'update',
          description: 'Update conversations',
        },
        {
          key: 'conversations:delete',
          resource: 'conversations',
          action: 'delete',
          description: 'Delete conversations',
        },
        {
          key: 'capsules:create',
          resource: 'capsules',
          action: 'create',
          description: 'Create capsules',
        },
        {
          key: 'capsules:read',
          resource: 'capsules',
          action: 'read',
          description: 'View capsules',
        },
        {
          key: 'capsules:update',
          resource: 'capsules',
          action: 'update',
          description: 'Update capsules',
        },
        {
          key: 'capsules:delete',
          resource: 'capsules',
          action: 'delete',
          description: 'Delete capsules',
        },
        {
          key: 'vision:characters:create',
          resource: 'vision:characters',
          action: 'create',
          description: 'Create characters',
        },
        {
          key: 'vision:characters:read',
          resource: 'vision:characters',
          action: 'read',
          description: 'View characters',
        },
        {
          key: 'vision:brands:create',
          resource: 'vision:brands',
          action: 'create',
          description: 'Create brands',
        },
        {
          key: 'vision:brands:read',
          resource: 'vision:brands',
          action: 'read',
          description: 'View brands',
        },
        {
          key: 'vision:campaigns:create',
          resource: 'vision:campaigns',
          action: 'create',
          description: 'Create vision campaigns',
        },
        {
          key: 'vision:campaigns:read',
          resource: 'vision:campaigns',
          action: 'read',
          description: 'View vision campaigns',
        },
        {
          key: 'lumo:schools:manage',
          resource: 'lumo:schools',
          action: 'manage',
          description: 'Manage schools',
        },
        {
          key: 'lumo:classrooms:manage',
          resource: 'lumo:classrooms',
          action: 'manage',
          description: 'Manage classrooms',
        },
        {
          key: 'lumo:students:manage',
          resource: 'lumo:students',
          action: 'manage',
          description: 'Manage students',
        },
        {
          key: 'lumo:lessons:manage',
          resource: 'lumo:lessons',
          action: 'manage',
          description: 'Manage lessons',
        },
        {
          key: 'lumo:evaluations:manage',
          resource: 'lumo:evaluations',
          action: 'manage',
          description: 'Manage evaluations',
        },
        {
          key: 'mando:campaigns:manage',
          resource: 'mando:campaigns',
          action: 'manage',
          description: 'Manage Mando campaigns',
        },
        {
          key: 'mando:analytics:read',
          resource: 'mando:analytics',
          action: 'read',
          description: 'View Mando analytics',
        },
        {
          key: 'aqua:farms:manage',
          resource: 'aqua:farms',
          action: 'manage',
          description: 'Manage farms',
        },
        {
          key: 'aqua:ponds:manage',
          resource: 'aqua:ponds',
          action: 'manage',
          description: 'Manage ponds',
        },
        {
          key: 'aqua:cycles:manage',
          resource: 'aqua:cycles',
          action: 'manage',
          description: 'Manage cycles',
        },
        {
          key: 'system:settings:manage',
          resource: 'system:settings',
          action: 'manage',
          description: 'Manage system settings',
        },
        {
          key: 'system:logs:read',
          resource: 'system:logs',
          action: 'read',
          description: 'View system logs',
        },
        {
          key: 'system:infra:manage',
          resource: 'system:infra',
          action: 'manage',
          description: 'Manage infrastructure',
        },
        {
          key: 'social:admin',
          resource: 'social',
          action: 'admin',
          description: 'Full social administration',
        },
        {
          key: 'social:manager',
          resource: 'social',
          action: 'manage',
          description: 'Manage social campaigns and assets',
        },
        {
          key: 'social:editor',
          resource: 'social',
          action: 'edit',
          description: 'Edit social content pieces',
        },
        {
          key: 'social:analyst',
          resource: 'social',
          action: 'analyze',
          description: 'Read social analytics and performance',
        },
        {
          key: 'social:approver',
          resource: 'social',
          action: 'approve',
          description: 'Approve social content for publishing',
        },
        {
          key: 'social:publisher',
          resource: 'social',
          action: 'publish',
          description: 'Publish content to social networks',
        },
      ];

      for (const perm of permissions) {
        await this.db.mysql.permission.upsert({
          where: { key: perm.key },
          update: {},
          create: perm,
        });
      }
      log(`Seeded ${permissions.length} permissions`);

      // 2. ROLES
      const roles = [
        {
          name: 'System Admin',
          slug: 'system_admin',
          description: 'Full platform access',
          isSystem: true,
        },
        {
          name: 'Platform Admin',
          slug: 'platform_admin',
          description: 'Cross-tenant administration',
          isSystem: true,
        },
        {
          name: 'Owner',
          slug: 'owner',
          description: 'Tenant owner with full access',
          isSystem: true,
        },
        {
          name: 'Admin',
          slug: 'admin',
          description: 'Tenant administrator',
          isSystem: true,
        },
        {
          name: 'Member',
          slug: 'member',
          description: 'Standard tenant member',
          isSystem: true,
        },
        {
          name: 'Viewer',
          slug: 'viewer',
          description: 'Read-only access',
          isSystem: true,
        },
        {
          name: 'Creative Director',
          slug: 'creative_director',
          description: 'Vision: leads creative strategy',
        },
        {
          name: 'Brand Manager',
          slug: 'brand_manager',
          description: 'Vision: manages brand assets',
        },
        {
          name: 'Campaign Manager',
          slug: 'campaign_manager',
          description: 'Vision: manages campaigns',
        },
        {
          name: 'School Admin',
          slug: 'school_admin',
          description: 'Lumo: manages school',
        },
        {
          name: 'Teacher',
          slug: 'teacher',
          description: 'Lumo: teaches classes',
        },
        {
          name: 'Parent',
          slug: 'parent',
          description: 'Lumo: parent of student',
        },
        { name: 'Student', slug: 'student', description: 'Lumo: student' },
        {
          name: 'Operator',
          slug: 'operator',
          description: 'Mando: operates campaigns',
        },
        {
          name: 'Analyst',
          slug: 'analyst',
          description: 'Mando: analyzes data',
        },
        {
          name: 'Farm Manager',
          slug: 'farm_manager',
          description: 'Aquaculture: manages farm',
        },
        {
          name: 'Technician',
          slug: 'technician',
          description: 'Aquaculture: field technician',
        },
        {
          name: 'Supervisor',
          slug: 'supervisor',
          description: 'Aquaculture: supervises operations',
        },
        {
          name: 'Social Admin',
          slug: 'social_admin',
          description: 'Social Suite: full administrator access',
        },
        {
          name: 'Social Manager',
          slug: 'social_manager',
          description: 'Social Suite: manage campaigns, content, and queue',
        },
        {
          name: 'Social Editor',
          slug: 'social_editor',
          description: 'Social Suite: create and edit content',
        },
        {
          name: 'Social Analyst',
          slug: 'social_analyst',
          description: 'Social Suite: view reports and analytics',
        },
        {
          name: 'Social Approver',
          slug: 'social_approver',
          description: 'Social Suite: approve generated content pieces',
        },
        {
          name: 'Social Publisher',
          slug: 'social_publisher',
          description: 'Social Suite: execute queue publishing operations',
        },
      ];

      const roleMap: Record<string, string> = {};
      for (const role of roles) {
        const created = await this.db.mysql.role.upsert({
          where: { slug: role.slug },
          update: {},
          create: role,
        });
        roleMap[role.slug] = created.id;
      }
      log(`Seeded ${roles.length} roles`);

      // 3. ROLE-PERMISSION ASSIGNMENTS
      const rolePermAssignments: Record<string, string[]> = {
        system_admin: permissions.map((p) => p.key),
        platform_admin: [
          'users:create',
          'users:read',
          'users:update',
          'tenants:create',
          'tenants:read',
          'tenants:update',
          'system:settings:manage',
          'system:logs:read',
        ],
        owner: [
          'users:create',
          'users:read',
          'users:update',
          'users:delete',
          'tenants:read',
          'tenants:update',
          'agents:create',
          'agents:read',
          'agents:update',
          'agents:delete',
          'skills:create',
          'skills:read',
          'skills:update',
          'skills:delete',
          'kb:create',
          'kb:read',
          'kb:update',
          'kb:delete',
          'conversations:create',
          'conversations:read',
          'conversations:update',
          'conversations:delete',
          'capsules:create',
          'capsules:read',
          'capsules:update',
          'capsules:delete',
        ],
        admin: [
          'users:create',
          'users:read',
          'users:update',
          'agents:read',
          'agents:create',
          'agents:update',
          'skills:read',
          'skills:create',
          'skills:update',
          'kb:read',
          'kb:create',
          'kb:update',
          'conversations:read',
          'conversations:create',
          'conversations:update',
          'capsules:read',
          'capsules:create',
          'capsules:update',
        ],
        member: [
          'users:read',
          'agents:read',
          'skills:read',
          'kb:read',
          'conversations:read',
          'conversations:create',
          'conversations:update',
          'capsules:read',
        ],
        viewer: [
          'users:read',
          'agents:read',
          'skills:read',
          'kb:read',
          'conversations:read',
          'capsules:read',
        ],
        creative_director: [
          'vision:characters:create',
          'vision:characters:read',
          'vision:brands:create',
          'vision:brands:read',
          'vision:campaigns:create',
          'vision:campaigns:read',
        ],
        brand_manager: [
          'vision:brands:create',
          'vision:brands:read',
          'vision:characters:read',
        ],
        campaign_manager: [
          'vision:campaigns:create',
          'vision:campaigns:read',
          'vision:characters:read',
        ],
        school_admin: [
          'lumo:schools:manage',
          'lumo:classrooms:manage',
          'lumo:students:manage',
          'lumo:lessons:manage',
          'lumo:evaluations:manage',
          'users:create',
          'users:read',
          'users:update',
        ],
        teacher: [
          'lumo:classrooms:manage',
          'lumo:lessons:manage',
          'lumo:evaluations:manage',
          'lumo:students:manage',
        ],
        parent: ['lumo:evaluations:manage'],
        student: [],
        operator: ['mando:campaigns:manage', 'mando:analytics:read'],
        analyst: ['mando:analytics:read'],
        farm_manager: [
          'aqua:farms:manage',
          'aqua:ponds:manage',
          'aqua:cycles:manage',
        ],
        supervisor: ['aqua:farms:manage', 'aqua:ponds:manage'],
        social_admin: [
          'social:admin',
          'social:manager',
          'social:editor',
          'social:analyst',
          'social:approver',
          'social:publisher',
        ],
        social_manager: [
          'social:manager',
          'social:editor',
          'social:analyst',
          'social:publisher',
        ],
        social_editor: ['social:editor', 'social:analyst'],
        social_analyst: ['social:analyst'],
        social_approver: ['social:approver', 'social:analyst'],
        social_publisher: ['social:publisher', 'social:analyst'],
      };

      let rpCount = 0;
      for (const [roleSlug, permKeys] of Object.entries(rolePermAssignments)) {
        const roleId = roleMap[roleSlug];
        if (!roleId) continue;
        for (const permKey of permKeys) {
          const perm = await this.db.mysql.permission.findUnique({
            where: { key: permKey },
          });
          if (!perm) continue;
          await this.db.mysql.rolePermission.upsert({
            where: { roleId_permissionId: { roleId, permissionId: perm.id } },
            update: {},
            create: { roleId, permissionId: perm.id },
          });
          rpCount++;
        }
      }
      log(`Seeded ${rpCount} role-permission assignments`);

      // 4. VERTICAL-ROLE ASSIGNMENTS
      const verticalRoleAssignments: Record<string, string[]> = {
        vision: [
          'creative_director',
          'brand_manager',
          'campaign_manager',
          'social_admin',
          'social_manager',
          'social_editor',
          'social_analyst',
          'social_approver',
          'social_publisher',
        ],
        lumo: ['school_admin', 'teacher', 'parent', 'student'],
        mando: ['campaign_manager', 'operator', 'analyst'],
        aquaculture: ['farm_manager', 'technician', 'supervisor'],
      };

      let vrCount = 0;
      for (const [verticalSlug, roleSlugs] of Object.entries(
        verticalRoleAssignments,
      )) {
        const vertical = await this.db.mysql.vertical.findUnique({
          where: { slug: verticalSlug },
        });
        if (!vertical) {
          log(`Vertical '${verticalSlug}' not found, skipping`);
          continue;
        }
        for (const roleSlug of roleSlugs) {
          const roleId = roleMap[roleSlug];
          if (!roleId) continue;
          await this.db.mysql.verticalRole.upsert({
            where: { verticalId_roleId: { verticalId: vertical.id, roleId } },
            update: {},
            create: { verticalId: vertical.id, roleId },
          });
          vrCount++;
        }
      }
      log(`Seeded ${vrCount} vertical-role assignments`);

      // 5. FEATURES
      const features = [
        {
          name: 'Character Studio',
          slug: 'CHARACTER_STUDIO',
          description: 'Vision: character creation and management',
        },
        {
          name: 'Brand Studio',
          slug: 'BRAND_STUDIO',
          description: 'Vision: brand asset management',
        },
        {
          name: 'Campaigns',
          slug: 'CAMPAIGNS',
          description: 'Vision: campaign management',
        },
        {
          name: 'Lumo Parent App',
          slug: 'LUMO_PARENT_APP',
          description: 'Lumo: parent mobile app',
        },
        {
          name: 'Lumo Teacher App',
          slug: 'LUMO_TEACHER_APP',
          description: 'Lumo: teacher dashboard',
        },
        {
          name: 'Lumo Child App',
          slug: 'LUMO_CHILD_APP',
          description: 'Lumo: student learning app',
        },
        {
          name: 'Lumo Analytics',
          slug: 'LUMO_ANALYTICS',
          description: 'Lumo: analytics dashboard',
        },
        { name: 'Agents', slug: 'AGENTS', description: 'AI agent management' },
        {
          name: 'Workflows',
          slug: 'WORKFLOWS',
          description: 'Workflow automation',
        },
        {
          name: 'Knowledge',
          slug: 'KNOWLEDGE',
          description: 'Knowledge base management',
        },
        {
          name: 'Memory',
          slug: 'MEMORY',
          description: 'AI memory and context',
        },
        {
          name: 'Ecommerce',
          slug: 'ECOMMERCE',
          description: 'E-commerce module',
        },
        {
          name: 'CRM',
          slug: 'CRM',
          description: 'Customer relationship management',
        },
        { name: 'Capsules', slug: 'CAPSULES', description: 'Capsule studio' },
      ];

      for (const feat of features) {
        await this.db.mysql.feature.upsert({
          where: { name: feat.name },
          update: { slug: feat.slug, description: feat.description },
          create: feat,
        });
      }
      log(`Seeded ${features.length} features`);

      // 6. MIGRATE EXISTING USERS TO UserRole
      const existingUsers = await this.db.mysql.user.findMany();
      let migratedUsers = 0;
      for (const user of existingUsers) {
        const roleSlug = user.role.toLowerCase();
        const roleId = roleMap[roleSlug] || roleMap['member'];
        if (roleId) {
          await this.db.mysql.userRole.upsert({
            where: {
              userId_roleId_tenantId: {
                userId: user.id,
                roleId,
                tenantId: user.tenantId,
              },
            },
            update: {},
            create: { userId: user.id, roleId, tenantId: user.tenantId },
          });
          migratedUsers++;
        }
      }
      log(`Migrated ${migratedUsers} users to UserRole table`);

      log('Identity Platform seeding complete!');
      return { success: true, logs };
    } catch (error) {
      log(`ERROR: ${error.message}`);
      return { success: false, logs, error: error.message };
    }
  }
}
