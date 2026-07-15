import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { AppearanceService } from './appearance.service';
import { getTenantId } from '../../../common/tenant/tenant.middleware';

@Controller('design/appearance')
export class AppearanceController {
  constructor(private readonly appearanceService: AppearanceService) {}

  @Get()
  async getState() {
    const tenantId = getTenantId();
    return this.appearanceService.getState(tenantId);
  }

  @Patch('mode')
  async switchMode(@Body('mode') mode: 'LIGHT' | 'DARK' | 'AUTO') {
    const tenantId = getTenantId();
    return this.appearanceService.switchMode(tenantId, mode);
  }

  @Post('preview/:themeId')
  async setPreview(@Param('themeId') themeId: string) {
    const tenantId = getTenantId();
    return this.appearanceService.setPreview(tenantId, themeId);
  }

  @Post('apply')
  async applyPreview() {
    const tenantId = getTenantId();
    return this.appearanceService.applyPreview(tenantId);
  }
}
