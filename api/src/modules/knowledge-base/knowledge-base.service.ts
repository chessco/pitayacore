import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { AiService } from '../ai/ai.service';
import { getTenantId } from '../../common/tenant/tenant.middleware';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require('pdf-parse');

@Injectable()
export class KnowledgeBaseService {
  constructor(
    private db: DatabaseService,
    @Inject(forwardRef(() => AiService))
    private aiService: AiService,
  ) {}

  async addEntry(content: string, source?: string) {
    const tenantId = getTenantId();

    // 1. Save to MySQL
    const entry = await this.db.mysql.knowledgeBase.create({
      data: {
        tenantId,
        title: source || 'Untitled Entry',
        source,
        version: '1.0',
      },
    });

    // 2. Save Chunk
    await this.db.mysql.knowledgeBaseChunk.create({
      data: {
        kbId: entry.id,
        tenantId,
        content: content,
        sequence: 0,
      },
    });

    // 3. Generate and save embedding in PostgreSQL
    const embedding = await this.aiService.getEmbedding(content);

    // Using raw query for pgvector since Prisma Support is limited for Vector type
    await this.db.postgres.$executeRawUnsafe(
      `INSERT INTO "VectorRecord" ("id", "tenantId", "content", "embedding", "refId", "refType") 
       VALUES (gen_random_uuid(), '${tenantId}', '${content.replace(/'/g, "''")}', '[${embedding.join(',')}]', '${entry.id}', 'KB')`,
    );

    return entry;
  }

  async search(query: string, limit: number = 5, filterIds?: string[]) {
    const tenantId = getTenantId();

    // 1. Get active KB IDs from MySQL first
    const where: any = {
      OR: [{ tenantId }, { tenantId: null }],
      status: 'ACTIVE',
    };

    if (filterIds && filterIds.length > 0) {
      // If we have specific filterIds, we only want those if they are ACTIVE
      where.id = { in: filterIds };
    }

    const activeKbs = await this.db.mysql.knowledgeBase.findMany({
      where,
      select: { id: true },
    });
    const activeIds = activeKbs.map((k) => k.id);

    if (activeIds.length === 0) return [];

    const queryEmbedding = await this.aiService.getEmbedding(query);
    const idsString = activeIds.map((id) => `'${id}'`).join(',');

    // 2. Vector similarity search using pgvector, filtering by active IDs
    const results = await this.db.postgres.$queryRawUnsafe(
      `SELECT "content", "refId", "refType", ("embedding" <=> '[${queryEmbedding.join(',')}]') as distance 
       FROM "VectorRecord" 
       WHERE ("tenantId" = '${tenantId}' OR "tenantId" IS NULL)
       AND "refId" IN (${idsString})
       ORDER BY distance ASC 
       LIMIT ${limit}`,
    );

    return results;
  }

  async toggleStatus(id: string) {
    const tid = getTenantId();

    // Find the document ensuring it belongs to the tenant or is global
    const kb = await this.db.mysql.knowledgeBase.findFirst({
      where: {
        id,
        OR: tid
          ? [{ tenantId: tid }, { tenantId: null }]
          : [{ tenantId: null }],
      },
    });

    if (!kb) throw new Error(`Document ${id} not found for tenant ${tid}`);

    const newStatus = kb.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    return this.db.mysql.knowledgeBase.update({
      where: { id: kb.id },
      data: { status: newStatus },
    });
  }

  async generateWithAi(prompt: string) {
    return this.aiService.generateRaw(prompt, 'gemini-2.5-flash');
  }

  async extractTextFromPdf(buffer: Buffer) {
    const data = await pdf(buffer);
    return data.text;
  }

  async deleteDocument(id: string) {
    const tenantId = getTenantId();

    // 1. Delete from MySQL (Cascades to chunks)
    await this.db.mysql.knowledgeBase.delete({
      where: { id, tenantId },
    });

    // 2. Delete from Vector Store
    await this.db.postgres.$executeRawUnsafe(
      `DELETE FROM "VectorRecord" WHERE "refId" = '${id}' AND "tenantId" = '${tenantId}'`,
    );
  }

  async reindexDocument(id: string) {
    const tenantId = getTenantId();

    const doc = await this.db.mysql.knowledgeBase.findFirst({
      where: { id, tenantId },
      include: { chunks: true },
    });

    if (!doc) throw new Error('Document not found');

    // 1. Clear existing vectors
    await this.db.postgres.$executeRawUnsafe(
      `DELETE FROM "VectorRecord" WHERE "refId" = '${id}' AND "tenantId" = '${tenantId}'`,
    );

    // 2. Re-generate embeddings for all chunks
    for (const chunk of doc.chunks) {
      const embedding = await this.aiService.getEmbedding(chunk.content);
      await this.db.postgres.$executeRawUnsafe(
        `INSERT INTO "VectorRecord" ("id", "tenantId", "content", "embedding", "refId", "refType") 
         VALUES (gen_random_uuid(), '${tenantId}', '${chunk.content.replace(/'/g, "''")}', '[${embedding.join(',')}]', '${id}', 'KB')`,
      );
    }
  }
}
