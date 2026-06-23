import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class VisionCampaignsService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(tenantId: string) {
    // Fetch all creative chat conversations that have been approved (have a campaignId in metadata)
    const conversations = await this.db.mysql.conversation.findMany({
      where: { tenantId, source: 'CREATIVE_CHAT' },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: {
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

      // Only include conversations that have been approved (have a campaignId)
      if (!sessionMeta.campaignId) continue;

      const lastAiMsg = conv.messages[0];
      const msgMeta: any = lastAiMsg?.classification
        ? JSON.parse(lastAiMsg.classification)
        : {};

      // Fetch assets linked to this campaign
      const rawAssets = await this.db.mysql.asset.findMany({
        where: { tenantId },
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
    // Get conversation metadata to extract campaignId
    const conv = await this.db.mysql.conversation.findFirst({
      where: { id, tenantId },
    });

    if (!conv) return { deleted: false };

    const sessionMeta: any = conv.metadata
      ? JSON.parse(conv.metadata as string)
      : {};

    // Delete linked assets
    if (sessionMeta.campaignId) {
      const allAssets = await this.db.mysql.asset.findMany({
        where: { tenantId },
      });

      const toDelete = allAssets.filter((a) => {
        const m: any = a.metadata ? JSON.parse(a.metadata as string) : {};
        return m.campaignId === sessionMeta.campaignId;
      });

      for (const asset of toDelete) {
        await this.db.mysql.asset.delete({ where: { id: asset.id } });
      }
    }

    // Delete messages then conversation
    await this.db.mysql.message.deleteMany({
      where: { conversationId: id },
    });

    await this.db.mysql.conversation.delete({ where: { id } });

    return { deleted: true };
  }
}
