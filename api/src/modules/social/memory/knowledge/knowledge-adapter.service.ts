import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KnowledgeIngestionService } from '../../../knowledge-base/knowledge-ingestion.service';
import { DatabaseService } from '../../../../common/database/database.service';
import {
  SisEventBus,
  SIS_EVENTS,
  SocialContentAnalyzedEvent,
} from '../../events/social-intelligence.events';
import { errMessage } from '../../util/errors';

/**
 * Feeds analyzed social content into the Knowledge Suite, ONLY through its
 * public `KnowledgeIngestionService` — never writing KB tables directly.
 *
 * Auto-feed is opt-in by risk level (`SIS_KB_AUTOFEED_RISK`, default
 * `HIGH,CRITICAL`; set to `NONE` to disable). Manual ingestion is always
 * available via the controller.
 */
@Injectable()
export class KnowledgeAdapterService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeAdapterService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly ingestion: KnowledgeIngestionService,
    private readonly bus: SisEventBus,
    private readonly config: ConfigService,
  ) {}

  private get autoFeedRisks(): Set<string> {
    const raw =
      this.config.get<string>('SIS_KB_AUTOFEED_RISK') ?? 'HIGH,CRITICAL';
    return new Set(
      raw
        .split(',')
        .map((r) => r.trim().toUpperCase())
        .filter((r) => r && r !== 'NONE'),
    );
  }

  onModuleInit(): void {
    this.bus.on<SocialContentAnalyzedEvent>(
      SIS_EVENTS.CONTENT_ANALYZED,
      (event) => {
        const risks = this.autoFeedRisks;
        if (!event.riskLevel || !risks.has(event.riskLevel)) return;
        this.ingestItem(event.tenantId, event.contentItemId).catch((error) =>
          this.logger.warn(
            `KB auto-feed failed for ${event.contentItemId}: ${errMessage(error)}`,
          ),
        );
      },
    );
  }

  /** Ingest one analyzed item into the Knowledge Suite. Returns the KB result. */
  async ingestItem(tenantId: string, contentItemId: string) {
    const item = await this.db.mysql.socialContentItem.findFirst({
      where: { id: contentItemId, tenantId },
    });
    if (!item) throw new NotFoundException('Content item not found');
    const analysis = await this.db.mysql.socialContentAnalysis.findUnique({
      where: { contentItemId },
    });

    const topics = Array.isArray(analysis?.topics)
      ? (analysis?.topics as unknown as string[])
      : [];
    const entities = Array.isArray(analysis?.entities)
      ? (analysis?.entities as unknown as Array<{
          type: string;
          value: string;
        }>)
      : [];

    const lines: string[] = [];
    if (analysis?.summary) lines.push(`Resumen: ${analysis.summary}`);
    lines.push(`Fuente: ${item.source} (${item.type})`);
    if (item.author) lines.push(`Autor: ${item.author}`);
    if (item.url) lines.push(`URL: ${item.url}`);
    if (topics.length) lines.push(`Temas: ${topics.join(', ')}`);
    if (entities.length) {
      lines.push(
        `Entidades: ${entities.map((e) => `${e.value} (${e.type})`).join(', ')}`,
      );
    }
    if (analysis?.sentiment) lines.push(`Sentimiento: ${analysis.sentiment}`);
    if (analysis?.riskLevel) lines.push(`Riesgo: ${analysis.riskLevel}`);
    lines.push('', item.content);

    const titleBase = analysis?.summary || item.content || item.externalId;
    const title = `[Social ${item.source}] ${titleBase.slice(0, 80)}`;

    const result = await this.ingestion.ingestDocument(
      title,
      lines.join('\n'),
      tenantId,
    );
    this.logger.log(
      `Ingested item ${contentItemId} into KB ${result.kbId} (${result.chunkCount} chunks)`,
    );
    return result;
  }
}
