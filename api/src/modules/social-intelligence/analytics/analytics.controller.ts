import { Controller, Get, Query } from '@nestjs/common';
import { getTenantId } from '../../../common/tenant/tenant.middleware';
import { AnalyticsService } from './analytics.service';
import { TrendsService } from './trends.service';

/** Read-only analytics for the Sentinel AI dashboard and other consumers. */
@Controller('social-intelligence/analytics')
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly trends: TrendsService,
  ) {}

  private win(windowDays?: string, limit?: string) {
    return {
      windowDays: windowDays ? parseInt(windowDays, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };
  }

  @Get('overview')
  overview(@Query('windowDays') windowDays?: string) {
    return this.analytics.overview(getTenantId(), this.win(windowDays));
  }

  @Get('sentiment')
  sentiment(@Query('windowDays') windowDays?: string) {
    return this.analytics.sentiment(getTenantId(), this.win(windowDays));
  }

  @Get('topics')
  topics(
    @Query('windowDays') windowDays?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analytics.topics(getTenantId(), this.win(windowDays, limit));
  }

  @Get('activity')
  activity(@Query('windowDays') windowDays?: string) {
    return this.analytics.activityBySource(getTenantId(), this.win(windowDays));
  }

  @Get('recommendations')
  recommendations(
    @Query('windowDays') windowDays?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analytics.recommendations(
      getTenantId(),
      this.win(windowDays, limit),
    );
  }

  @Get('alerts')
  alerts() {
    return this.analytics.alertsSummary(getTenantId());
  }

  @Get('trends')
  trendsList(@Query('windowDays') windowDays?: string) {
    return this.trends.computeTrends(
      getTenantId(),
      windowDays ? parseInt(windowDays, 10) : undefined,
    );
  }
}
