import { Injectable, Logger } from '@nestjs/common';
import { SocialProvider } from './social-provider.interface';

@Injectable()
export class LinkedinProvider implements SocialProvider {
  private readonly logger = new Logger(LinkedinProvider.name);

  async authenticate(tenantId: string) {
    this.logger.log(`Authenticating LinkedIn provider for tenant ${tenantId}`);
    return {
      success: true,
      url: `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=mock_client_id&redirect_uri=https://pitayacore-api.pitayacode.io/api/social/providers/linkedin/callback&state=${tenantId}&scope=r_liteprofile%20r_emailaddress%20w_member_social`,
      token: 'mock_li_access_token_' + Math.random().toString(36).substring(2),
    };
  }

  async publish(tenantId: string, content: string, mediaUrls: string[], metadata?: any) {
    this.logger.log(`Publishing to LinkedIn for tenant ${tenantId}: "${content.substring(0, 30)}..."`);
    const externalId = 'urn:li:share:' + Math.random().toString(36).substring(2);
    return {
      success: true,
      externalId,
      url: `https://www.linkedin.com/feed/update/${externalId}`,
    };
  }

  async schedule(tenantId: string, content: string, mediaUrls: string[], scheduledAt: Date, metadata?: any) {
    this.logger.log(`Scheduling to LinkedIn for tenant ${tenantId} at ${scheduledAt}: "${content.substring(0, 30)}..."`);
    return {
      success: true,
      externalId: 'li_sched_' + Math.random().toString(36).substring(2),
    };
  }

  async delete(tenantId: string, externalId: string) {
    this.logger.log(`Deleting LinkedIn post ${externalId} for tenant ${tenantId}`);
    return { success: true };
  }

  async metrics(tenantId: string, externalId: string) {
    return {
      impressions: Math.floor(Math.random() * 3000) + 600,
      reach: Math.floor(Math.random() * 2200) + 500,
      engagement: Math.floor(Math.random() * 350) + 40,
      clicks: Math.floor(Math.random() * 200) + 15,
    };
  }

  async comments(tenantId: string, externalId: string) {
    return [
      { id: 'c1', author: 'Ing. Fernando Pérez', text: 'Gran perspectiva profesional. Totalmente de acuerdo.', createdAt: new Date() },
      { id: 'c2', author: 'Sofía Martínez', text: 'Interesante análisis sobre la industria.', createdAt: new Date() },
    ];
  }

  async reactions(tenantId: string, externalId: string) {
    return {
      like: Math.floor(Math.random() * 80) + 20,
      celebrate: Math.floor(Math.random() * 30) + 5,
      support: Math.floor(Math.random() * 15) + 1,
      insightful: Math.floor(Math.random() * 25) + 3,
      curious: Math.floor(Math.random() * 10),
    };
  }

  async analytics(tenantId: string, startDate: Date, endDate: Date) {
    return {
      reachTotal: Math.floor(Math.random() * 18000) + 4000,
      impressionsTotal: Math.floor(Math.random() * 26000) + 6000,
      engagementRate: parseFloat((Math.random() * 6 + 3).toFixed(2)),
      clicksTotal: Math.floor(Math.random() * 1500) + 150,
    };
  }
}
