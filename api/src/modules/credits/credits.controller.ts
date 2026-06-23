import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CreditsService } from './credits.service';
import { TenantOwnershipGuard } from '../../common/guards/tenant-ownership.guard';

@Controller('api/tenants/:tenantId/credits')
@UseGuards(TenantOwnershipGuard)
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Get('balance')
  getBalance(@Param('tenantId') tenantId: string) {
    return this.creditsService.getBalance(tenantId);
  }
}
