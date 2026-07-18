import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { CommunicationProvider } from '../communication-provider.interface';
import { FilesystemSessionStorageProvider } from '../session-storage/filesystem-session-storage.provider';
import { CommunicationEventBusService } from '../../events/communication-event-bus.service';
import {
  COMMUNICATION_EVENTS,
  MessageReceivedEvent,
  SessionStatusEvent,
} from '../../events/communication.events';
import { Client, LocalAuth, Message, MessageMedia } from 'whatsapp-web.js';
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
      // Resolve the real WhatsApp id (WID/LID) instead of building "<n>@c.us"
      // by hand — recent WhatsApp Web versions reject unresolved ids with
      // "No LID for user".
      const chatId = await this.resolveChatId(client, to);
      const message = await client.sendMessage(chatId, content);

      this.logger.debug(
        `Message sent to ${chatId} for tenant ${tenantId}, channel ${channelId}`,
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
   * Resolves the addressable chat id for a recipient. If it already contains a
   * domain (e.g. "…@c.us"/"…@lid") it is used as-is; otherwise the real WID is
   * looked up via getNumberId so WhatsApp can route the message.
   */
  private async resolveChatId(client: Client, to: string): Promise<string> {
    if (to.includes('@')) return to;
    const digits = to.replace(/\D/g, '');
    if (!digits) throw new Error('Número de teléfono inválido');

    // Mexican numbers may be registered on WhatsApp with or without the mobile
    // "1" after the country code (52 vs 521). getNumberId only resolves one of
    // them, so try both formats before giving up.
    const candidates = [digits];
    if (/^52\d{10}$/.test(digits)) candidates.push('521' + digits.slice(2));
    else if (/^521\d{10}$/.test(digits)) candidates.push('52' + digits.slice(3));

    for (const candidate of candidates) {
      try {
        const numberId = await client.getNumberId(candidate);
        if (numberId) return numberId._serialized;
      } catch {
        /* try the next candidate */
      }
    }
    throw new Error(`El número ${to} no está registrado en WhatsApp`);
  }

  /**
   * Sends an image (with optional caption) to a number using the given
   * channel's live session. Accepts either a data URL / raw base64 payload
   * (imageBase64) or a public URL (imageUrl).
   */
  async sendMedia(
    tenantId: string,
    channelId: string,
    to: string,
    opts: { imageBase64?: string; imageUrl?: string; caption?: string },
  ): Promise<any> {
    const clientKey = `${tenantId}:${channelId}`;
    const client = this.clients.get(clientKey);
    if (!client) {
      throw new Error(
        `No active WhatsApp client for tenant ${tenantId}, channel ${channelId}`,
      );
    }

    let media: MessageMedia;
    if (opts.imageUrl) {
      media = await MessageMedia.fromUrl(opts.imageUrl, { unsafeMime: true });
    } else if (opts.imageBase64) {
      // Accept "data:<mime>;base64,<data>" or raw base64 (assume png).
      const match = /^data:([^;]+);base64,(.*)$/s.exec(opts.imageBase64);
      if (match) {
        media = new MessageMedia(match[1], match[2]);
      } else {
        media = new MessageMedia('image/png', opts.imageBase64);
      }
    } else {
      throw new Error('No image provided');
    }

    const chatId = await this.resolveChatId(client, to);
    return client.sendMessage(chatId, media, {
      caption: opts.caption || undefined,
    });
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

    let digits = phone.replace(/\D/g, '');
    if (!digits) {
      throw new Error('Invalid phone number');
    }

    // Contacts are usually stored as bare 10-digit Mexican nationals
    // (e.g. 6622125390) with no country code, which WhatsApp can't resolve.
    // Prepend Mexico's country code (52). Numbers that already include a
    // country code (52..., legacy 521...) are left untouched.
    if (digits.length === 10) {
      digits = `52${digits}`;
    }

    // getNumberId resolves the real WhatsApp WID (or null if not registered),
    // and normalizes country-specific quirks (e.g. the legacy MX "1" mobile
    // prefix) better than a raw isRegisteredUser check.
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
