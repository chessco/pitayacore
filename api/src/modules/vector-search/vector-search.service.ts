import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class VectorSearchService {
  private readonly logger = new Logger(VectorSearchService.name);
  private ai: GoogleGenAI;

  constructor(
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Generate a text embedding using Gemini text-embedding-004
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const result = await this.ai.models.embedContent({
      model: 'text-embedding-004',
      contents: text,
    });
    return result.embeddings?.[0]?.values || [];
  }

  /**
   * Index an asset into the vector store
   */
  async indexAsset(
    tenantId: string,
    assetId: string,
    description: string,
  ): Promise<void> {
    try {
      const embedding = await this.generateEmbedding(description);
      const vectorStr = `[${embedding.join(',')}]`;

      // Check if already indexed
      const existing = await this.db.postgres.vectorRecord.findFirst({
        where: { refId: assetId, refType: 'ASSET' },
      });

      if (existing) {
        await this.db.postgres.$executeRawUnsafe(
          `UPDATE "VectorRecord" SET embedding = $1::vector, content = $2 WHERE id = $3`,
          vectorStr,
          description,
          existing.id,
        );
      } else {
        const record = await this.db.postgres.vectorRecord.create({
          data: {
            tenantId,
            content: description,
            refId: assetId,
            refType: 'ASSET',
          },
        });

        await this.db.postgres.$executeRawUnsafe(
          `UPDATE "VectorRecord" SET embedding = $1::vector WHERE id = $2`,
          vectorStr,
          record.id,
        );
      }

      this.logger.log(`Indexed asset ${assetId} into vector store`);
    } catch (error) {
      this.logger.error(`Error indexing asset ${assetId}`, error);
      throw error;
    }
  }

  /**
   * Semantic search across a tenant's assets
   */
  async search(tenantId: string, query: string, limit = 10): Promise<any[]> {
    const embedding = await this.generateEmbedding(query);
    const vectorStr = `[${embedding.join(',')}]`;

    // Cosine similarity search via pgvector <-> operator
    const records = await this.db.postgres.$queryRawUnsafe<
      { id: string; refId: string; content: string; distance: number }[]
    >(
      `SELECT id, "refId", content, embedding <-> $1::vector AS distance
       FROM "VectorRecord"
       WHERE "tenantId" = $2 AND "refType" = 'ASSET'
       ORDER BY distance ASC
       LIMIT $3`,
      vectorStr,
      tenantId,
      limit,
    );

    if (!records.length) return [];

    // Fetch full asset details from MySQL
    const assetIds = records.map((r) => r.refId);
    const assets = await this.db.mysql.asset.findMany({
      where: { id: { in: assetIds }, tenantId },
    });

    // Merge with distance score and sort by relevance
    return records.map((record) => {
      const asset = assets.find((a) => a.id === record.refId);
      return {
        score: 1 - record.distance, // Convert distance to similarity
        assetId: record.refId,
        content: record.content,
        asset: asset
          ? {
              id: asset.id,
              name: asset.name,
              type: asset.type,
              url: asset.storagePath,
              createdAt: asset.createdAt,
            }
          : null,
      };
    });
  }
}
