import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class BrandsService {
  constructor(private readonly db: DatabaseService) {}

  async getBrandConfig(tenantId: string) {
    const tenant = await this.db.mysql.tenant.findUnique({
      where: { id: tenantId },
      select: { brandingConfig: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    return tenant.brandingConfig || {};
  }

  async updateBrandConfig(tenantId: string, data: any) {
    const tenant = await this.db.mysql.tenant.update({
      where: { id: tenantId },
      data: {
        brandingConfig: data, // JSON field
      },
    });

    return tenant.brandingConfig;
  }
}
