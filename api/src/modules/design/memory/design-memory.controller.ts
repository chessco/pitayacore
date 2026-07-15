import { Controller, Get, Query } from '@nestjs/common';
import { DesignMemoryService } from './design-memory.service';
import { getTenantId } from '../../../common/tenant/tenant.middleware';

@Controller('design/memory')
export class DesignMemoryController {
  constructor(private readonly memoryService: DesignMemoryService) {}

  @Get()
  async findAll(@Query('brandId') brandId?: string, @Query('type') type?: any) {
    const tenantId = getTenantId();
    return this.memoryService.getAllMemories(tenantId, brandId, type);
  }

  @Get('decisions')
  async getDesignDecisions() {
    const tenantId = getTenantId();
    return this.memoryService.getDesignDecisions(tenantId);
  }

  @Get('theme-history')
  async getThemeHistory() {
    const tenantId = getTenantId();
    return this.memoryService.getThemeHistory(tenantId);
  }

  @Get('brand/:brandId')
  async getBrandHistory(@Query('brandId') brandId: string) {
    const tenantId = getTenantId();
    return this.memoryService.getBrandHistory(tenantId, brandId);
  }
}
