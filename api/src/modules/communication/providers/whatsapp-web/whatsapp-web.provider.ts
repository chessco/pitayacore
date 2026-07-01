import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { CommunicationProvider } from '../communication-provider.interface';
import { FilesystemSessionStorageProvider } from '../session-storage/filesystem-session-storage.provider';
import { CommunicationEventBusService } from '../../events/communication-event-bus.service';
import { COMMUNICATION_EVENTS, MessageReceivedEvent, SessionStatusEvent } from '../../events/communication.events';
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';

@Injectable()
export class WhatsappWebProvider implements CommunicationProvider, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappWebProvider.name);
  private clients: Map<string, Client> = new Map();
  private readonly PROVIDER_NAME = 'whatsapp';

  constructor(
    private readonly sessionStorage: FilesystemSessionStorageProvider,
    private readonly eventBus: CommunicationEventBusService,
  ) {}

  async connect(tenantId: string): Promise<void> {
    if (this.clients.has(tenantId)) {
      this.logger.warn(`Client for tenant ${tenantId} is already connected or connecting.`);
      return;
    }

    const dataPath = this.sessionStorage.getSessionDataPath(tenantId, this.PROVIDER_NAME);
    
    this.logger.log(`Initializing WhatsApp Web client for tenant: ${tenantId} at ${dataPath}`);
    
    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: `tenant_${tenantId}`,
        dataPath: dataPath,
      }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      },
    });

    this.clients.set(tenantId, client);
    this.registerEvents(tenantId, client);

    try {
      await client.initialize();
      this.eventBus.publish(
        COMMUNICATION_EVENTS.SESSION_STATUS_CHANGED,
        new SessionStatusEvent(tenantId, this.PROVIDER_NAME, 'AUTHENTICATING')
      );
    } catch (error) {
      this.logger.error(`Failed to initialize WhatsApp client for ${tenantId}`, error);
      this.clients.delete(tenantId);
      throw error;
    }
  }

  async disconnect(tenantId: string): Promise<void> {
    const client = this.clients.get(tenantId);
    if (!client) {
      this.logger.warn(`No active client found for tenant: ${tenantId}`);
      return;
    }

    try {
      await client.destroy();
      this.clients.delete(tenantId);
      this.logger.log(`Disconnected client for tenant: ${tenantId}`);
      
      this.eventBus.publish(
        COMMUNICATION_EVENTS.SESSION_STATUS_CHANGED,
        new SessionStatusEvent(tenantId, this.PROVIDER_NAME, 'DISCONNECTED')
      );
    } catch (error) {
      this.logger.error(`Error destroying client for tenant ${tenantId}`, error);
    }
  }

  async sendMessage(tenantId: string, to: string, content: string): Promise<any> {
    const client = this.clients.get(tenantId);
    if (!client) {
      throw new Error(`No active WhatsApp client for tenant ${tenantId}`);
    }

    try {
      // Ensure the 'to' number has the correct format (e.g. appending @c.us)
      const formattedTo = to.includes('@c.us') || to.includes('@g.us') ? to : `${to}@c.us`;
      const message = await client.sendMessage(formattedTo, content);
      
      this.logger.debug(`Message sent to ${formattedTo} for tenant ${tenantId}`);
      
      // Optionally publish a MESSAGE_SENT event here
      
      return message;
    } catch (error) {
      this.logger.error(`Failed to send message for tenant ${tenantId}`, error);
      throw error;
    }
  }

  private registerEvents(tenantId: string, client: Client) {
    client.on('qr', (qr) => {
      this.logger.log(`QR Code generated for tenant ${tenantId}`);
      // Print to terminal for local debugging (optional)
      qrcode.generate(qr, { small: true });

      this.eventBus.publish(
        COMMUNICATION_EVENTS.QR_CODE_GENERATED,
        new SessionStatusEvent(tenantId, this.PROVIDER_NAME, 'QR_READY', { qr })
      );
    });

    client.on('ready', () => {
      this.logger.log(`WhatsApp client is ready for tenant ${tenantId}`);
      this.eventBus.publish(
        COMMUNICATION_EVENTS.SESSION_STATUS_CHANGED,
        new SessionStatusEvent(tenantId, this.PROVIDER_NAME, 'READY')
      );
    });

    client.on('authenticated', () => {
      this.logger.log(`WhatsApp client authenticated for tenant ${tenantId}`);
    });

    client.on('auth_failure', (msg) => {
      this.logger.error(`WhatsApp authentication failed for tenant ${tenantId}: ${msg}`);
      this.eventBus.publish(
        COMMUNICATION_EVENTS.SESSION_STATUS_CHANGED,
        new SessionStatusEvent(tenantId, this.PROVIDER_NAME, 'DISCONNECTED', { error: msg })
      );
    });

    client.on('disconnected', (reason) => {
      this.logger.warn(`WhatsApp client disconnected for tenant ${tenantId}: ${reason}`);
      this.clients.delete(tenantId);
      this.eventBus.publish(
        COMMUNICATION_EVENTS.SESSION_STATUS_CHANGED,
        new SessionStatusEvent(tenantId, this.PROVIDER_NAME, 'DISCONNECTED', { reason })
      );
    });

    client.on('message', async (message: Message) => {
      this.logger.debug(`Received message for tenant ${tenantId} from ${message.from}`);
      
      this.eventBus.publish(
        COMMUNICATION_EVENTS.MESSAGE_RECEIVED,
        new MessageReceivedEvent(
          tenantId,
          this.PROVIDER_NAME,
          message.from,
          message.body,
          message
        )
      );
    });
  }

  async onModuleDestroy() {
    this.logger.log('Destroying all WhatsApp Web clients on module destroy...');
    for (const [tenantId, client] of this.clients.entries()) {
      try {
        await client.destroy();
        this.logger.debug(`Destroyed client for tenant ${tenantId}`);
      } catch (error) {
        this.logger.error(`Failed to destroy client for ${tenantId}`, error);
      }
    }
    this.clients.clear();
  }
}