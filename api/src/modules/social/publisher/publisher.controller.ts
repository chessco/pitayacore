import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { PublisherEngine } from './publisher.engine';
import { DatabaseService } from '../../../common/database/database.service';
import { getTenantId } from '../../../common/tenant/tenant.middleware';
import { CombinedAuthGuard } from '../../../common/guards/combined-auth.guard';
import { FeatureFlagGuard } from '../../../common/guards/feature-flag.guard';
import { RequireFeature } from '../../../common/decorators/require-feature.decorator';

@Controller('api/social/publisher')
@UseGuards(CombinedAuthGuard, FeatureFlagGuard)
@RequireFeature('SOCIAL_SUITE')
export class PublisherController {
  constructor(
    private readonly publisherEngine: PublisherEngine,
    private readonly db: DatabaseService,
  ) {}

  @Get('queue')
  getQueue() {
    return this.db.mysql.publishingQueue.findMany({
      where: { tenantId: getTenantId() },
      include: { contentPiece: { include: { brand: true } } },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  @Post('queue/:id/publish')
  async publishNow(@Param('id') id: string) {
    const success = await this.publisherEngine.publishQueueItem(id);
    return { success };
  }

  @Get('analytics')
  getAnalytics() {
    return this.db.mysql.postAnalytics.findMany({
      where: { tenantId: getTenantId() },
      include: { campaign: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('analytics/mock')
  async seedMockAnalytics() {
    const tenantId = getTenantId();
    // Create some mock analytic records across channels
    const providers = ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'X', 'TIKTOK'];
    const created = [];

    for (const provider of providers) {
      const record = await this.db.mysql.postAnalytics.create({
        data: {
          tenantId,
          provider,
          reach: Math.floor(Math.random() * 5000) + 500,
          impressions: Math.floor(Math.random() * 7000) + 1000,
          engagement: Math.floor(Math.random() * 1000) + 100,
          clicks: Math.floor(Math.random() * 400) + 30,
          ctr: parseFloat((Math.random() * 5 + 1).toFixed(2)),
          conversions: Math.floor(Math.random() * 50) + 5,
          cost: parseFloat((Math.random() * 100 + 10).toFixed(2)),
          roi: parseFloat((Math.random() * 3 + 1).toFixed(2)),
        },
      });
      created.push(record);
    }
    return created;
  }
}
