import { Controller, Get, Post, Body } from '@nestjs/common';
import { WhiteLabelService } from './white-label.service';
import { getTenantId } from '../../../common/tenant/tenant.middleware';

@Controller('design/white-label')
export class WhiteLabelController {
  constructor(private readonly whiteLabelService: WhiteLabelService) {}

  @Get('config')
  async getCombinedConfig() {
    // Resolve tenantId using middleware
    let tenantId;
    try {
      tenantId = getTenantId();
    } catch (e) {
      // Fallback tenant if missing context
      tenantId = 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718';
    }
    return this.whiteLabelService.getCombinedConfig(tenantId);
  }

  @Post()
  async updateOrCreate(@Body() data: any) {
    const tenantId = getTenantId();
    return this.whiteLabelService.updateOrCreate(tenantId, data);
  }
}
