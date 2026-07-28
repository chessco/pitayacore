import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';

export interface ContentQuery {
  source?: string;
  status?: string;
  limit?: number;
}

/**
 * Read-side queries over collected content and its analysis. Content items and
 * analyses are linked by `contentItemId` (no Prisma relation, by design), so
 * analyses are fetched and attached in a second batched query.
 */
@Injectable()
export class ContentService {
  constructor(private readonly db: DatabaseService) {}

  async list(tenantId: string, query: ContentQuery) {
    const items = await this.db.mysql.socialContentItem.findMany({
      where: {
        tenantId,
        ...(query.source ? { source: query.source } : {}),
        ...(query.status ? { analysisStatus: query.status } : {}),
      },
      orderBy: { collectedAt: 'desc' },
      take: Math.min(query.limit ?? 50, 200),
    });

    const ids = items.map((i) => i.id);
    const analyses = ids.length
      ? await this.db.mysql.socialContentAnalysis.findMany({
          where: { contentItemId: { in: ids } },
        })
      : [];
    const byItem = new Map(analyses.map((a) => [a.contentItemId, a]));

    return items.map((item) => ({
      ...item,
      analysis: byItem.get(item.id) ?? null,
    }));
  }

  async get(tenantId: string, id: string) {
    const item = await this.db.mysql.socialContentItem.findFirst({
      where: { id, tenantId },
    });
    if (!item) throw new NotFoundException('Content item not found');
    const analysis = await this.db.mysql.socialContentAnalysis.findUnique({
      where: { contentItemId: id },
    });
    return { ...item, analysis: analysis ?? null };
  }
}
