import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SocialMemoryService } from './social-memory.service';
import { getTenantId } from '../../../common/tenant/tenant.middleware';
import { CombinedAuthGuard } from '../../../common/guards/combined-auth.guard';
import { FeatureFlagGuard } from '../../../common/guards/feature-flag.guard';
import { RequireFeature } from '../../../common/decorators/require-feature.decorator';

@Controller('api/social/memory')
@UseGuards(CombinedAuthGuard, FeatureFlagGuard)
@RequireFeature('SOCIAL_SUITE')
export class SocialMemoryController {
  constructor(private readonly memoryService: SocialMemoryService) {}

  @Get()
  getMemories(@Query('refType') refType: string) {
    return this.memoryService.getMemories(getTenantId(), refType);
  }

  @Get('search')
  searchMemory(
    @Query('refType') refType: any,
    @Query('query') query: string,
    @Query('limit') limit: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    return this.memoryService.searchMemory(
      getTenantId(),
      refType,
      query,
      limitNum,
    );
  }
}
