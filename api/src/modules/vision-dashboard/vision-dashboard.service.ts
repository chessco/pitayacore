import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class VisionDashboardService {
  constructor(private readonly db: DatabaseService) {}

  async getDashboardData(tenantId: string) {
    // Stats
    const totalAssets = await this.db.mysql.asset.count({
      where: { tenantId },
    });

    const totalCharacters = await this.db.mysql.character.count({
      where: { tenantId },
    });

    const totalSessions = await this.db.mysql.conversationOld.count({
      where: { tenantId, source: 'CREATIVE_CHAT' },
    });

    // We consider "campaigns" as those CREATIVE_CHAT sessions that have a campaignId in their metadata.
    // However, Prisma doesn't easily filter by JSON structure.
    // For a simple count, we can fetch all CREATIVE_CHAT metadata and filter in memory,
    // or just assume approved campaigns are the ones we care about.
    // Since we did this in vision-campaigns.service:
    const allCreativeSessions = await this.db.mysql.conversationOld.findMany({
      where: { tenantId, source: 'CREATIVE_CHAT' },
      select: { metadata: true },
    });

    let totalCampaigns = 0;
    for (const s of allCreativeSessions) {
      if (s.metadata) {
        try {
          const meta =
            typeof s.metadata === 'string'
              ? JSON.parse(s.metadata)
              : s.metadata;
          if (meta.campaignId) {
            totalCampaigns++;
          }
        } catch (e) {
          // ignore parsing error
        }
      }
    }

    // Recent Assets
    const recentAssets = await this.db.mysql.asset.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        storagePath: true,
        createdAt: true,
        type: true,
      },
    });

    // Recent Campaigns
    // We fetch the latest approved campaigns.
    // To do this efficiently, we'll fetch recently updated sessions and filter.
    const recentCreativeSessions = await this.db.mysql.conversationOld.findMany(
      {
        where: { tenantId, source: 'CREATIVE_CHAT' },
        orderBy: { updatedAt: 'desc' },
        take: 20, // Fetch a bit more to ensure we get some campaigns
      },
    );

    const recentCampaigns = [];
    for (const session of recentCreativeSessions) {
      if (session.metadata) {
        try {
          const meta =
            typeof session.metadata === 'string'
              ? JSON.parse(session.metadata)
              : session.metadata;
          if (meta.campaignId && meta.campaignName) {
            recentCampaigns.push({
              id: meta.campaignId,
              name: meta.campaignName,
              createdAt: session.createdAt,
            });
            if (recentCampaigns.length >= 3) break;
          }
        } catch (e) {
          // ignore
        }
      }
    }

    // Brand Configured
    const tenant = await this.db.mysql.tenant.findUnique({
      where: { id: tenantId },
      select: { brandingConfig: true },
    });

    let brandConfigured = false;
    if (tenant && tenant.brandingConfig) {
      try {
        const brand =
          typeof tenant.brandingConfig === 'string'
            ? JSON.parse(tenant.brandingConfig)
            : tenant.brandingConfig;
        if (brand && Object.keys(brand).length > 0) {
          brandConfigured = true;
        }
      } catch (e) {}
    }

    return {
      stats: {
        totalAssets,
        totalCampaigns,
        totalCharacters,
        totalSessions,
      },
      recentAssets: recentAssets.map((a) => ({
        id: a.id,
        name: a.name,
        url: a.storagePath,
        createdAt: a.createdAt,
        type: a.type,
      })),
      recentCampaigns,
      brandConfigured,
    };
  }
}
