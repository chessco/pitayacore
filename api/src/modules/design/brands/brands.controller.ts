import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { BrandsService } from './brands.service';
import { getTenantId } from '../../../common/tenant/tenant.middleware';

@Controller('design/brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  async findAll() {
    const tenantId = getTenantId();
    return this.brandsService.findByTenant(tenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const tenantId = getTenantId();
    return this.brandsService.findOne(id, tenantId);
  }

  @Post()
  async create(@Body() data: any) {
    const tenantId = getTenantId();
    return this.brandsService.create(tenantId, data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    const tenantId = getTenantId();
    return this.brandsService.update(id, tenantId, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const tenantId = getTenantId();
    return this.brandsService.delete(id, tenantId);
  }
}
