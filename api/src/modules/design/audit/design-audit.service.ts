import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';

export type DesignAuditAction =
  | 'ThemeActivated'
  | 'ThemeUpdated'
  | 'ThemeVersionCreated'
  | 'ThemeRolledBack'
  | 'ThemeCreated'
  | 'ThemeDeleted'
  | 'BrandCreated'
  | 'BrandUpdated'
  | 'BrandDeleted'
  | 'WhiteLabelChanged'
  | 'SyncCompleted'
  | 'WorkflowExecuted'
  | 'CacheInvalidated';

export type DesignAuditEntity =
  | 'Theme'
  | 'Brand'
  | 'WhiteLabel'
  | 'Sync'
  | 'Cache'
  | 'Workflow';

export interface AuditLogInput {
  tenantId: string;
  userId?: string;
  action: DesignAuditAction;
  entity: DesignAuditEntity;
  entityId: string;
  before?: any;
  after?: any;
  metadata?: any;
}

@Injectable()
export class DesignAuditService {
  constructor(private readonly db: DatabaseService) {}

  async log(input: AuditLogInput): Promise<void> {
    await this.db.mysql.designAuditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId || null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        before: input.before || null,
        after: input.after || null,
        metadata: input.metadata || null,
      },
    });
  }

  async findByTenant(
    tenantId: string,
    filters?: {
      action?: string;
      entity?: string;
      entityId?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: any = { tenantId };

    if (filters?.action) where.action = filters.action;
    if (filters?.entity) where.entity = filters.entity;
    if (filters?.entityId) where.entityId = filters.entityId;

    return this.db.mysql.designAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });
  }

  async findByEntity(entity: DesignAuditEntity, entityId: string) {
    return this.db.mysql.designAuditLog.findMany({
      where: { entity, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async countByTenant(tenantId: string): Promise<number> {
    return this.db.mysql.designAuditLog.count({ where: { tenantId } });
  }
}
