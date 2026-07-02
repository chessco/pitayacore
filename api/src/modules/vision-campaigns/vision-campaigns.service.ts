import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class VisionCampaignsService {
  constructor(private readonly db: DatabaseService) {}

  private async resolveTenantId(tenantId: string): Promise<string> {
    if (tenantId === 'DEFAULT_TENANT') {
      const defaultTenant = await this.db.mysql.tenant.findFirst();
      return defaultTenant?.id || tenantId;
    }
    return tenantId;
  }

  async findAll(tenantId: string) {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    const conversations = await this.db.mysql.conversationOld.findMany({
      where: { tenantId: resolvedTenantId, source: 'CREATIVE_CHAT' },
      orderBy: { createdAt: 'desc' },
      include: {
        messagesOld: {
          where: { role: 'ai' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const results = [];

    for (const conv of conversations) {
      const sessionMeta: any = conv.metadata
        ? JSON.parse(conv.metadata as string)
        : {};

      if (!sessionMeta.campaignId) continue;

      const lastAiMsg = conv.messagesOld[0];
      const msgMeta: any = lastAiMsg?.classification
        ? JSON.parse(lastAiMsg.classification)
        : {};

      const rawAssets = await this.db.mysql.asset.findMany({
        where: { tenantId: resolvedTenantId },
      });

      const assets = rawAssets
        .filter((a) => {
          const m: any = a.metadata ? JSON.parse(a.metadata as string) : {};
          return m.campaignId === sessionMeta.campaignId;
        })
        .map((a) => ({
          id: a.id,
          url: a.storagePath,
          type: a.type,
        }));

      results.push({
        id: conv.id,
        name: sessionMeta.title || 'Campaña Sin Nombre',
        objective: msgMeta.suggestedCopy || '',
        audience: msgMeta.bannerStyle || 'General',
        createdAt: conv.createdAt,
        assets,
      });
    }

    return results;
  }

  async delete(tenantId: string, id: string) {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    const conv = await this.db.mysql.conversationOld.findFirst({
      where: { id, tenantId: resolvedTenantId },
    });

    if (!conv) return { deleted: false };

    const sessionMeta: any = conv.metadata
      ? JSON.parse(conv.metadata as string)
      : {};

    if (sessionMeta.campaignId) {
      const allAssets = await this.db.mysql.asset.findMany({
        where: { tenantId: resolvedTenantId },
      });

      const toDelete = allAssets.filter((a) => {
        const m: any = a.metadata ? JSON.parse(a.metadata as string) : {};
        return m.campaignId === sessionMeta.campaignId;
      });

      for (const asset of toDelete) {
        await this.db.mysql.asset.delete({ where: { id: asset.id } });
      }
    }

    await this.db.mysql.messageOld.deleteMany({
      where: { conversationId: id },
    });

    await this.db.mysql.conversationOld.delete({ where: { id } });

    return { deleted: true };
  }
}
