import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ThemeCacheService } from './cache.service';
import { getTenantId } from '../../../common/tenant/tenant.middleware';

@Controller('design/cache')
export class CacheController {
  constructor(private readonly cacheService: ThemeCacheService) {}

  @Get()
  async listCached() {
    const tenantId = getTenantId();
    return this.cacheService.listCached(tenantId);
  }

  @Get(':themeId')
  async getCached(@Param('themeId') themeId: string) {
    const tenantId = getTenantId();
    return this.cacheService.getCached(tenantId, themeId);
  }

  @Get(':themeId/tokens')
  async getCachedTokens(@Param('themeId') themeId: string) {
    const tenantId = getTenantId();
    return this.cacheService.getCachedTokens(tenantId, themeId);
  }

  @Get(':themeId/status')
  async getCacheStatus(@Param('themeId') themeId: string) {
    const tenantId = getTenantId();
    return this.cacheService.getCacheStatus(tenantId, themeId);
  }

  @Post(':themeId/invalidate')
  async invalidate(@Param('themeId') themeId: string) {
    const tenantId = getTenantId();
    await this.cacheService.invalidate(tenantId, themeId);
    return { message: 'Cache invalidated', themeId };
  }

  @Post('invalidate-all')
  async invalidateAll() {
    const tenantId = getTenantId();
    await this.cacheService.invalidateAllForTenant(tenantId);
    return { message: 'All cache invalidated for tenant' };
  }
}
