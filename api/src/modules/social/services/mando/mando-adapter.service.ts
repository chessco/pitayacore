import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../common/database/database.service';
import { AnalyticsService } from '../../analytics/analytics.service';
import { TrendsService } from '../../analytics/trends.service';

/**
 * Read-only adapter that exposes Social Intelligence data shaped for the Mando
 * vertical (and reusable by any other vertical).
 *
 * SIS never depends on the vision/Mando module — this adapter only *reads* and
 * reshapes SIS's own data. It is exported so a vertical can inject it directly
 * (DI) instead of, or in addition to, calling the HTTP endpoints. No business
 * logic of the political vertical lives here.
 */
@Injectable()
export class MandoAdapterService {
  constructor(
    private readonly db: DatabaseService,
    private readonly analytics: AnalyticsService,
    private readonly trends: TrendsService,
  ) {}

  private shapeAlert(a: {
    id: string;
    type: string;
    severity: string;
    title: string;
    description: string | null;
    status: string;
    contentItemId: string | null;
    createdAt: Date;
  }) {
    return {
      id: a.id,
      type: a.type,
      severity: a.severity,
      title: a.title,
      description: a.description ?? undefined,
      status: a.status,
      contentItemId: a.contentItemId ?? undefined,
      createdAt: a.createdAt,
    };
  }

  /** Open HIGH/CRITICAL alerts — the "incidents" surfaced to Mando. */
  async incidents(tenantId: string, limit = 20) {
    const rows = await this.db.mysql.socialAlert.findMany({
      where: {
        tenantId,
        status: 'OPEN',
        severity: { in: ['HIGH', 'CRITICAL'] },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });
    return rows.map((r) => this.shapeAlert(r));
  }

  /** All open alerts (any severity). */
  async alerts(tenantId: string, limit = 50) {
    const rows = await this.db.mysql.socialAlert.findMany({
      where: { tenantId, status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });
    return rows.map((r) => this.shapeAlert(r));
  }

  async topics(tenantId: string, windowDays = 30) {
    const [top, rising] = await Promise.all([
      this.analytics.topics(tenantId, { windowDays, limit: 15 }),
      this.trends.computeTrends(tenantId, Math.min(windowDays, 14)),
    ]);
    return { top, rising: rising.slice(0, 10) };
  }

  async recommendations(tenantId: string, windowDays = 30, limit = 20) {
    const rows = await this.analytics.recommendations(tenantId, {
      windowDays,
      limit,
    });
    // Flatten to a simple, consumer-friendly list.
    return rows.flatMap((r) =>
      r.recommendations.map((text) => ({
        contentItemId: r.contentItemId,
        recommendation: text,
        at: r.analyzedAt,
      })),
    );
  }

  /** One-call snapshot for a Mando dashboard/vertical view. */
  async briefing(tenantId: string, windowDays = 30) {
    const [summary, incidents, topics, recommendations] = await Promise.all([
      this.analytics.overview(tenantId, { windowDays }),
      this.incidents(tenantId),
      this.topics(tenantId, windowDays),
      this.recommendations(tenantId, windowDays, 10),
    ]);
    return {
      generatedFor: 'mando',
      windowDays,
      summary,
      incidents,
      topics,
      recommendations,
    };
  }
}
