import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';

@Injectable()
export class SocialCampaignsService {
  constructor(private readonly db: DatabaseService) {}

  async create(tenantId: string, data: any) {
    return this.db.mysql.socialCampaign.create({
      data: {
        tenantId,
        brandId: data.brandId,
        name: data.name,
        objective: data.objective,
        status: data.status || 'DRAFT',
        channels: data.channels || [],
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        frequency: data.frequency,
        budget: data.budget ? parseFloat(data.budget) : null,
        metadata: data.metadata || {},
        audiences: data.audienceIds
          ? {
              connect: data.audienceIds.map((id: string) => ({ id })),
            }
          : undefined,
      },
      include: {
        brand: true,
        audiences: true,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.db.mysql.socialCampaign.findMany({
      where: { tenantId },
      include: {
        brand: true,
        audiences: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const campaign = await this.db.mysql.socialCampaign.findFirst({
      where: { id, tenantId },
      include: {
        brand: true,
        audiences: true,
        contentPieces: true,
        publishingQueue: {
          include: { contentPiece: true },
        },
        postAnalytics: true,
      },
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }
    return campaign;
  }

  async update(tenantId: string, id: string, data: any) {
    await this.findOne(tenantId, id);
    return this.db.mysql.socialCampaign.update({
      where: { id },
      data: {
        brandId: data.brandId,
        name: data.name,
        objective: data.objective,
        status: data.status,
        channels: data.channels,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        frequency: data.frequency,
        budget: data.budget ? parseFloat(data.budget) : null,
        metadata: data.metadata,
        audiences: data.audienceIds
          ? {
              set: data.audienceIds.map((id: string) => ({ id })),
            }
          : undefined,
      },
      include: {
        brand: true,
        audiences: true,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.db.mysql.socialCampaign.delete({
      where: { id },
    });
  }
}
