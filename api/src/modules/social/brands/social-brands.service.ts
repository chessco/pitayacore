import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';

@Injectable()
export class SocialBrandsService {
  constructor(private readonly db: DatabaseService) {}

  async create(tenantId: string, data: any) {
    return this.db.mysql.socialBrand.create({
      data: {
        tenantId,
        name: data.name,
        industry: data.industry,
        country: data.country,
        language: data.language,
        tone: data.tone || {},
        personality: data.personality || {},
        values: data.values || [],
        prohibitedTerms: data.prohibitedTerms || [],
        allowedEmojis: data.allowedEmojis || [],
        ctaStyle: data.ctaStyle,
        logoUrl: data.logoUrl,
        brandColors: data.brandColors || {},
        competitors: data.competitors || [],
        metadata: data.metadata || {},
      },
    });
  }

  async findAll(tenantId: string) {
    return this.db.mysql.socialBrand.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const brand = await this.db.mysql.socialBrand.findFirst({
      where: { id, tenantId },
    });
    if (!brand) {
      throw new NotFoundException(`Brand ${id} not found`);
    }
    return brand;
  }

  async update(tenantId: string, id: string, data: any) {
    await this.findOne(tenantId, id);
    return this.db.mysql.socialBrand.update({
      where: { id },
      data: {
        name: data.name,
        industry: data.industry,
        country: data.country,
        language: data.language,
        tone: data.tone,
        personality: data.personality,
        values: data.values,
        prohibitedTerms: data.prohibitedTerms,
        allowedEmojis: data.allowedEmojis,
        ctaStyle: data.ctaStyle,
        logoUrl: data.logoUrl,
        brandColors: data.brandColors,
        competitors: data.competitors,
        metadata: data.metadata,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.db.mysql.socialBrand.delete({
      where: { id },
    });
  }
}
