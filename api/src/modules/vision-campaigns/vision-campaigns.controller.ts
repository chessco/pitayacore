import { Controller, Get, Delete, Param, UseGuards } from '@nestjs/common';
import { VisionCampaignsService } from './vision-campaigns.service';
import { TenantOwnershipGuard } from '../../common/guards/tenant-ownership.guard';

@Controller('tenants/:tenantId/campaigns')
@UseGuards(TenantOwnershipGuard)
export class VisionCampaignsController {
  constructor(
    private readonly visionCampaignsService: VisionCampaignsService,
  ) {}

  @Get()
  findAll(@Param('tenantId') tenantId: string) {
    return this.visionCampaignsService.findAll(tenantId);
  }

  @Delete(':id')
  delete(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.visionCampaignsService.delete(tenantId, id);
  }
}
