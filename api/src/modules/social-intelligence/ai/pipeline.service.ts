import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/mysql-client';
import { DatabaseService } from '../../../common/database/database.service';
import { AiService } from '../../ai/ai.service';
import { ContentAnalyzer } from './content-analyzer.service';
import {
  SisEventBus,
  SIS_EVENTS,
  SocialContentAnalyzedEvent,
  SocialContentCollectedEvent,
  TopicDetectedEvent,
  RecommendationGeneratedEvent,
} from '../events/social-intelligence.events';
import { errMessage } from '../util/errors';

/**
 * Post-collection AI pipeline. Subscribes to CONTENT_COLLECTED on the SIS event
 * bus and, for each new item, runs the 7-agent analysis, persists the result,
 * generates an embedding into the existing pgvector store, and emits
 * CONTENT_ANALYZED / TOPIC_DETECTED. Analysis is fully decoupled from
 * collection — a slow or failing analyzer never blocks the collector.
 */
@Injectable()
export class PipelineService implements OnModuleInit {
  private readonly logger = new Logger(PipelineService.name);
  private readonly model = 'gemini-2.5-flash';

  constructor(
    private readonly db: DatabaseService,
    private readonly bus: SisEventBus,
    private readonly analyzer: ContentAnalyzer,
    private readonly ai: AiService,
  ) {}

  onModuleInit(): void {
    this.bus.on<SocialContentCollectedEvent>(
      SIS_EVENTS.CONTENT_COLLECTED,
      (event) => {
        this.analyzeItem(event.tenantId, event.contentItemId).catch((error) =>
          this.logger.error(
            `Pipeline failed for ${event.contentItemId}: ${errMessage(error)}`,
          ),
        );
      },
    );
  }

  /** Analyze a single content item end-to-end. Safe to call again to re-process. */
  async analyzeItem(tenantId: string, contentItemId: string): Promise<void> {
    const item = await this.db.mysql.socialContentItem.findFirst({
      where: { id: contentItemId, tenantId },
    });
    if (!item) return;

    if (!item.content || !item.content.trim()) {
      await this.db.mysql.socialContentItem.update({
        where: { id: item.id },
        data: { analysisStatus: 'ANALYZED' },
      });
      return;
    }

    try {
      const result = await this.analyzer.analyze(item.content, {
        source: item.source,
        type: item.type,
      });

      await this.db.mysql.socialContentAnalysis.upsert({
        where: { contentItemId: item.id },
        create: {
          tenantId,
          contentItemId: item.id,
          language: result.language,
          summary: result.summary,
          sentiment: result.sentiment,
          sentimentScore: result.sentimentScore,
          topics: result.topics ?? [],
          entities: (result.entities ?? []) as unknown as Prisma.InputJsonValue,
          riskLevel: result.riskLevel,
          recommendations: result.recommendations ?? [],
          model: this.model,
        },
        update: {
          language: result.language,
          summary: result.summary,
          sentiment: result.sentiment,
          sentimentScore: result.sentimentScore,
          topics: result.topics ?? [],
          entities: (result.entities ?? []) as unknown as Prisma.InputJsonValue,
          riskLevel: result.riskLevel,
          recommendations: result.recommendations ?? [],
          model: this.model,
          analyzedAt: new Date(),
        },
      });

      // Best-effort embedding into the existing pgvector store. Never fatal.
      await this.embedContent(tenantId, item.id, item.content);

      await this.db.mysql.socialContentItem.update({
        where: { id: item.id },
        data: { analysisStatus: 'ANALYZED' },
      });

      this.bus.publish(
        SIS_EVENTS.CONTENT_ANALYZED,
        new SocialContentAnalyzedEvent(
          tenantId,
          item.id,
          result.sentiment,
          result.riskLevel,
          result.topics,
        ),
      );
      for (const topic of result.topics ?? []) {
        this.bus.publish(
          SIS_EVENTS.TOPIC_DETECTED,
          new TopicDetectedEvent(tenantId, topic, item.id),
        );
      }
      if (result.recommendations?.length) {
        this.bus.publish(
          SIS_EVENTS.RECOMMENDATION_GENERATED,
          new RecommendationGeneratedEvent(
            tenantId,
            item.id,
            result.recommendations,
          ),
        );
      }
    } catch (error) {
      await this.db.mysql.socialContentItem.update({
        where: { id: item.id },
        data: { analysisStatus: 'FAILED' },
      });
      this.logger.error(`Analysis failed for ${item.id}: ${errMessage(error)}`);
    }
  }

  /**
   * Store an embedding in the shared `VectorRecord` table (refType 'SOCIAL'),
   * reusing the configured AI provider — no duplicate vector infrastructure.
   * Mirrors the KnowledgeBase insert pattern but parameterized. Best-effort:
   * a failure here (e.g. vector dimension mismatch) is logged, not thrown.
   */
  private async embedContent(
    tenantId: string,
    refId: string,
    content: string,
  ): Promise<void> {
    try {
      const embedding = await this.ai.getEmbedding(content);
      if (!Array.isArray(embedding) || embedding.length === 0) return;
      await this.db.postgres.$executeRawUnsafe(
        `INSERT INTO "VectorRecord" ("id","tenantId","content","embedding","refId","refType")
         VALUES (gen_random_uuid(), $1, $2, $3::vector, $4, 'SOCIAL')`,
        tenantId,
        content.slice(0, 8000),
        `[${embedding.join(',')}]`,
        refId,
      );
    } catch (error) {
      this.logger.warn(`Embedding skipped for ${refId}: ${errMessage(error)}`);
    }
  }
}
