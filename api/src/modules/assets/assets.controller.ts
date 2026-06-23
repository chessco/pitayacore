import { Controller, Get, Delete, Param, UseGuards } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { TenantOwnershipGuard } from '../../common/guards/tenant-ownership.guard';

@Controller('api/tenants/:tenantId/assets')
@UseGuards(TenantOwnershipGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  findAll(@Param('tenantId') tenantId: string) {
    return this.assetsService.findAll(tenantId);
  }

  @Delete(':id')
  delete(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.assetsService.delete(tenantId, id);
  }
}
