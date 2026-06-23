import { Controller, Get, Delete, Param } from '@nestjs/common';
import { AssetsService } from './assets.service';

@Controller('api/tenants/:tenantId/assets')
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
