import { Controller, Get, Query } from '@nestjs/common';
import { DesignAuditService } from './design-audit.service';
import { getTenantId } from '../../../common/tenant/tenant.middleware';

@Controller('design/audit')
export class DesignAuditController {
  constructor(private readonly auditService: DesignAuditService) {}

  @Get()
  async findAll(
    @Query('action') action?: string,
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const tenantId = getTenantId();
    return this.auditService.findByTenant(tenantId, {
      action,
      entity,
      entityId,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  @Get('count')
  async count() {
    const tenantId = getTenantId();
    const count = await this.auditService.countByTenant(tenantId);
    return { count };
  }
}
