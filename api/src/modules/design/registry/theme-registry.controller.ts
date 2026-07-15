import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ThemeRegistryService } from './theme-registry.service';
import { getTenantId } from '../../../common/tenant/tenant.middleware';

@Controller('design/registry')
export class ThemeRegistryController {
  constructor(private readonly registry: ThemeRegistryService) {}

  @Get()
  async getRegistry() {
    const tenantId = getTenantId();
    return this.registry.getRegistry(tenantId);
  }

  @Post(':id/publish')
  async publish(@Param('id') id: string) {
    const tenantId = getTenantId();
    return this.registry.publish(id, tenantId);
  }

  @Post(':id/archive')
  async archive(@Param('id') id: string) {
    const tenantId = getTenantId();
    return this.registry.archive(id, tenantId);
  }

  @Post(':id/restore')
  async restore(@Param('id') id: string) {
    const tenantId = getTenantId();
    return this.registry.restore(id, tenantId);
  }

  @Get(':id/history')
  async getHistory(@Param('id') id: string) {
    return this.registry.getVersionHistory(id);
  }

  @Get(':id/history/:versionId')
  async getSnapshot(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.registry.getVersionSnapshot(id, versionId);
  }
}
