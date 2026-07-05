import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';

@Injectable()
export class SocialAudiencesService {
  constructor(private readonly db: DatabaseService) {}

  async create(tenantId: string, data: any) {
    return this.db.mysql.socialAudience.create({
      data: {
        tenantId,
        name: data.name,
        segments: data.segments || [],
        painPoints: data.painPoints || [],
        goals: data.goals || [],
        fears: data.fears || [],
        emotions: data.emotions || [],
        demographics: data.demographics || {},
        psychographics: data.psychographics || {},
        buyerJourney: data.buyerJourney || {},
        metadata: data.metadata || {},
      },
    });
  }

  async findAll(tenantId: string) {
    return this.db.mysql.socialAudience.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const audience = await this.db.mysql.socialAudience.findFirst({
      where: { id, tenantId },
    });
    if (!audience) {
      throw new NotFoundException(`Audience ${id} not found`);
    }
    return audience;
  }

  async update(tenantId: string, id: string, data: any) {
    await this.findOne(tenantId, id);
    return this.db.mysql.socialAudience.update({
      where: { id },
      data: {
        name: data.name,
        segments: data.segments,
        painPoints: data.painPoints,
        goals: data.goals,
        fears: data.fears,
        emotions: data.emotions,
        demographics: data.demographics,
        psychographics: data.psychographics,
        buyerJourney: data.buyerJourney,
        metadata: data.metadata,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.db.mysql.socialAudience.delete({
      where: { id },
    });
  }
}
