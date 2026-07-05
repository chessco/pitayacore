import { Injectable, Logger } from '@nestjs/common';
import { SocialProvider } from './social-provider.interface';

@Injectable()
export class InstagramProvider implements SocialProvider {
  private readonly logger = new Logger(InstagramProvider.name);

  async authenticate(tenantId: string) {
    this.logger.log(`Authenticating Instagram provider for tenant ${tenantId}`);
    return {
      success: true,
      url: `https://api.instagram.com/oauth/authorize?client_id=mock_client_id&redirect_uri=https://pitayacore-api.pitayacode.io/api/social/providers/instagram/callback&response_type=code&state=${tenantId}`,
      token: 'mock_ig_access_token_' + Math.random().toString(36).substring(2),
    };
  }

  async publish(tenantId: string, content: string, mediaUrls: string[], metadata?: any) {
    this.logger.log(`Publishing to Instagram for tenant ${tenantId}: "${content.substring(0, 30)}..."`);
    const externalId = 'ig_post_' + Math.random().toString(36).substring(2);
    return {
      success: true,
      externalId,
      url: `https://instagram.com/p/${externalId}`,
    };
  }

  async schedule(tenantId: string, content: string, mediaUrls: string[], scheduledAt: Date, metadata?: any) {
    this.logger.log(`Scheduling to Instagram for tenant ${tenantId} at ${scheduledAt}: "${content.substring(0, 30)}..."`);
    return {
      success: true,
      externalId: 'ig_sched_' + Math.random().toString(36).substring(2),
    };
  }

  async delete(tenantId: string, externalId: string) {
    this.logger.log(`Deleting Instagram post ${externalId} for tenant ${tenantId}`);
    return { success: true };
  }

  async metrics(tenantId: string, externalId: string) {
    return {
      impressions: Math.floor(Math.random() * 2500) + 500,
      reach: Math.floor(Math.random() * 2000) + 400,
      engagement: Math.floor(Math.random() * 400) + 50,
      clicks: Math.floor(Math.random() * 150) + 10,
    };
  }

  async comments(tenantId: string, externalId: string) {
    return [
      { id: 'c1', author: 'Mariana_G', text: 'Increíble toma! Muy útil.', createdAt: new Date() },
      { id: 'c2', author: 'Dev_User', text: 'Súper recomendado.', createdAt: new Date() },
    ];
  }

  async reactions(tenantId: string, externalId: string) {
    return {
      like: Math.floor(Math.random() * 200) + 50,
      save: Math.floor(Math.random() * 50) + 10,
      share: Math.floor(Math.random() * 30) + 2,
    };
  }

  async analytics(tenantId: string, startDate: Date, endDate: Date) {
    return {
      reachTotal: Math.floor(Math.random() * 25000) + 5000,
      impressionsTotal: Math.floor(Math.random() * 35000) + 7000,
      engagementRate: parseFloat((Math.random() * 8 + 4).toFixed(2)),
      clicksTotal: Math.floor(Math.random() * 2500) + 200,
    };
  }
}
