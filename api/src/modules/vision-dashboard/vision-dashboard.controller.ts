import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { VisionDashboardService } from './vision-dashboard.service';
import { TenantOwnershipGuard } from '../../common/guards/tenant-ownership.guard';

@Controller('api/tenants/:tenantId/dashboard')
@UseGuards(TenantOwnershipGuard)
export class VisionDashboardController {
  constructor(private readonly dashboardService: VisionDashboardService) {}

  @Get()
  async getDashboard(@Param('tenantId') tenantId: string) {
    return this.dashboardService.getDashboardData(tenantId);
  }
}
