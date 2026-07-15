import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';
import { DesignAuditService } from '../audit/design-audit.service';
import { DesignMemoryService } from '../memory/design-memory.service';
import { DesignGateway } from '../gateways/design.gateway';

@Injectable()
export class BrandsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: DesignAuditService,
    private readonly memory: DesignMemoryService,
    private readonly gateway: DesignGateway,
  ) {}

  async findByTenant(tenantId: string) {
    return this.db.mysql.brand.findMany({
      where: { tenantId },
      include: { themes: true },
    });
  }

  async findOne(id: string, tenantId: string) {
    return this.db.mysql.brand.findFirst({
      where: { id, tenantId },
      include: { themes: true },
    });
  }

  async create(tenantId: string, data: any) {
    const brand = await this.db.mysql.brand.create({
      data: {
        ...data,
        tenantId,
      },
    });

    // Audit
    await this.audit.log({
      tenantId,
      action: 'BrandCreated',
      entity: 'Brand',
      entityId: brand.id,
      after: { name: brand.name, industry: brand.industry },
    });

    // Save brand creation to memory
    await this.memory
      .saveBrandMemory(
        tenantId,
        'BrandEvolution',
        `Brand Created: ${brand.name}`,
        {
          event: 'created',
          brand: {
            name: brand.name,
            industry: brand.industry,
            description: brand.description,
          },
        },
        brand.id,
      )
      .catch(() => {});

    return brand;
  }

  async update(id: string, tenantId: string, data: any) {
    const before = await this.findOne(id, tenantId);

    const result = await this.db.mysql.brand.updateMany({
      where: { id, tenantId },
      data,
    });

    // Audit
    await this.audit.log({
      tenantId,
      action: 'BrandUpdated',
      entity: 'Brand',
      entityId: id,
      before: before
        ? { name: before.name, industry: before.industry }
        : undefined,
      after: data,
    });

    // Persist evolution to memory
    await this.memory
      .saveBrandMemory(
        tenantId,
        'BrandEvolution',
        `Brand Updated: ${before?.name || id}`,
        { event: 'updated', changes: data },
        id,
      )
      .catch(() => {});

    // WebSocket notification
    this.gateway.emitBrandUpdated(tenantId, id);

    return result;
  }

  async delete(id: string, tenantId: string) {
    const brand = await this.findOne(id, tenantId);

    await this.audit.log({
      tenantId,
      action: 'BrandDeleted',
      entity: 'Brand',
      entityId: id,
      before: brand ? { name: brand.name } : undefined,
    });

    return this.db.mysql.brand.deleteMany({
      where: { id, tenantId },
    });
  }
}
