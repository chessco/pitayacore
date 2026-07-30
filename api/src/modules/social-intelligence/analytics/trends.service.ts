import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../../common/database/database.service';
import {
  SisEventBus,
  SIS_EVENTS,
  TrendDetectedEvent,
} from '../events/social-intelligence.events';
import { errMessage } from '../util/errors';

export interface TrendPoint {
  topic: string;
  current: number;
  previous: number;
  /** current − previous; higher = rising faster. */
  score: number;
}

/**
 * Detects rising topics by comparing a topic's frequency in the current window
 * against the immediately-preceding window of equal length. Exposes on-demand
 * computation for the analytics API and emits TREND_DETECTED on a schedule.
 */
@Injectable()
export class TrendsService {
  private readonly logger = new Logger(TrendsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly bus: SisEventBus,
    private readonly config: ConfigService,
  ) {}

  private countTopics(rows: Array<{ topics: unknown }>): Map<string, number> {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const list = Array.isArray(row.topics)
        ? (row.topics as unknown as string[])
        : [];
      for (const topic of list) {
        if (topic) counts.set(topic, (counts.get(topic) ?? 0) + 1);
      }
    }
    return counts;
  }

  async computeTrends(tenantId: string, windowDays = 7): Promise<TrendPoint[]> {
    const days = windowDays > 0 ? windowDays : 7;
    const now = Date.now();
    const windowMs = days * 24 * 60 * 60 * 1000;
    const currentSince = new Date(now - windowMs);
    const prevSince = new Date(now - 2 * windowMs);

    const [currentRows, prevRows] = await Promise.all([
      this.db.mysql.socialContentAnalysis.findMany({
        where: { tenantId, analyzedAt: { gte: currentSince } },
        select: { topics: true },
        take: 5000,
      }),
      this.db.mysql.socialContentAnalysis.findMany({
        where: { tenantId, analyzedAt: { gte: prevSince, lt: currentSince } },
        select: { topics: true },
        take: 5000,
      }),
    ]);

    const current = this.countTopics(currentRows);
    const previous = this.countTopics(prevRows);

    return [...current.entries()]
      .map(([topic, count]) => ({
        topic,
        current: count,
        previous: previous.get(topic) ?? 0,
        score: count - (previous.get(topic) ?? 0),
      }))
      .filter((t) => t.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  private get minScore(): number {
    const raw = this.config.get<string>('SIS_TREND_MIN_SCORE');
    const parsed = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : 3;
  }

  /** Every 3 hours: emit TREND_DETECTED for rising topics per tenant. */
  @Cron('0 0 */3 * * *')
  async detectTrends(): Promise<void> {
    const tenants = await this.db.mysql.socialContentAnalysis.findMany({
      distinct: ['tenantId'],
      select: { tenantId: true },
    });
    for (const { tenantId } of tenants) {
      try {
        const trends = await this.computeTrends(tenantId);
        for (const trend of trends) {
          if (trend.score >= this.minScore) {
            this.bus.publish(
              SIS_EVENTS.TREND_DETECTED,
              new TrendDetectedEvent(tenantId, trend.topic, trend.score),
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Trend detection failed for tenant ${tenantId}: ${errMessage(error)}`,
        );
      }
    }
  }
}
