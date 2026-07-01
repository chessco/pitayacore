import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';
import { WhatsappWebProvider } from '../providers/whatsapp-web/whatsapp-web.provider';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly whatsappProvider: WhatsappWebProvider,
  ) {}

  /**
   * Initializes or gets the session for the given tenant and channel.
   */
  async initializeSession(tenantId: string, channelId: string): Promise<any> {
    this.logger.log(`Initializing session for tenant ${tenantId}, channel ${channelId}`);
    
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
    this.whatsappProvider.connect(tenantId, channelId).catch(err => {
      this.logger.error(`Failed to connect whatsapp for tenant ${tenantId} on channel ${channelId}`, err);
    });

    return session;
  }

  /**
   * Disconnects the session for a specific tenant and channel.
   */
  async disconnectSession(tenantId: string, channelId: string): Promise<void> {
    this.logger.log(`Disconnecting session for tenant ${tenantId}, channel ${channelId}`);
    
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