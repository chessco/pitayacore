import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { getTenantId } from '../../../common/tenant/tenant.middleware';
import { AlertsService } from './alerts.service';
import { UpdateAlertStatusDto } from './dto/alert-rule.dto';

/** Read + lifecycle management for generated alerts. */
@Controller('social-intelligence/alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('limit') limit?: string,
  ) {
    return this.alerts.list(getTenantId(), {
      status,
      severity,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.alerts.get(getTenantId(), id);
  }

  /** Update alert status (OPEN | ACKNOWLEDGED | RESOLVED). */
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateAlertStatusDto) {
    return this.alerts.updateStatus(getTenantId(), id, dto.status);
  }
}
