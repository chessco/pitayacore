import { Injectable, Logger } from '@nestjs/common';
import { SocialProvider } from './social-provider.interface';

@Injectable()
export class TikTokProvider implements SocialProvider {
  private readonly logger = new Logger(TikTokProvider.name);

  async authenticate(tenantId: string) {
    this.logger.log(`Authenticating TikTok provider for tenant ${tenantId}`);
    return {
      success: true,
      url: `https://www.tiktok.com/v2/auth/authorize/?client_key=mock_client_key&redirect_uri=https://pitayacore-api.pitayacode.io/api/social/providers/tiktok/callback&response_type=code&scope=user.info.basic,video.upload,video.list&state=${tenantId}`,
      token: 'mock_tt_access_token_' + Math.random().toString(36).substring(2),
    };
  }

  async publish(tenantId: string, content: string, mediaUrls: string[], metadata?: any) {
    this.logger.log(`Publishing video to TikTok for tenant ${tenantId}: "${content.substring(0, 30)}..."`);
    const externalId = 'tt_video_' + Math.random().toString(36).substring(2);
    return {
      success: true,
      externalId,
      url: `https://tiktok.com/@user/video/${externalId}`,
    };
  }

  async schedule(tenantId: string, content: string, mediaUrls: string[], scheduledAt: Date, metadata?: any) {
    this.logger.log(`Scheduling to TikTok for tenant ${tenantId} at ${scheduledAt}: "${content.substring(0, 30)}..."`);
    return {
      success: true,
      externalId: 'tt_sched_' + Math.random().toString(36).substring(2),
    };
  }

  async delete(tenantId: string, externalId: string) {
    this.logger.log(`Deleting TikTok video ${externalId} for tenant ${tenantId}`);
    return { success: true };
  }

  async metrics(tenantId: string, externalId: string) {
    return {
      impressions: Math.floor(Math.random() * 10000) + 2000, // Video views
      reach: Math.floor(Math.random() * 8000) + 1500,
      engagement: Math.floor(Math.random() * 1500) + 300,
      clicks: Math.floor(Math.random() * 400) + 50,
    };
  }

  async comments(tenantId: string, externalId: string) {
    return [
      { id: 'c1', author: 'tiktok_fan', text: 'Gran video! El final es lo mejor.', createdAt: new Date() },
      { id: 'c2', author: 'dance_king', text: 'Buenísimo! Apoyando el contenido.', createdAt: new Date() },
    ];
  }

  async reactions(tenantId: string, externalId: string) {
    return {
      like: Math.floor(Math.random() * 1200) + 200,
      share: Math.floor(Math.random() * 180) + 15,
      save: Math.floor(Math.random() * 300) + 30,
    };
  }

  async analytics(tenantId: string, startDate: Date, endDate: Date) {
    return {
      reachTotal: Math.floor(Math.random() * 85000) + 20000,
      impressionsTotal: Math.floor(Math.random() * 120000) + 30000,
      engagementRate: parseFloat((Math.random() * 12 + 6).toFixed(2)),
      clicksTotal: Math.floor(Math.random() * 6000) + 500,
    };
  }
}
