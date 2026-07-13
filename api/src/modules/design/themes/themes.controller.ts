import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { ThemesService } from './themes.service';
import { getTenantId } from '../../../common/tenant/tenant.middleware';

@Controller('design/themes')
export class ThemesController {
  constructor(private readonly themesService: ThemesService) {}

  @Get()
  async findAll() {
    const tenantId = getTenantId();
    return this.themesService.findByTenant(tenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const tenantId = getTenantId();
    return this.themesService.findOne(id, tenantId);
  }

  @Post()
  async create(@Body() data: any) {
    const tenantId = getTenantId();
    return this.themesService.create(tenantId, data);
  }

  @Post(':id/activate')
  async activate(@Param('id') id: string) {
    const tenantId = getTenantId();
    return this.themesService.activate(id, tenantId);
  }

  @Post(':id/duplicate')
  async duplicate(@Param('id') id: string, @Body('name') newName: string) {
    const tenantId = getTenantId();
    return this.themesService.duplicate(id, tenantId, newName);
  }

  @Post(':id/versions')
  async createVersion(
    @Param('id') id: string,
    @Body('version') version: string,
    @Body('tokens') tokens: any,
  ) {
    const tenantId = getTenantId();
    return this.themesService.createVersion(id, tenantId, version, tokens);
  }

  @Get(':id/versions')
  async getVersions(@Param('id') id: string) {
    return this.themesService.getVersions(id);
  }

  @Post(':id/rollback/:versionId')
  async rollback(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    const tenantId = getTenantId();
    return this.themesService.rollback(id, tenantId, versionId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const tenantId = getTenantId();
    return this.themesService.delete(id, tenantId);
  }
}
