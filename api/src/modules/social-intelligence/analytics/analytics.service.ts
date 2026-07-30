import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';

/** Max analysis rows loaded for in-memory (JSON) aggregation. */
const MAX_ANALYSIS_SCAN = 2000;

export interface AnalyticsWindow {
  /** Look-back window in days (default 30). */
  windowDays?: number;
  limit?: number;
}

/**
 * Read-only aggregations over collected content, analyses and alerts. Scalar
 * fields use Prisma `groupBy`; JSON fields (topics, entities, recommendations)
 * are aggregated in memory over a bounded recent slice (documented cap).
 * Feeds the Sentinel AI dashboard (PR6) and the Mando adapter (PR7).
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly db: DatabaseService) {}

  private since(windowDays?: number): Date {
    const days = windowDays && windowDays > 0 ? windowDays : 30;
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  private async loadAnalyses(tenantId: string, since: Date) {
    return this.db.mysql.socialContentAnalysis.findMany({
      where: { tenantId, analyzedAt: { gte: since } },
      select: {
        topics: true,
        entities: true,
        recommendations: true,
        sentiment: true,
        riskLevel: true,
        contentItemId: true,
        analyzedAt: true,
      },
      orderBy: { analyzedAt: 'desc' },
      take: MAX_ANALYSIS_SCAN,
    });
  }

  async activityBySource(tenantId: string, opts: AnalyticsWindow = {}) {
    const grouped = await this.db.mysql.socialContentItem.groupBy({
      by: ['source'],
      where: { tenantId, collectedAt: { gte: this.since(opts.windowDays) } },
      _count: { _all: true },
    });
    return grouped
      .map((g) => ({ source: g.source, count: g._count._all }))
      .sort((a, b) => b.count - a.count);
  }

  async sentiment(tenantId: string, opts: AnalyticsWindow = {}) {
    const grouped = await this.db.mysql.socialContentAnalysis.groupBy({
      by: ['sentiment'],
      where: { tenantId, analyzedAt: { gte: this.since(opts.windowDays) } },
      _count: { _all: true },
    });
    const distribution: Record<string, number> = {
      POSITIVE: 0,
      NEGATIVE: 0,
      NEUTRAL: 0,
      MIXED: 0,
    };
    for (const g of grouped) {
      if (g.sentiment) distribution[g.sentiment] = g._count._all;
    }
    return distribution;
  }

  async alertsSummary(tenantId: string) {
    const [bySeverity, byStatus] = await Promise.all([
      this.db.mysql.socialAlert.groupBy({
        by: ['severity'],
        where: { tenantId },
        _count: { _all: true },
      }),
      this.db.mysql.socialAlert.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { _all: true },
      }),
    ]);
    return {
      bySeverity: bySeverity.map((g) => ({
        severity: g.severity,
        count: g._count._all,
      })),
      byStatus: byStatus.map((g) => ({
        status: g.status,
        count: g._count._all,
      })),
    };
  }

  async topics(tenantId: string, opts: AnalyticsWindow = {}) {
    const analyses = await this.loadAnalyses(
      tenantId,
      this.since(opts.windowDays),
    );
    const counts = new Map<string, number>();
    for (const a of analyses) {
      const list = Array.isArray(a.topics)
        ? (a.topics as unknown as string[])
        : [];
      for (const topic of list) {
        if (topic) counts.set(topic, (counts.get(topic) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, opts.limit ?? 20);
  }

  async recommendations(tenantId: string, opts: AnalyticsWindow = {}) {
    const analyses = await this.loadAnalyses(
      tenantId,
      this.since(opts.windowDays),
    );
    const out: Array<{
      contentItemId: string;
      recommendations: string[];
      analyzedAt: Date;
    }> = [];
    for (const a of analyses) {
      const recs = Array.isArray(a.recommendations)
        ? (a.recommendations as unknown as string[])
        : [];
      if (recs.length) {
        out.push({
          contentItemId: a.contentItemId,
          recommendations: recs,
          analyzedAt: a.analyzedAt,
        });
      }
      if (out.length >= (opts.limit ?? 50)) break;
    }
    return out;
  }

  async overview(tenantId: string, opts: AnalyticsWindow = {}) {
    const since = this.since(opts.windowDays);
    const [totalItems, analyzed, pending, openAlerts] = await Promise.all([
      this.db.mysql.socialContentItem.count({
        where: { tenantId, collectedAt: { gte: since } },
      }),
      this.db.mysql.socialContentItem.count({
        where: {
          tenantId,
          analysisStatus: 'ANALYZED',
          collectedAt: { gte: since },
        },
      }),
      this.db.mysql.socialContentItem.count({
        where: { tenantId, analysisStatus: 'PENDING' },
      }),
      this.db.mysql.socialAlert.count({
        where: { tenantId, status: 'OPEN' },
      }),
    ]);
    const [sentiment, activity, topics, alerts] = await Promise.all([
      this.sentiment(tenantId, opts),
      this.activityBySource(tenantId, opts),
      this.topics(tenantId, { ...opts, limit: 5 }),
      this.alertsSummary(tenantId),
    ]);
    return {
      windowDays: opts.windowDays ?? 30,
      items: { total: totalItems, analyzed, pending },
      openAlerts,
      sentiment,
      activityBySource: activity,
      topTopics: topics,
      alerts,
    };
  }
}
