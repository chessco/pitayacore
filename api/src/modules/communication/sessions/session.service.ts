import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';
import { WhatsappWebProvider } from '../providers/whatsapp-web/whatsapp-web.provider';

@Injectable()
export class SessionService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly whatsappProvider: WhatsappWebProvider,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log(
      'Bootstrapping SessionService: reconnecting active channels...',
    );
    try {
      // Reset transient statuses (e.g. QR_READY, AUTHENTICATING) back to DISCONNECTED on restart
      await this.db.mysql.channel.updateMany({
        where: {
          provider: 'whatsapp',
          status: { notIn: ['ACTIVE', 'READY', 'DISCONNECTED'] },
        },
        data: { status: 'DISCONNECTED' },
      });

      const channels = await this.db.mysql.channel.findMany({
        where: {
          provider: 'whatsapp',
          status: { in: ['ACTIVE', 'READY'] },
        },
      });
      for (const channel of channels) {
        this.logger.log(
          `Auto-connecting whatsapp for tenant ${channel.tenantId}, channel ${channel.id}`,
        );
        await this.initializeSession(channel.tenantId, channel.id);
      }
    } catch (err) {
      this.logger.error(
        'Failed to auto-connect channels during bootstrap',
        err,
      );
    }
  }

  /**
   * Initializes or gets the session for the given tenant and channel.
   */
  async initializeSession(tenantId: string, channelId: string): Promise<any> {
    this.logger.log(
      `Initializing session for tenant ${tenantId}, channel ${channelId}`,
    );

    // UPSERT session in DB using sessionIdentifier as channelId
    let session = await this.db.mysql.communicationSession.findFirst({
      where: { tenantId, sessionIdentifier: channelId },
    });

    if (!session) {
      session = await this.db.mysql.communicationSession.create({
        data: {
          tenantId,
          provider: 'whatsapp', // Defaulting for now, we should fetch channel to get exact provider
          sessionIdentifier: channelId,
          status: 'INITIALIZING',
        },
      });
    }

    // Always trigger connect with channelId
    this.whatsappProvider.connect(tenantId, channelId).catch((err) => {
      this.logger.error(
        `Failed to connect whatsapp for tenant ${tenantId} on channel ${channelId}`,
        err,
      );
    });

    return session;
  }

  /**
   * Disconnects the session for a specific tenant and channel.
   */
  async disconnectSession(tenantId: string, channelId: string): Promise<void> {
    this.logger.log(
      `Disconnecting session for tenant ${tenantId}, channel ${channelId}`,
    );

    await this.whatsappProvider.disconnect(tenantId, channelId);

    await this.db.mysql.communicationSession.updateMany({
      where: { tenantId, sessionIdentifier: channelId },
      data: { status: 'DISCONNECTED' },
    });
  }

  async getSessionStatus(tenantId: string, channelId: string) {
    const session = await this.db.mysql.communicationSession.findFirst({
      where: { tenantId, sessionIdentifier: channelId },
    });
    return session;
  }
}
