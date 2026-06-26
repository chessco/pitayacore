import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class AssetsService {
  constructor(private readonly db: DatabaseService) {}

  private async resolveTenantId(tenantId: string): Promise<string> {
    if (tenantId === 'DEFAULT_TENANT') {
      const defaultTenant = await this.db.mysql.tenant.findFirst();
      return defaultTenant?.id || tenantId;
    }
    return tenantId;
  }

  async findAll(tenantId: string) {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    const assets = await this.db.mysql.asset.findMany({
      where: { tenantId: resolvedTenantId },
      orderBy: { createdAt: 'desc' },
    });

    return assets.map((a) => {
      const meta: any = a.metadata ? JSON.parse(a.metadata as string) : {};
      return {
        id: a.id,
        type: a.type,
        title: a.name,
        url: a.storagePath,
        dimensions: meta.dimensions || '1024x1024',
        createdAt: a.createdAt,
        campaign: meta.campaignName || null,
      };
    });
  }

  async delete(tenantId: string, id: string) {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return this.db.mysql.asset.delete({
      where: { id, tenantId: resolvedTenantId },
    });
  }
}
