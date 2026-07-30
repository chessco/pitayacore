import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  Prisma,
  type SocialAlertRule,
  type SocialContentItem,
} from '@prisma/mysql-client';
import { DatabaseService } from '../../../../common/database/database.service';
import {
  SisEventBus,
  SIS_EVENTS,
  SocialAlertGeneratedEvent,
  SocialContentAnalyzedEvent,
} from '../../events/social-intelligence.events';
import { errMessage } from '../../util/errors';
import {
  AlertRuleType,
  DEFAULT_SEVERITY,
  Severity,
  findEmergingTopics,
  matchCommentVolume,
  matchKeywords,
  matchNegativeSentiment,
} from './alert-matchers';

const PER_ITEM_TYPES: AlertRuleType[] = [
  'CRITICAL_KEYWORDS',
  'NEGATIVE_SENTIMENT',
  'COMMENT_VOLUME',
];
const WINDOWED_TYPES: AlertRuleType[] = ['MENTION_SPIKE', 'EMERGING_TOPIC'];

/**
 * Configurable alert engine.
 *
 * Per-item rules evaluate reactively when an item is analyzed (subscribed to the
 * CONTENT_ANALYZED event). Windowed rules evaluate on a schedule across tenants.
 * Every generated alert emits ALERT_GENERATED on the SIS event bus. Alerts are
 * de-duplicated so the same condition doesn't spam.
 */
@Injectable()
export class AlertEngineService implements OnModuleInit {
  private readonly logger = new Logger(AlertEngineService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly bus: SisEventBus,
  ) {}

  onModuleInit(): void {
    this.bus.on<SocialContentAnalyzedEvent>(
      SIS_EVENTS.CONTENT_ANALYZED,
      (event) => {
        this.evaluatePerItem(event.tenantId, event.contentItemId).catch(
          (error) =>
            this.logger.error(
              `Per-item alert eval failed for ${event.contentItemId}: ${errMessage(error)}`,
            ),
        );
      },
    );
  }

  private params(rule: SocialAlertRule): Record<string, unknown> {
    const p = rule.params;
    return p && typeof p === 'object' && !Array.isArray(p) ? p : {};
  }

  // ---- Per-item evaluation -------------------------------------------------

  async evaluatePerItem(
    tenantId: string,
    contentItemId: string,
  ): Promise<void> {
    const rules = await this.db.mysql.socialAlertRule.findMany({
      where: { tenantId, enabled: true, type: { in: PER_ITEM_TYPES } },
    });
    if (!rules.length) return;

    const item = await this.db.mysql.socialContentItem.findFirst({
      where: { id: contentItemId, tenantId },
    });
    if (!item) return;
    const analysis = await this.db.mysql.socialContentAnalysis.findUnique({
      where: { contentItemId },
    });

    for (const rule of rules) {
      const p = this.params(rule);
      if (rule.type === 'CRITICAL_KEYWORDS') {
        const keywords = (p.keywords as string[]) ?? [];
        const text = `${item.content}\n${analysis?.summary ?? ''}`;
        const hits = matchKeywords(text, keywords);
        if (hits.length) {
          await this.raiseItemAlert(
            rule,
            item.id,
            `Palabras críticas detectadas: ${hits.join(', ')}`,
            { keywords: hits },
          );
        }
      } else if (rule.type === 'NEGATIVE_SENTIMENT') {
        const threshold = p.scoreThreshold as number | undefined;
        if (
          matchNegativeSentiment(
            analysis?.sentiment,
            analysis?.sentimentScore,
            threshold,
          )
        ) {
          await this.raiseItemAlert(
            rule,
            item.id,
            'Sentimiento negativo detectado',
            {
              sentiment: analysis?.sentiment,
              score: analysis?.sentimentScore,
            },
          );
        }
      } else if (rule.type === 'COMMENT_VOLUME') {
        const count = this.readCommentCount(item);
        const threshold = (p.threshold as number) ?? 0;
        if (matchCommentVolume(count, threshold)) {
          await this.raiseItemAlert(
            rule,
            item.id,
            `Alto volumen de comentarios (${count})`,
            { commentCount: count },
          );
        }
      }
    }
  }

  private readCommentCount(item: SocialContentItem): number | null {
    const meta = item.metadata as unknown as { comments?: number } | null;
    const c = meta?.comments;
    return typeof c === 'number' ? c : null;
  }

  private async raiseItemAlert(
    rule: SocialAlertRule,
    contentItemId: string,
    title: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const existing = await this.db.mysql.socialAlert.findFirst({
      where: { tenantId: rule.tenantId, ruleId: rule.id, contentItemId },
      select: { id: true },
    });
    if (existing) return; // one alert per (rule, item)
    await this.createAlert(rule, { title, contentItemId, metadata });
  }

  // ---- Windowed evaluation -------------------------------------------------

  /** Every 15 minutes: evaluate windowed rules for all tenants. */
  @Cron('0 */15 * * * *')
  async evaluateWindowed(): Promise<void> {
    const rules = await this.db.mysql.socialAlertRule.findMany({
      where: { enabled: true, type: { in: WINDOWED_TYPES } },
    });
    for (const rule of rules) {
      try {
        await this.evaluateWindowedRule(rule);
      } catch (error) {
        this.logger.warn(
          `Windowed alert eval failed for rule ${rule.id}: ${errMessage(error)}`,
        );
      }
    }
  }

  private async evaluateWindowedRule(rule: SocialAlertRule): Promise<void> {
    const p = this.params(rule);
    const windowMinutes = (p.windowMinutes as number) ?? 60;
    const threshold = (p.threshold as number) ?? 10;
    const since = new Date(Date.now() - windowMinutes * 60_000);

    if (rule.type === 'MENTION_SPIKE') {
      const source = p.source as string | undefined;
      const count = await this.db.mysql.socialContentItem.count({
        where: {
          tenantId: rule.tenantId,
          collectedAt: { gte: since },
          ...(source ? { source } : {}),
        },
      });
      if (count >= threshold) {
        await this.raiseWindowedAlert(
          rule,
          since,
          `Incremento anormal de menciones: ${count} en ${windowMinutes} min`,
          { count, windowMinutes },
        );
      }
    } else if (rule.type === 'EMERGING_TOPIC') {
      const analyses = await this.db.mysql.socialContentAnalysis.findMany({
        where: { tenantId: rule.tenantId, analyzedAt: { gte: since } },
        select: { topics: true },
      });
      const topicLists = analyses.map((a) =>
        Array.isArray(a.topics) ? (a.topics as unknown as string[]) : [],
      );
      for (const { topic, count } of findEmergingTopics(
        topicLists,
        threshold,
      )) {
        await this.raiseWindowedAlert(
          rule,
          since,
          `Tema emergente: ${topic} (${count} menciones en ${windowMinutes} min)`,
          { topic, count, windowMinutes },
          topic,
        );
      }
    }
  }

  /**
   * Create a windowed alert unless an equivalent one already exists in the
   * current window (dedup key = topic for EMERGING_TOPIC; one-per-window
   * otherwise).
   */
  private async raiseWindowedAlert(
    rule: SocialAlertRule,
    since: Date,
    title: string,
    metadata: Record<string, unknown>,
    dedupTopic?: string,
  ): Promise<void> {
    const recent = await this.db.mysql.socialAlert.findMany({
      where: {
        tenantId: rule.tenantId,
        ruleId: rule.id,
        createdAt: { gte: since },
      },
      select: { metadata: true },
    });
    const already = recent.some((a) => {
      if (!dedupTopic) return true;
      const m = a.metadata as unknown as { topic?: string } | null;
      return m?.topic === dedupTopic;
    });
    if (already) return;
    await this.createAlert(rule, { title, metadata });
  }

  // ---- Shared -------------------------------------------------------------

  private async createAlert(
    rule: SocialAlertRule,
    data: {
      title: string;
      description?: string;
      contentItemId?: string;
      metadata: Record<string, unknown>;
    },
  ): Promise<void> {
    const p = this.params(rule);
    const severity =
      (p.severity as Severity) ||
      DEFAULT_SEVERITY[rule.type as AlertRuleType] ||
      'MEDIUM';

    const alert = await this.db.mysql.socialAlert.create({
      data: {
        tenantId: rule.tenantId,
        ruleId: rule.id,
        type: rule.type,
        severity,
        title: data.title,
        description: data.description,
        contentItemId: data.contentItemId,
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    this.bus.publish(
      SIS_EVENTS.ALERT_GENERATED,
      new SocialAlertGeneratedEvent(
        rule.tenantId,
        alert.id,
        rule.type,
        severity,
      ),
    );
    this.logger.log(
      `Alert ${alert.id} (${rule.type}/${severity}) for tenant ${rule.tenantId}`,
    );
  }
}
