import { Injectable, Logger } from '@nestjs/common';
import { SocialProvider } from './social-provider.interface';

@Injectable()
export class FacebookProvider implements SocialProvider {
  private readonly logger = new Logger(FacebookProvider.name);

  async authenticate(tenantId: string) {
    this.logger.log(`Authenticating Facebook provider for tenant ${tenantId}`);
    return {
      success: true,
      url: `https://www.facebook.com/v18.0/dialog/oauth?client_id=mock_client_id&redirect_uri=https://pitayacore-api.pitayacode.io/api/social/providers/facebook/callback&state=${tenantId}`,
      token: 'mock_fb_access_token_' + Math.random().toString(36).substring(2),
    };
  }

  async publish(tenantId: string, content: string, mediaUrls: string[], metadata?: any) {
    this.logger.log(`Publishing to Facebook for tenant ${tenantId}: "${content.substring(0, 30)}..."`);
    const externalId = 'fb_post_' + Math.random().toString(36).substring(2);
    return {
      success: true,
      externalId,
      url: `https://facebook.com/${externalId}`,
    };
  }

  async schedule(tenantId: string, content: string, mediaUrls: string[], scheduledAt: Date, metadata?: any) {
    this.logger.log(`Scheduling to Facebook for tenant ${tenantId} at ${scheduledAt}: "${content.substring(0, 30)}..."`);
    return {
      success: true,
      externalId: 'fb_sched_' + Math.random().toString(36).substring(2),
    };
  }

  async delete(tenantId: string, externalId: string) {
    this.logger.log(`Deleting Facebook post ${externalId} for tenant ${tenantId}`);
    return { success: true };
  }

  async metrics(tenantId: string, externalId: string) {
    return {
      impressions: Math.floor(Math.random() * 1000) + 150,
      reach: Math.floor(Math.random() * 800) + 100,
      engagement: Math.floor(Math.random() * 200) + 20,
      clicks: Math.floor(Math.random() * 80) + 5,
    };
  }

  async comments(tenantId: string, externalId: string) {
    return [
      { id: 'c1', author: 'Ana López', text: 'Me encanta esta publicación.', createdAt: new Date() },
      { id: 'c2', author: 'Carlos Ruiz', text: 'Excelente información, gracias por compartir.', createdAt: new Date() },
    ];
  }

  async reactions(tenantId: string, externalId: string) {
    return {
      like: Math.floor(Math.random() * 50) + 10,
      love: Math.floor(Math.random() * 20) + 5,
      haha: Math.floor(Math.random() * 5),
      wow: Math.floor(Math.random() * 10) + 1,
    };
  }

  async analytics(tenantId: string, startDate: Date, endDate: Date) {
    return {
      reachTotal: Math.floor(Math.random() * 10000) + 2000,
      impressionsTotal: Math.floor(Math.random() * 15000) + 3000,
      engagementRate: parseFloat((Math.random() * 5 + 2).toFixed(2)),
      clicksTotal: Math.floor(Math.random() * 1200) + 100,
    };
  }
}
