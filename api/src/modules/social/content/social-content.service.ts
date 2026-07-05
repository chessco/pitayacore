import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';

@Injectable()
export class SocialContentService {
  constructor(private readonly db: DatabaseService) {}

  async create(tenantId: string, data: any) {
    return this.db.mysql.socialContentPiece.create({
      data: {
        tenantId,
        brandId: data.brandId,
        campaignId: data.campaignId,
        contentType: data.contentType,
        title: data.title,
        prompt: data.prompt,
        rawContent: data.rawContent,
        humanizedContent: data.humanizedContent,
        mediaUrls: data.mediaUrls || [],
        status: data.status || 'DRAFT',
        metadata: data.metadata || {},
      },
    });
  }

  async findAll(tenantId: string) {
    return this.db.mysql.socialContentPiece.findMany({
      where: { tenantId },
      include: {
        brand: true,
        campaign: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const piece = await this.db.mysql.socialContentPiece.findFirst({
      where: { id, tenantId },
      include: {
        brand: true,
        campaign: true,
      },
    });
    if (!piece) {
      throw new NotFoundException(`Content piece ${id} not found`);
    }
    return piece;
  }

  async update(tenantId: string, id: string, data: any) {
    await this.findOne(tenantId, id);
    return this.db.mysql.socialContentPiece.update({
      where: { id },
      data: {
        brandId: data.brandId,
        campaignId: data.campaignId,
        contentType: data.contentType,
        title: data.title,
        prompt: data.prompt,
        rawContent: data.rawContent,
        humanizedContent: data.humanizedContent,
        mediaUrls: data.mediaUrls,
        status: data.status,
        metadata: data.metadata,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.db.mysql.socialContentPiece.delete({
      where: { id },
    });
  }
}
