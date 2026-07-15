import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';

export type ThemeRegistryStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

@Injectable()
export class ThemeRegistryService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Returns all themes in the registry for a tenant, grouped by status.
   */
  async getRegistry(tenantId: string) {
    const themes = await this.db.mysql.theme.findMany({
      where: { tenantId },
      include: {
        tokens: true,
        brand: { select: { id: true, name: true, logo: true } },
        versions: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      drafts: themes.filter((t) => t.status === 'DRAFT'),
      active: themes.filter((t) => t.status === 'ACTIVE'),
      archived: themes.filter((t) => t.status === 'ARCHIVED'),
      total: themes.length,
    };
  }

  /**
   * Publish a DRAFT theme → moves it to ACTIVE state.
   * Every publish creates a new ThemeVersion snapshot.
   */
  async publish(themeId: string, tenantId: string) {
    const theme = await this.db.mysql.theme.findFirst({
      where: { id: themeId, tenantId },
      include: { tokens: true },
    });

    if (!theme) throw new NotFoundException('Theme not found');
    if (theme.status === 'ARCHIVED') {
      throw new Error('Cannot publish an archived theme. Duplicate it first.');
    }

    // Bump version (1.0.0 → 1.0.1 etc.)
    const parts = (theme.version || '1.0.0').split('.').map(Number);
    parts[2] = (parts[2] || 0) + 1;
    const newVersion = parts.join('.');

    // Create version snapshot
    await this.db.mysql.themeVersion.create({
      data: {
        themeId,
        version: newVersion,
        tokens: theme.tokens,
        status: 'ACTIVE',
      },
    });

    return this.db.mysql.theme.update({
      where: { id: themeId },
      data: { status: 'ACTIVE', version: newVersion, updatedAt: new Date() },
    });
  }

  /**
   * Archive a theme. Does not delete — preserves full history.
   */
  async archive(themeId: string, tenantId: string) {
    const theme = await this.db.mysql.theme.findFirst({
      where: { id: themeId, tenantId },
    });

    if (!theme) throw new NotFoundException('Theme not found');
    if (theme.isDefault) {
      throw new Error(
        'Cannot archive the currently active default theme. Activate another first.',
      );
    }

    return this.db.mysql.theme.update({
      where: { id: themeId },
      data: { status: 'ARCHIVED', isDefault: false, updatedAt: new Date() },
    });
  }

  /**
   * Restore an archived theme back to DRAFT.
   */
  async restore(themeId: string, tenantId: string) {
    const theme = await this.db.mysql.theme.findFirst({
      where: { id: themeId, tenantId, status: 'ARCHIVED' },
    });

    if (!theme) throw new NotFoundException('Archived theme not found');

    return this.db.mysql.theme.update({
      where: { id: themeId },
      data: { status: 'DRAFT', updatedAt: new Date() },
    });
  }

  /**
   * Returns full version history for a theme.
   */
  async getVersionHistory(themeId: string) {
    return this.db.mysql.themeVersion.findMany({
      where: { themeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Returns a specific version's token snapshot.
   */
  async getVersionSnapshot(themeId: string, versionId: string) {
    const version = await this.db.mysql.themeVersion.findFirst({
      where: { id: versionId, themeId },
    });

    if (!version) throw new NotFoundException('Version not found');
    return version;
  }
}
