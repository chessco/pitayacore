import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { CommunicationProvider } from '../communication-provider.interface';
import { FilesystemSessionStorageProvider } from '../session-storage/filesystem-session-storage.provider';
import { CommunicationEventBusService } from '../../events/communication-event-bus.service';
import {
  COMMUNICATION_EVENTS,
  MessageReceivedEvent,
  SessionStatusEvent,
} from '../../events/communication.events';
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class WhatsappWebProvider
  implements CommunicationProvider, OnModuleDestroy
{
  private readonly logger = new Logger(WhatsappWebProvider.name);
  private clients: Map<string, Client> = new Map(); // key = `${tenantId}:${channelId}`
  private clientStatuses: Map<string, string> = new Map(); // key = `${tenantId}:${channelId}` → status
  private readonly PROVIDER_NAME = 'whatsapp';

  constructor(
    private readonly sessionStorage: FilesystemSessionStorageProvider,
    private readonly eventBus: CommunicationEventBusService,
  ) {}

  async connect(tenantId: string, channelId: string): Promise<void> {
    const clientKey = `${tenantId}:${channelId}`;
    if (this.clients.has(clientKey)) {
      this.logger.warn(
        `Client for tenant ${tenantId}, channel ${channelId} is already connected or connecting.`,
      );
      const currentStatus = this.clientStatuses.get(clientKey);
      if (currentStatus) {
        this.eventBus.publish(
          COMMUNICATION_EVENTS.SESSION_STATUS_CHANGED,
          new SessionStatusEvent(
            tenantId,
            this.PROVIDER_NAME,
            channelId,
            currentStatus as any,
          ),
        );
      }
      return;
    }

    const dataPath = this.sessionStorage.getSessionDataPath(
      tenantId,
      `${this.PROVIDER_NAME}_${channelId}`,
    );

    // Clean up Chromium singleton locks left from previous containers/crashes
    const lockPath = path.join(
      dataPath,
      `session-channel_${channelId}`,
      'SingletonLock',
    );
    try {
      fs.unlinkSync(lockPath);
      this.logger.log(`Removed Chromium SingletonLock at ${lockPath}`);
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        this.logger.warn(
          `Failed to remove Chromium SingletonLock at ${lockPath}: ${err.message}`,
        );
      }
    }

    this.logger.log(
      `Initializing WhatsApp Web client for tenant: ${tenantId}, channel: ${channelId} at ${dataPath}`,
    );

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: `channel_${channelId}`,
        dataPath: dataPath,
      }),
      puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
        ],
      },
    });

    this.clients.set(clientKey, client);
    this.clientStatuses.set(clientKey, 'AUTHENTICATING');
    this.registerEvents(tenantId, channelId, client);

    // Emit AUTHENTICATING immediately so the UI shows connecting state
    this.eventBus.publish(
      COMMUNICATION_EVENTS.SESSION_STATUS_CHANGED,
      new SessionStatusEvent(
        tenantId,
        this.PROVIDER_NAME,
        channelId,
        'AUTHENTICATING',
      ),
    );

    // Fire-and-forget: initialize() is event-driven (qr → ready → disconnected).
    // Do NOT await — awaiting causes it to emit AUTHENTICATING AFTER QR_READY,
    // which hides the QR panel on the frontend.
    client.initialize().catch((error) => {
      this.logger.error(
        `Failed to initialize WhatsApp client for ${tenantId}, channel ${channelId}`,
        error,
      );
      this.clients.delete(clientKey);
      this.eventBus.publish(
        COMMUNICATION_EVENTS.SESSION_STATUS_CHANGED,
        new SessionStatusEvent(
          tenantId,
          this.PROVIDER_NAME,
          channelId,
          'DISCONNECTED',
          { error: error.message },
        ),
      );
    });
  }

  async disconnect(tenantId: string, channelId: string): Promise<void> {
    const clientKey = `${tenantId}:${channelId}`;
    const client = this.clients.get(clientKey);
    if (!client) {
      this.logger.warn(
        `No active client found for tenant: ${tenantId}, channel ${channelId}`,
      );
      this.eventBus.publish(
        COMMUNICATION_EVENTS.SESSION_STATUS_CHANGED,
        new SessionStatusEvent(
          tenantId,
          this.PROVIDER_NAME,
          channelId,
          'DISCONNECTED',
        ),
      );
      return;
    }

    try {
      await client.destroy();
      this.clients.delete(clientKey);
      this.clientStatuses.delete(clientKey);
      this.logger.log(
        `Disconnected client for tenant: ${tenantId}, channel ${channelId}`,
      );

      this.eventBus.publish(
        COMMUNICATION_EVENTS.SESSION_STATUS_CHANGED,
        new SessionStatusEvent(
          tenantId,
          this.PROVIDER_NAME,
          channelId,
          'DISCONNECTED',
        ),
      );
    } catch (error) {
      this.logger.error(
        `Error destroying client for tenant ${tenantId}, channel ${channelId}`,
        error,
      );
    }
  }

  async sendMessage(
    tenantId: string,
    channelId: string,
    to: string,
    content: string,
  ): Promise<any> {
    const clientKey = `${tenantId}:${channelId}`;
    const client = this.clients.get(clientKey);
    if (!client) {
      throw new Error(
        `No active WhatsApp client for tenant ${tenantId}, channel ${channelId}`,
      );
    }

    try {
      // Ensure the 'to' number has the correct format (e.g. appending @c.us if no domain is present)
      const formattedTo = to.includes('@') ? to : `${to}@c.us`;
      const message = await client.sendMessage(formattedTo, content);

      this.logger.debug(
        `Message sent to ${formattedTo} for tenant ${tenantId}, channel ${channelId}`,
      );

      // Optionally publish a MESSAGE_SENT event here

      return message;
    } catch (error) {
      this.logger.error(
        `Failed to send message for tenant ${tenantId}, channel ${channelId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Returns the channelId of the first session currently in READY state for
   * the tenant, or undefined if no WhatsApp line is connected.
   */
  getFirstReadyChannel(tenantId: string): string | undefined {
    const prefix = `${tenantId}:`;
    for (const [key, status] of this.clientStatuses.entries()) {
      if (key.startsWith(prefix) && status === 'READY') {
        return key.slice(prefix.length);
      }
    }
    return undefined;
  }

  /**
   * Checks whether a phone number is registered on WhatsApp using the given
   * channel's live session. Returns the resolved WhatsApp id when registered.
   */
  async getNumberId(
    tenantId: string,
    channelId: string,
    phone: string,
  ): Promise<{ registered: boolean; serialized?: string }> {
    const clientKey = `${tenantId}:${channelId}`;
    const client = this.clients.get(clientKey);
    if (!client) {
      throw new Error(
        `No active WhatsApp client for tenant ${tenantId}, channel ${channelId}`,
      );
    }

    const digits = phone.replace(/\D/g, '');
    if (!digits) {
      throw new Error('Invalid phone number');
    }

    // getNumberId resolves the real WhatsApp WID (or null if not registered),
    // handling country-specific quirks (e.g. the MX "1" prefix) better than a
    // raw isRegisteredUser check.
    const numberId = await client.getNumberId(digits);
    return numberId
      ? { registered: true, serialized: numberId._serialized }
      : { registered: false };
  }

  private registerEvents(tenantId: string, channelId: string, client: Client) {
    const clientKey = `${tenantId}:${channelId}`;

    client.on('qr', (qr) => {
      this.logger.log(
        `QR Code generated for tenant ${tenantId}, channel ${channelId}`,
      );
      qrcode.generate(qr, { small: true });

      this.clientStatuses.set(clientKey, 'QR_READY');

      this.eventBus.publish(
        COMMUNICATION_EVENTS.SESSION_STATUS_CHANGED,
        new SessionStatusEvent(
          tenantId,
          this.PROVIDER_NAME,
          channelId,
          'QR_READY',
        ),
      );

      this.eventBus.publish(
        COMMUNICATION_EVENTS.QR_CODE_GENERATED,
        new SessionStatusEvent(
          tenantId,
          this.PROVIDER_NAME,
          channelId,
          'QR_READY',
          { qr },
        ),
      );
    });

    client.on('ready', () => {
      this.logger.log(
        `WhatsApp client is ready for tenant ${tenantId}, channel ${channelId}`,
      );
      this.clientStatuses.set(clientKey, 'READY');
      this.eventBus.publish(
        COMMUNICATION_EVENTS.SESSION_STATUS_CHANGED,
        new SessionStatusEvent(
          tenantId,
          this.PROVIDER_NAME,
          channelId,
          'READY',
        ),
      );
    });

    client.on('authenticated', () => {
      this.logger.log(
        `WhatsApp client authenticated for tenant ${tenantId}, channel ${channelId}`,
      );
    });

    client.on('auth_failure', (msg) => {
      this.logger.error(
        `WhatsApp authentication failed for tenant ${tenantId}, channel ${channelId}: ${msg}`,
      );
      this.clientStatuses.delete(clientKey);
      this.eventBus.publish(
        COMMUNICATION_EVENTS.SESSION_STATUS_CHANGED,
        new SessionStatusEvent(
          tenantId,
          this.PROVIDER_NAME,
          channelId,
          'DISCONNECTED',
          { error: msg },
        ),
      );
    });

    client.on('disconnected', (reason) => {
      this.logger.warn(
        `WhatsApp client disconnected for tenant ${tenantId}, channel ${channelId}: ${reason}`,
      );
      this.clients.delete(clientKey);
      this.clientStatuses.delete(clientKey);
      this.eventBus.publish(
        COMMUNICATION_EVENTS.SESSION_STATUS_CHANGED,
        new SessionStatusEvent(
          tenantId,
          this.PROVIDER_NAME,
          channelId,
          'DISCONNECTED',
          { reason },
        ),
      );
    });

    client.on('message', async (message: Message) => {
      this.logger.debug(
        `Received message for tenant ${tenantId}, channel ${channelId} from ${message.from}`,
      );

      this.eventBus.publish(
        COMMUNICATION_EVENTS.MESSAGE_RECEIVED,
        new MessageReceivedEvent(
          tenantId,
          this.PROVIDER_NAME,
          channelId,
          message.from,
          message.body,
          message,
        ),
      );
    });
  }

  getActiveStatuses(tenantId: string): { channelId: string; status: string }[] {
    const prefix = `${tenantId}:`;
    const statuses: { channelId: string; status: string }[] = [];
    for (const [key, status] of this.clientStatuses.entries()) {
      if (key.startsWith(prefix)) {
        const channelId = key.slice(prefix.length);
        statuses.push({ channelId, status });
      }
    }
    return statuses;
  }

  getActiveClientStatus(
    tenantId: string,
    channelId: string,
  ): string | undefined {
    return this.clientStatuses.get(`${tenantId}:${channelId}`);
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
    this.clientStatuses.clear();
  }
}
