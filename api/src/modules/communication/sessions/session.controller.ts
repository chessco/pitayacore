import { Controller, Post, Param, Get, Delete } from '@nestjs/common';
import { SessionService } from './session.service';
import { getTenantId } from '../../../common/tenant/tenant.middleware';

@Controller('communication/sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post(':provider/initialize')
  async initializeSession(@Param('provider') provider: string) {
    const tenantId = getTenantId();
    return this.sessionService.initializeSession(tenantId, provider);
  }

  @Get(':provider/status')
  async getSessionStatus(@Param('provider') provider: string) {
    const tenantId = getTenantId();
    return this.sessionService.getSessionStatus(tenantId, provider);
  }

  @Delete(':provider/disconnect')
  async disconnectSession(@Param('provider') provider: string) {
    const tenantId = getTenantId();
    await this.sessionService.disconnectSession(tenantId, provider);
    return { success: true };
  }
}
