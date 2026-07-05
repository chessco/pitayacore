import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TrendEngine } from './trend.engine';
import { getTenantId } from '../../../common/tenant/tenant.middleware';
import { CombinedAuthGuard } from '../../../common/guards/combined-auth.guard';
import { FeatureFlagGuard } from '../../../common/guards/feature-flag.guard';
import { RequireFeature } from '../../../common/decorators/require-feature.decorator';

@Controller('api/social/trends')
@UseGuards(CombinedAuthGuard, FeatureFlagGuard)
@RequireFeature('SOCIAL_SUITE')
export class SocialTrendsController {
  constructor(private readonly trendEngine: TrendEngine) {}

  @Get('trending')
  getTrending(@Query('sector') sector: string) {
    return this.trendEngine.fetchTrends(getTenantId(), sector || 'marketing');
  }
}
