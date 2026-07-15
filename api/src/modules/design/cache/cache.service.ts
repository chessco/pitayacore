import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';
import { createHash } from 'crypto';

@Injectable()
export class ThemeCacheService {
  constructor(private readonly db: DatabaseService) {}

  private computeChecksum(tokens: any[]): string {
    const raw = JSON.stringify(tokens);
    return createHash('sha256').update(raw).digest('hex').slice(0, 16);
  }

  async getCached(tenantId: string, themeId: string) {
    const cached = await this.db.mysql.themeCache.findUnique({
      where: { tenantId_themeId: { tenantId, themeId } },
    });

    if (!cached) return null;

    // Check expiry
    if (cached.expiresAt && cached.expiresAt < new Date()) {
      await this.invalidate(tenantId, themeId);
      return null;
    }

    return cached;
  }

  async getCachedTokens(tenantId: string, themeId: string): Promise<any[]> {
    const cached = await this.getCached(tenantId, themeId);
    return cached ? (cached.tokens as any[]) : [];
  }

  async upsertCache(
    tenantId: string,
    themeId: string,
    version: string,
    tokens: any[],
    manifest?: any,
    ttlHours = 24,
  ) {
    const checksum = this.computeChecksum(tokens);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);

    return this.db.mysql.themeCache.upsert({
      where: { tenantId_themeId: { tenantId, themeId } },
      update: {
        version,
        tokens,
        checksum,
        manifest: manifest || null,
        cachedAt: new Date(),
        expiresAt,
      },
      create: {
        tenantId,
        themeId,
        version,
        tokens,
        checksum,
        manifest: manifest || null,
        expiresAt,
      },
    });
  }

  async invalidate(tenantId: string, themeId: string) {
    return this.db.mysql.themeCache.deleteMany({
      where: { tenantId, themeId },
    });
  }

  async invalidateAllForTenant(tenantId: string) {
    return this.db.mysql.themeCache.deleteMany({ where: { tenantId } });
  }

  async listCached(tenantId: string) {
    return this.db.mysql.themeCache.findMany({
      where: { tenantId },
      orderBy: { cachedAt: 'desc' },
    });
  }

  async getCacheStatus(tenantId: string, themeId: string) {
    const cached = await this.getCached(tenantId, themeId);
    if (!cached) return { isCached: false };

    return {
      isCached: true,
      version: cached.version,
      checksum: cached.checksum,
      cachedAt: cached.cachedAt,
      expiresAt: cached.expiresAt,
    };
  }
}
