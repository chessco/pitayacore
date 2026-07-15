import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';

export type BrandMemoryType =
  | 'BrandEvolution'
  | 'DesignDecision'
  | 'ThemeHistory'
  | 'BrandAnalysis';

@Injectable()
export class DesignMemoryService {
  constructor(private readonly db: DatabaseService) {}

  async saveBrandMemory(
    tenantId: string,
    type: BrandMemoryType,
    title: string,
    content: any,
    brandId?: string,
    metadata?: any,
  ) {
    return this.db.mysql.brandMemory.create({
      data: {
        tenantId,
        brandId: brandId || null,
        type,
        title,
        content,
        metadata: metadata || null,
      },
    });
  }

  async getBrandHistory(tenantId: string, brandId: string) {
    return this.db.mysql.brandMemory.findMany({
      where: { tenantId, brandId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDesignDecisions(tenantId: string) {
    return this.db.mysql.brandMemory.findMany({
      where: { tenantId, type: 'DesignDecision' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getThemeHistory(tenantId: string) {
    return this.db.mysql.brandMemory.findMany({
      where: { tenantId, type: 'ThemeHistory' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllMemories(
    tenantId: string,
    brandId?: string,
    type?: BrandMemoryType,
  ) {
    const where: any = { tenantId };
    if (brandId) where.brandId = brandId;
    if (type) where.type = type;

    return this.db.mysql.brandMemory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async buildAgentContext(tenantId: string, brandId?: string): Promise<string> {
    const memories = await this.getAllMemories(tenantId, brandId);
    if (!memories.length) return '';

    const lines = memories.map(
      (m) =>
        `[${m.type}] ${m.title}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`,
    );

    return `Brand Memory Context:\n${lines.join('\n')}`;
  }

  async deleteByBrand(tenantId: string, brandId: string) {
    return this.db.mysql.brandMemory.deleteMany({
      where: { tenantId, brandId },
    });
  }
}
