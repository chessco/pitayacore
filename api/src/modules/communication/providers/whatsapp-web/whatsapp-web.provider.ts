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
  private clients: Map<string, Client> = new Map(); // key = `${tenantId}:${channelId}`
  private readonly PROVIDER_NAME = 'whatsapp';

  constructor(
    private readonly sessionStorage: FilesystemSessionStorageProvider,
    private readonly eventBus: CommunicationEventBusService,
  ) {}

  async connect(tenantId: string, channelId: string): Promise<void> {
    const clientKey = `${tenantId}:${channelId}`;
    if (this.clients.has(clientKey)) {
      this.logger.warn(`Client for tenant ${tenantId}, channel ${channelId} is already connected or connecting.`);
      return;
    }

    const dataPath = this.sessionStorage.getSessionDataPath(tenantId, `${this.PROVIDER_NAME}_${channelId}`);
    
    this.logger.log(`Initializing WhatsApp Web client for tenant: ${tenantId}, channel: ${channelId} at ${dataPath}`);
    
    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: `channel_${channelId}`,
        dataPath: dataPath,
      }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      },
    });

    this.clients.set(clientKey, client);
    this.registerEvents(tenantId, channelId, client);

    try {
      await client.initialize();
      this.eventBus.publish(
        COMMUNICATION_EVENTS.SESSION_STATUS_CHANGED,
        new SessionStatusEvent(tenantId, this.PROVIDER_NAME, channelId, 'AUTHENTICATING')
      );
    } catch (error) {
      this.logger.error(`Failed to initialize WhatsApp client for ${tenantId}, channel ${channelId}`, error);
      this.clients.delete(clientKey);
      throw error;
    }
  }

  async disconnect(tenantId: string, channelId: string): Promise<void> {
    const clientKey = `${tenantId}:${channelId}`;
    const client = this.clients.get(clientKey);
    if (!client) {
      this.logger.warn(`No active client found for tenant: ${tenantId}, channel ${channelId}`);
      return;
    }

    try {
      await client.destroy();
      this.clients.delete(clientKey);
      this.logger.log(`Disconnected client for tenant: ${tenantId}, channel ${channelId}`);
      
      this.eventBus.publish(
        COMMUNICATION_EVENTS.SESSION_STATUS_CHANGED,
        new SessionStatusEvent(tenantId, this.PROVIDER_NAME, channelId, 'DISCONNECTED')
      );
    } catch (error) {
      this.logger.error(`Error destroying client for tenant ${tenantId}, channel ${channelId}`, error);
    }
  }

  async sendMessage(tenantId: string, channelId: string, to: string, content: string): Promise<any> {
    const clientKey = `${tenantId}:${channelId}`;
    const client = this.clients.get(clientKey);
    if (!client) {
      throw new Error(`No active WhatsApp client for tenant ${tenantId}, channel ${channelId}`);
    }

    try {
      // Ensure the 'to' number has the correct format (e.g. appending @c.us)
      const formattedTo = to.includes('@c.us') || to.includes('@g.us') ? to : `${to}@c.us`;
      const message = await client.sendMessage(formattedTo, content);
      
      this.logger.debug(`Message sent to ${formattedTo} for tenant ${tenantId}, channel ${channelId}`);
      
      // Optionally publish a MESSAGE_SENT event here
      
      return message;
    } catch (error) {
      this.logger.error(`Failed to send message for tenant ${tenantId}, channel ${channelId}`, error);
      throw error;
    }
  }

  private registerEvents(tenantId: string, channelId: string, client: Client) {
    client.on('qr', (qr) => {
      this.logger.log(`QR Code generated for tenant ${tenantId}, channel ${channelId}`);
      // Print to terminal for local debugging (optional)
      qrcode.generate(qr, { small: true });

      this.eventBus.publish(
        COMMUNICATION_EVENTS.QR_CODE_GENERATED,
        new SessionStatusEvent(tenantId, this.PROVIDER_NAME, channelId, 'QR_READY', { qr })
      );
    });

    client.on('ready', () => {
      this.logger.log(`WhatsApp client is ready for tenant ${tenantId}, channel ${channelId}`);
      this.eventBus.publish(
        COMMUNICATION_EVENTS.SESSION_STATUS_CHANGED,
        new SessionStatusEvent(tenantId, this.PROVIDER_NAME, channelId, 'READY')
      );
    });

    client.on('authenticated', () => {
      this.logger.log(`WhatsApp client authenticated for tenant ${tenantId}, channel ${channelId}`);
    });

    client.on('auth_failure', (msg) => {
      this.logger.error(`WhatsApp authentication failed for tenant ${tenantId}, channel ${channelId}: ${msg}`);
      this.eventBus.publish(
        COMMUNICATION_EVENTS.SESSION_STATUS_CHANGED,
        new SessionStatusEvent(tenantId, this.PROVIDER_NAME, channelId, 'DISCONNECTED', { error: msg })
      );
    });

    client.on('disconnected', (reason) => {
      const clientKey = `${tenantId}:${channelId}`;
      this.logger.warn(`WhatsApp client disconnected for tenant ${tenantId}, channel ${channelId}: ${reason}`);
      this.clients.delete(clientKey);
      this.eventBus.publish(
        COMMUNICATION_EVENTS.SESSION_STATUS_CHANGED,
        new SessionStatusEvent(tenantId, this.PROVIDER_NAME, channelId, 'DISCONNECTED', { reason })
      );
    });

    client.on('message', async (message: Message) => {
      this.logger.debug(`Received message for tenant ${tenantId}, channel ${channelId} from ${message.from}`);
      
      this.eventBus.publish(
        COMMUNICATION_EVENTS.MESSAGE_RECEIVED,
        new MessageReceivedEvent(
          tenantId,
          this.PROVIDER_NAME,
          channelId,
          message.from,
          message.body,
          message
        )
      );
    });
  }

  async onModuleDestroy() {
    this.logger.log('Destroying all WhatsApp Web clients on module destroy...');
    for (const [clientKey, client] of this.clients.entries()) {
      try {
        await client.destroy();
        this.logger.debug(`Destroyed client ${clientKey}`);
      } catch (error) {
        this.logger.error(`Failed to destroy client ${clientKey}`, error);
      }
    }
    this.clients.clear();
  }
}