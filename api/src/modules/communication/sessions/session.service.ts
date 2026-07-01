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
   * Initializes or gets the session for the given tenant and provider.
   */
  async initializeSession(tenantId: string, provider: string): Promise<any> {
    this.logger.log(`Initializing session for tenant ${tenantId}, provider ${provider}`);
    
    // UPSERT session in DB
    let session = await this.db.mysql.communicationSession.findFirst({
      where: { tenantId, provider },
    });

    if (!session) {
      session = await this.db.mysql.communicationSession.create({
        data: {
          tenantId,
          provider,
          status: 'INITIALIZING',
        },
      });
    }

    if (provider === 'whatsapp') {
      // Background init, not blocking the request
      this.whatsappProvider.connect(tenantId).catch(err => {
        this.logger.error(`Failed to connect whatsapp for tenant ${tenantId}`, err);
      });
    }

    return session;
  }

  /**
   * Disconnects the session for a specific tenant and provider.
   */
  async disconnectSession(tenantId: string, provider: string): Promise<void> {
    this.logger.log(`Disconnecting session for tenant ${tenantId}, provider ${provider}`);
    
    if (provider === 'whatsapp') {
      await this.whatsappProvider.disconnect(tenantId);
    }

    await this.db.mysql.communicationSession.updateMany({
      where: { tenantId, provider },
      data: { status: 'DISCONNECTED' },
    });
  }

  async getSessionStatus(tenantId: string, provider: string) {
    const session = await this.db.mysql.communicationSession.findFirst({
      where: { tenantId, provider },
    });
    return session;
  }
}