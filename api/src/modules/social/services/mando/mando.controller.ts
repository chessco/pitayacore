import { Controller, Get, Query } from '@nestjs/common';
import { getTenantId } from '../../../../common/tenant/tenant.middleware';
import { MandoAdapterService } from './mando-adapter.service';

/**
 * Read-only Social Intelligence endpoints shaped for the Mando vertical.
 * Mando is purely a consumer — these endpoints never mutate SIS state.
 */
@Controller('social-intelligence/mando')
export class MandoController {
  constructor(private readonly mando: MandoAdapterService) {}

  private days(windowDays?: string): number | undefined {
    return windowDays ? parseInt(windowDays, 10) : undefined;
  }

  @Get('briefing')
  briefing(@Query('windowDays') windowDays?: string) {
    return this.mando.briefing(getTenantId(), this.days(windowDays));
  }

  @Get('incidents')
  incidents() {
    return this.mando.incidents(getTenantId());
  }

  @Get('alerts')
  alerts() {
    return this.mando.alerts(getTenantId());
  }

  @Get('topics')
  topics(@Query('windowDays') windowDays?: string) {
    return this.mando.topics(getTenantId(), this.days(windowDays));
  }

  @Get('recommendations')
  recommendations(@Query('windowDays') windowDays?: string) {
    return this.mando.recommendations(getTenantId(), this.days(windowDays));
  }
}
