import { Controller, Get, Post, Param } from '@nestjs/common';
import { ThemeSyncService } from './sync.service';
import { getTenantId } from '../../../common/tenant/tenant.middleware';

@Controller('design/sync')
export class SyncController {
  constructor(private readonly syncService: ThemeSyncService) {}

  @Get('manifest')
  async getManifest() {
    const tenantId = getTenantId();
    return this.syncService.getManifest(tenantId);
  }

  @Post('trigger')
  async trigger() {
    const tenantId = getTenantId();
    return this.syncService.rebuild(tenantId);
  }

  @Get('status')
  async getStatus() {
    const tenantId = getTenantId();
    return this.syncService.getSyncStatus(tenantId);
  }
}
