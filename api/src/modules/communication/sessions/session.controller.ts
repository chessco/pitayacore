import { Controller, Post, Param, Get, Delete } from '@nestjs/common';
import { SessionService } from './session.service';
import { getTenantId } from '../../../common/tenant/tenant.middleware';

@Controller('communication/sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post(':channelId/initialize')
  async initializeSession(@Param('channelId') channelId: string) {
    const tenantId = getTenantId();
    return this.sessionService.initializeSession(tenantId, channelId);
  }

  @Get(':channelId/status')
  async getSessionStatus(@Param('channelId') channelId: string) {
    const tenantId = getTenantId();
    return this.sessionService.getSessionStatus(tenantId, channelId);
  }

  @Delete(':channelId/disconnect')
  async disconnectSession(@Param('channelId') channelId: string) {
    const tenantId = getTenantId();
    await this.sessionService.disconnectSession(tenantId, channelId);
    return { success: true };
  }
}
