import { Injectable, Logger } from '@nestjs/common';
import { SocialProvider } from './social-provider.interface';

@Injectable()
export class XProvider implements SocialProvider {
  private readonly logger = new Logger(XProvider.name);

  async authenticate(tenantId: string) {
    this.logger.log(`Authenticating X provider for tenant ${tenantId}`);
    return {
      success: true,
      url: `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=mock_client_id&redirect_uri=https://pitayacore-api.pitayacode.io/api/social/providers/x/callback&scope=tweet.read%20tweet.write%20users.read&state=${tenantId}&code_challenge=challenge&code_challenge_method=plain`,
      token: 'mock_x_access_token_' + Math.random().toString(36).substring(2),
    };
  }

  async publish(tenantId: string, content: string, mediaUrls: string[], metadata?: any) {
    this.logger.log(`Publishing to X for tenant ${tenantId}: "${content.substring(0, 30)}..."`);
    const externalId = 'x_tweet_' + Math.random().toString(36).substring(2);
    return {
      success: true,
      externalId,
      url: `https://x.com/user/status/${externalId}`,
    };
  }

  async schedule(tenantId: string, content: string, mediaUrls: string[], scheduledAt: Date, metadata?: any) {
    this.logger.log(`Scheduling to X for tenant ${tenantId} at ${scheduledAt}: "${content.substring(0, 30)}..."`);
    return {
      success: true,
      externalId: 'x_sched_' + Math.random().toString(36).substring(2),
    };
  }

  async delete(tenantId: string, externalId: string) {
    this.logger.log(`Deleting X post ${externalId} for tenant ${tenantId}`);
    return { success: true };
  }

  async metrics(tenantId: string, externalId: string) {
    return {
      impressions: Math.floor(Math.random() * 5000) + 1000,
      reach: Math.floor(Math.random() * 4000) + 800,
      engagement: Math.floor(Math.random() * 600) + 100,
      clicks: Math.floor(Math.random() * 300) + 20,
    };
  }

  async comments(tenantId: string, externalId: string) {
    return [
      { id: 'c1', author: 'user_99', text: 'Totalmente de acuerdo con el tweet!', createdAt: new Date() },
      { id: 'c2', author: 'tech_insider', text: 'Esto cambia las reglas de juego.', createdAt: new Date() },
    ];
  }

  async reactions(tenantId: string, externalId: string) {
    return {
      like: Math.floor(Math.random() * 300) + 50,
      retweet: Math.floor(Math.random() * 80) + 10,
      quote: Math.floor(Math.random() * 20),
      bookmark: Math.floor(Math.random() * 40) + 5,
    };
  }

  async analytics(tenantId: string, startDate: Date, endDate: Date) {
    return {
      reachTotal: Math.floor(Math.random() * 45000) + 10000,
      impressionsTotal: Math.floor(Math.random() * 65000) + 15000,
      engagementRate: parseFloat((Math.random() * 4 + 1).toFixed(2)),
      clicksTotal: Math.floor(Math.random() * 3500) + 300,
    };
  }
}
