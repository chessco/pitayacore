import {
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, type SocialConnectorAccount } from '@prisma/mysql-client';
import { DatabaseService } from '../../../common/database/database.service';
import { ConnectorRegistry } from '../connectors/connector-registry.service';
import { SocialConnectorContext } from '../connectors/social-connector.interface';
import { NormalizerService } from '../normalizer/normalizer.service';
import { TokenCryptoService } from '../crypto/token-crypto.service';
import { NormalizedContent } from '../dto/normalized-content';
import {
  SisEventBus,
  SIS_EVENTS,
  SocialContentCollectedEvent,
} from '../events/social-intelligence.events';
import { errMessage } from '../util/errors';

export interface CollectionResult {
  connectorId: string;
  fetched: number;
  created: number;
}

/**
 * Orchestrates a collection run: load account → decrypt token → delegate to the
 * connector → normalize → idempotently persist → emit domain events. Connectors
 * are side-effect-free; persistence and eventing live here.
 */
@Injectable()
export class CollectorService {
  private readonly logger = new Logger(CollectorService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly registry: ConnectorRegistry,
    private readonly normalizer: NormalizerService,
    private readonly crypto: TokenCryptoService,
    private readonly bus: SisEventBus,
  ) {}

  private buildContext(
    account: SocialConnectorAccount,
  ): SocialConnectorContext {
    return {
      tenantId: account.tenantId,
      accessToken: this.crypto.decrypt(account.accessToken),
      externalAccountId: account.externalAccountId,
      options: (account.metadata as Record<string, any>) ?? undefined,
    };
  }

  /** Collect for a single account owned by the given tenant (manual trigger). */
  async collectForConnector(
    tenantId: string,
    connectorId: string,
  ): Promise<CollectionResult> {
    const account = await this.db.mysql.socialConnectorAccount.findFirst({
      where: { id: connectorId, tenantId },
    });
    if (!account) throw new NotFoundException('Connector account not found');
    return this.runCollection(account);
  }

  /** Validate that an account's credentials work against the provider. */
  async verifyConnector(
    tenantId: string,
    connectorId: string,
  ): Promise<{ ok: boolean }> {
    const account = await this.db.mysql.socialConnectorAccount.findFirst({
      where: { id: connectorId, tenantId },
    });
    if (!account) throw new NotFoundException('Connector account not found');
    const connector = this.registry.get(account.provider);
    const ok = await connector.verify(this.buildContext(account));
    return { ok };
  }

  private async runCollection(
    account: SocialConnectorAccount,
  ): Promise<CollectionResult> {
    const connector = this.registry.get(account.provider);
    let raw: NormalizedContent[];
    try {
      raw = await connector.collect(this.buildContext(account), {
        since: account.lastSyncAt ?? undefined,
      });
    } catch (error) {
      const message = errMessage(error).slice(0, 500);
      await this.db.mysql.socialConnectorAccount.update({
        where: { id: account.id },
        data: { status: 'ERROR', lastError: message },
      });
      this.logger.error(
        `Collection failed for connector ${account.id}: ${message}`,
      );
      throw new BadGatewayException(`Provider collection failed: ${message}`);
    }

    const normalized = this.normalizer.normalize(raw);
    let created = 0;
    for (const item of normalized) {
      const isNew = await this.persistItem(account, item);
      if (isNew) created += 1;
    }

    await this.db.mysql.socialConnectorAccount.update({
      where: { id: account.id },
      data: { status: 'ACTIVE', lastError: null, lastSyncAt: new Date() },
    });

    this.logger.log(
      `Connector ${account.id}: fetched ${normalized.length}, created ${created}`,
    );
    return { connectorId: account.id, fetched: normalized.length, created };
  }

  /** Idempotent insert keyed on (tenantId, source, externalId). Returns true if a new row was created. */
  private async persistItem(
    account: SocialConnectorAccount,
    item: NormalizedContent,
  ): Promise<boolean> {
    const existing = await this.db.mysql.socialContentItem.findUnique({
      where: {
        tenantId_source_externalId: {
          tenantId: account.tenantId,
          source: item.source,
          externalId: item.externalId,
        },
      },
      select: { id: true },
    });
    if (existing) return false;

    const saved = await this.db.mysql.socialContentItem.create({
      data: {
        tenantId: account.tenantId,
        connectorAccountId: account.id,
        source: item.source,
        type: item.type,
        externalId: item.externalId,
        authorId: item.author?.id,
        author: item.author?.name,
        publishedAt: item.publishedAt ?? null,
        content: item.content,
        mediaUrls: item.media
          ? (item.media as unknown as Prisma.InputJsonValue)
          : undefined,
        url: item.url,
        metadata: item.metadata
          ? (item.metadata as Prisma.InputJsonValue)
          : undefined,
      },
      select: { id: true },
    });

    this.bus.publish(
      SIS_EVENTS.CONTENT_COLLECTED,
      new SocialContentCollectedEvent(
        account.tenantId,
        saved.id,
        item.source,
        item.type,
      ),
    );
    return true;
  }

  /**
   * Periodic poll of every ACTIVE connector across all tenants. Failures are
   * isolated per account so one broken connector never blocks the others.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async pollActiveConnectors(): Promise<void> {
    const accounts = await this.db.mysql.socialConnectorAccount.findMany({
      where: { status: 'ACTIVE' },
    });
    if (!accounts.length) return;

    this.logger.log(`Polling ${accounts.length} active connector(s)`);
    for (const account of accounts) {
      try {
        await this.runCollection(account);
      } catch (error) {
        this.logger.warn(
          `Scheduled collection failed for ${account.id}: ${errMessage(error)}`,
        );
      }
    }
  }
}
