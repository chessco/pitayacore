import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';
import { createHash } from 'crypto';

@Injectable()
export class ThemeSyncService {
  constructor(private readonly db: DatabaseService) {}

  private buildChecksum(data: any): string {
    return createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .slice(0, 16);
  }

  async getManifest(tenantId: string) {
    return this.db.mysql.themeSyncManifest.findUnique({
      where: { tenantId },
    });
  }

  async rebuild(tenantId: string): Promise<any> {
    // Fetch all themes with tokens for this tenant
    const themes = await this.db.mysql.theme.findMany({
      where: { tenantId },
      include: { tokens: true, brand: { select: { name: true } } },
    });

    const manifest = themes.map((t) => ({
      id: t.id,
      name: t.name,
      brand: t.brand?.name,
      mode: t.mode,
      status: t.status,
      version: t.version,
      isDefault: t.isDefault,
      tokenCount: t.tokens.length,
    }));

    const activeTheme = themes.find((t) => t.isDefault);
    const version = activeTheme?.version || '1.0.0';
    const checksum = this.buildChecksum(manifest);

    return this.db.mysql.themeSyncManifest.upsert({
      where: { tenantId },
      update: {
        version,
        checksum,
        manifest,
        lastSyncAt: new Date(),
      },
      create: {
        tenantId,
        version,
        checksum,
        manifest,
        lastSyncAt: new Date(),
      },
    });
  }

  async getSyncStatus(tenantId: string) {
    const manifest = await this.getManifest(tenantId);
    const appearance = await this.db.mysql.appearanceManager.findUnique({
      where: { tenantId },
    });

    return {
      synced: !!manifest,
      version: manifest?.version || '1.0.0',
      checksum: manifest?.checksum || null,
      lastSyncAt: manifest?.lastSyncAt || null,
      syncStatus: appearance?.syncStatus || 'PENDING',
      activeThemeId: appearance?.activeThemeId || null,
    };
  }

  async markSynced(tenantId: string, themeId: string) {
    const manifest = await this.getManifest(tenantId);
    const version = manifest?.version || '1.0.0';

    return this.db.mysql.appearanceManager.upsert({
      where: { tenantId },
      update: {
        activeThemeId: themeId,
        syncStatus: 'SYNCED',
        lastSyncAt: new Date(),
        currentVersion: version,
      },
      create: {
        tenantId,
        activeThemeId: themeId,
        syncStatus: 'SYNCED',
        lastSyncAt: new Date(),
        currentVersion: version,
      },
    });
  }
}
