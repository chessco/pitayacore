import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';

@Injectable()
export class AppearanceService {
  constructor(private readonly db: DatabaseService) {}

  async getState(tenantId: string) {
    let appearance = await this.db.mysql.appearanceManager.findUnique({
      where: { tenantId },
    });

    if (!appearance) {
      // Bootstrap from active theme if exists
      const activeTheme = await this.db.mysql.theme.findFirst({
        where: { tenantId, isDefault: true },
        include: { brand: { select: { id: true, name: true } } },
      });

      appearance = await this.db.mysql.appearanceManager.create({
        data: {
          tenantId,
          activeThemeId: activeTheme?.id || null,
          activeBrandId: activeTheme?.brandId || null,
          currentVersion: activeTheme?.version || '1.0.0',
          currentMode: activeTheme?.mode || 'LIGHT',
          syncStatus: 'SYNCED',
        },
      });
    }

    // Enrich with live theme data
    const activeTheme = appearance.activeThemeId
      ? await this.db.mysql.theme.findUnique({
          where: { id: appearance.activeThemeId },
          include: {
            tokens: true,
            brand: { select: { id: true, name: true, logo: true } },
          },
        })
      : null;

    const previewTheme = appearance.previewThemeId
      ? await this.db.mysql.theme.findUnique({
          where: { id: appearance.previewThemeId },
          include: { tokens: true },
        })
      : null;

    return {
      ...appearance,
      activeTheme,
      previewTheme,
    };
  }

  async switchMode(tenantId: string, mode: 'LIGHT' | 'DARK' | 'AUTO') {
    return this.db.mysql.appearanceManager.upsert({
      where: { tenantId },
      update: { currentMode: mode, updatedAt: new Date() },
      create: {
        tenantId,
        currentMode: mode,
        syncStatus: 'SYNCED',
      },
    });
  }

  async setPreview(tenantId: string, themeId: string) {
    // Verify theme belongs to tenant
    const theme = await this.db.mysql.theme.findFirst({
      where: { id: themeId, tenantId },
    });

    if (!theme) {
      throw new Error('Theme not found or does not belong to this tenant');
    }

    return this.db.mysql.appearanceManager.upsert({
      where: { tenantId },
      update: { previewThemeId: themeId, updatedAt: new Date() },
      create: {
        tenantId,
        previewThemeId: themeId,
        syncStatus: 'PENDING',
      },
    });
  }

  async applyPreview(tenantId: string) {
    const appearance = await this.db.mysql.appearanceManager.findUnique({
      where: { tenantId },
    });

    if (!appearance?.previewThemeId) {
      throw new Error('No preview theme is currently set');
    }

    const themeId = appearance.previewThemeId;
    const theme = await this.db.mysql.theme.findUnique({
      where: { id: themeId },
    });

    if (!theme) throw new Error('Preview theme not found');

    // Deactivate current default
    await this.db.mysql.theme.updateMany({
      where: { tenantId, isDefault: true },
      data: { isDefault: false },
    });

    // Activate previewed theme
    await this.db.mysql.theme.update({
      where: { id: themeId },
      data: { isDefault: true, status: 'ACTIVE' },
    });

    return this.db.mysql.appearanceManager.update({
      where: { tenantId },
      data: {
        activeThemeId: themeId,
        activeBrandId: theme.brandId,
        previewThemeId: null,
        currentMode: theme.mode as any,
        currentVersion: theme.version,
        syncStatus: 'SYNCED',
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async updateAfterActivation(
    tenantId: string,
    themeId: string,
    version: string,
    mode: string,
    brandId: string,
  ) {
    return this.db.mysql.appearanceManager.upsert({
      where: { tenantId },
      update: {
        activeThemeId: themeId,
        activeBrandId: brandId,
        currentVersion: version,
        currentMode: mode,
        syncStatus: 'SYNCED',
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        tenantId,
        activeThemeId: themeId,
        activeBrandId: brandId,
        currentVersion: version,
        currentMode: mode,
        syncStatus: 'SYNCED',
        lastSyncAt: new Date(),
      },
    });
  }
}
