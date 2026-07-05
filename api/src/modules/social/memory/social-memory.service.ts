import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { DatabaseService } from '../../../common/database/database.service';

@Injectable()
export class SocialMemoryService {
  private readonly logger = new Logger(SocialMemoryService.name);
  private ai: GoogleGenAI;

  constructor(
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.ai = new GoogleGenAI({ apiKey });
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const result = await this.ai.models.embedContent({
        model: 'text-embedding-004',
        contents: text,
      });
      return result.embeddings?.[0]?.values || [];
    } catch (error) {
      this.logger.error('Error generating embedding', error);
      return [];
    }
  }

  async indexMemory(
    tenantId: string,
    refId: string,
    refType: 'BRAND_MEMORY' | 'AUDIENCE_MEMORY' | 'CAMPAIGN_MEMORY' | 'PERFORMANCE_MEMORY' | 'TREND_MEMORY',
    content: string,
  ): Promise<void> {
    try {
      const embedding = await this.generateEmbedding(content);
      const vectorStr = `[${embedding.join(',')}]`;

      // Check if already indexed
      const existing = await this.db.postgres.vectorRecord.findFirst({
        where: { refId, refType },
      });

      if (existing) {
        await this.db.postgres.$executeRawUnsafe(
          `UPDATE "VectorRecord" SET embedding = $1::vector, content = $2 WHERE id = $3`,
          vectorStr,
          content,
          existing.id,
        );
      } else {
        const record = await this.db.postgres.vectorRecord.create({
          data: {
            tenantId,
            content,
            refId,
            refType,
          },
        });

        await this.db.postgres.$executeRawUnsafe(
          `UPDATE "VectorRecord" SET embedding = $1::vector WHERE id = $2`,
          vectorStr,
          record.id,
        );
      }

      this.logger.log(`Successfully indexed memory of type ${refType} for reference ${refId}`);
    } catch (error) {
      this.logger.error(`Error indexing memory for reference ${refId}`, error);
    }
  }

  async searchMemory(
    tenantId: string,
    refType: 'BRAND_MEMORY' | 'AUDIENCE_MEMORY' | 'CAMPAIGN_MEMORY' | 'PERFORMANCE_MEMORY' | 'TREND_MEMORY',
    query: string,
    limit = 5,
  ): Promise<any[]> {
    try {
      const embedding = await this.generateEmbedding(query);
      if (embedding.length === 0) return [];
      const vectorStr = `[${embedding.join(',')}]`;

      const records = await this.db.postgres.$queryRawUnsafe<
        { id: string; refId: string; content: string; distance: number }[]
      >(
        `SELECT id, "refId", content, embedding <-> $1::vector AS distance
         FROM "VectorRecord"
         WHERE "tenantId" = $2 AND "refType" = $3
         ORDER BY distance ASC
         LIMIT $4`,
        vectorStr,
        tenantId,
        refType,
        limit,
      );

      return records.map((record) => ({
        score: 1 - record.distance,
        refId: record.refId,
        content: record.content,
      }));
    } catch (error) {
      this.logger.error(`Error searching memory of type ${refType}`, error);
      return [];
    }
  }

  async getMemories(tenantId: string, refType?: string): Promise<any[]> {
    return this.db.postgres.vectorRecord.findMany({
      where: {
        tenantId,
        ...(refType ? { refType } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteMemory(refId: string): Promise<void> {
    await this.db.postgres.vectorRecord.deleteMany({
      where: { refId },
    });
  }
}
