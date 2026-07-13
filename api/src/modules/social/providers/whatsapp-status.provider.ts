import { Injectable, Logger } from '@nestjs/common';
import { SocialProvider } from './social-provider.interface';

@Injectable()
export class WhatsAppStatusProvider implements SocialProvider {
  private readonly logger = new Logger(WhatsAppStatusProvider.name);

  async authenticate(tenantId: string) {
    this.logger.log(
      `Authenticating WhatsApp Status provider for tenant ${tenantId}`,
    );
    return {
      success: true,
      token: 'mock_wa_access_token_' + Math.random().toString(36).substring(2),
    };
  }

  async publish(
    tenantId: string,
    content: string,
    mediaUrls: string[],
    metadata?: any,
  ) {
    this.logger.log(
      `Publishing WhatsApp Status for tenant ${tenantId}: "${content.substring(0, 30)}..."`,
    );
    const externalId = 'wa_status_' + Math.random().toString(36).substring(2);
    return {
      success: true,
      externalId,
      url: `https://web.whatsapp.com/status/${externalId}`,
    };
  }

  async schedule(
    tenantId: string,
    content: string,
    mediaUrls: string[],
    scheduledAt: Date,
    metadata?: any,
  ) {
    this.logger.log(
      `Scheduling WhatsApp Status for tenant ${tenantId} at ${scheduledAt}: "${content.substring(0, 30)}..."`,
    );
    return {
      success: true,
      externalId: 'wa_sched_' + Math.random().toString(36).substring(2),
    };
  }

  async delete(tenantId: string, externalId: string) {
    this.logger.log(
      `Deleting WhatsApp Status ${externalId} for tenant ${tenantId}`,
    );
    return { success: true };
  }

  async metrics(tenantId: string, externalId: string) {
    return {
      impressions: Math.floor(Math.random() * 300) + 50, // Views
      reach: Math.floor(Math.random() * 280) + 40,
      engagement: Math.floor(Math.random() * 50) + 5, // Replies
      clicks: Math.floor(Math.random() * 20) + 2,
    };
  }

  async comments(tenantId: string, externalId: string) {
    return [
      {
        id: 'c1',
        author: 'Juan Gómez',
        text: 'Me interesa! Me pasas info?',
        createdAt: new Date(),
      },
      {
        id: 'c2',
        author: 'Leticia Díaz',
        text: 'Qué buen tip.',
        createdAt: new Date(),
      },
    ];
  }

  async reactions(tenantId: string, externalId: string) {
    return {
      replies: Math.floor(Math.random() * 30) + 5,
      likes: Math.floor(Math.random() * 80) + 10,
    };
  }

  async analytics(tenantId: string, startDate: Date, endDate: Date) {
    return {
      reachTotal: Math.floor(Math.random() * 2000) + 500,
      impressionsTotal: Math.floor(Math.random() * 3000) + 800,
      engagementRate: parseFloat((Math.random() * 15 + 10).toFixed(2)), // Higher reply rate in WA
      clicksTotal: Math.floor(Math.random() * 400) + 50,
    };
  }
}
