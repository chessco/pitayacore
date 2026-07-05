import { Controller, Get, UseGuards } from '@nestjs/common';
import { OptimizationEngine } from './optimization.engine';
import { getTenantId } from '../../../common/tenant/tenant.middleware';
import { CombinedAuthGuard } from '../../../common/guards/combined-auth.guard';
import { FeatureFlagGuard } from '../../../common/guards/feature-flag.guard';
import { RequireFeature } from '../../../common/decorators/require-feature.decorator';

@Controller('api/social/optimization')
@UseGuards(CombinedAuthGuard, FeatureFlagGuard)
@RequireFeature('SOCIAL_SUITE')
export class SocialOptimizationController {
  constructor(private readonly optimizationEngine: OptimizationEngine) {}

  @Get('insights')
  getInsights() {
    return this.optimizationEngine.getInsights(getTenantId());
  }
}
