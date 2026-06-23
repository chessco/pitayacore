import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { TenantOwnershipGuard } from '../../common/guards/tenant-ownership.guard';

@Controller('api/tenants/:tenantId/brand')
@UseGuards(TenantOwnershipGuard)
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  getBrandConfig(@Param('tenantId') tenantId: string) {
    return this.brandsService.getBrandConfig(tenantId);
  }

  @Post()
  updateBrandConfig(@Param('tenantId') tenantId: string, @Body() data: any) {
    return this.brandsService.updateBrandConfig(tenantId, data);
  }
}
