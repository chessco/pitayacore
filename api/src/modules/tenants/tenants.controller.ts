import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  create(
    @Body()
    createTenantDto: {
      name: string;
      plan?: 'FREE' | 'PRO' | 'ENTERPRISE';
    },
  ) {
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Get(':id/consumption')
  getConsumption(@Param('id') id: string) {
    return this.tenantsService.getTenantConsumption(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.tenantsService.update(id, data);
  }

  @Get('analytics/global')
  getGlobalAnalytics() {
    return this.tenantsService.getGlobalAnalytics();
  }
}
