import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';

@Injectable()
export class ThemesService {
  constructor(private readonly db: DatabaseService) {}

  async findByTenant(tenantId: string) {
    return this.db.mysql.theme.findMany({
      where: { tenantId },
      include: { tokens: true, assets: true },
    });
  }

  async findOne(id: string, tenantId: string) {
    return this.db.mysql.theme.findFirst({
      where: { id, tenantId },
      include: { tokens: true, assets: true },
    });
  }

  async create(tenantId: string, data: any) {
    const { tokens, assets, ...themeData } = data;

    // Create main theme
    const theme = await this.db.mysql.theme.create({
      data: {
        ...themeData,
        tenantId,
      },
    });

    // Bulk create tokens if present
    if (tokens && Array.isArray(tokens)) {
      await this.db.mysql.themeToken.createMany({
        data: tokens.map((t: any) => ({
          themeId: theme.id,
          name: t.name,
          value: t.value,
          type: t.type || 'color',
        })),
      });
    }

    // Bulk create assets if present
    if (assets && Array.isArray(assets)) {
      await this.db.mysql.themeAsset.createMany({
        data: assets.map((a: any) => ({
          themeId: theme.id,
          key: a.key,
          value: a.value,
        })),
      });
    }

    // Save initial version entry
    await this.db.mysql.themeVersion.create({
      data: {
        themeId: theme.id,
        version: theme.version,
        tokens: tokens ? JSON.stringify(tokens) : '{}',
        status: 'ACTIVE',
      },
    });

    return this.findOne(theme.id, tenantId);
  }

  async activate(id: string, tenantId: string) {
    // Deactivate current default themes for this tenant
    await this.db.mysql.theme.updateMany({
      where: { tenantId, isDefault: true },
      data: { isDefault: false },
    });

    // Activate this specific theme
    return this.db.mysql.theme.update({
      where: { id },
      data: { isDefault: true, status: 'ACTIVE' },
    });
  }

  async duplicate(id: string, tenantId: string, newName: string) {
    const existing = await this.findOne(id, tenantId);
    if (!existing) throw new NotFoundException('Theme not found');

    const newTheme = await this.create(tenantId, {
      brandId: existing.brandId,
      name: newName,
      description: `Copia de ${existing.name}`,
      mode: existing.mode,
      status: 'DRAFT',
      version: '1.0.0',
      tokens: existing.tokens,
      assets: existing.assets,
    });

    return newTheme;
  }

  async createVersion(
    id: string,
    tenantId: string,
    version: string,
    tokens: any,
  ) {
    const theme = await this.findOne(id, tenantId);
    if (!theme) throw new NotFoundException('Theme not found');

    // Create version
    await this.db.mysql.themeVersion.create({
      data: {
        themeId: id,
        version,
        tokens: JSON.stringify(tokens),
        status: 'DRAFT',
      },
    });

    // Update tokens on database
    await this.db.mysql.themeToken.deleteMany({ where: { themeId: id } });
    await this.db.mysql.themeToken.createMany({
      data: tokens.map((t: any) => ({
        themeId: id,
        name: t.name,
        value: t.value,
        type: t.type || 'color',
      })),
    });

    // Update main theme version
    return this.db.mysql.theme.update({
      where: { id },
      data: { version },
    });
  }

  async getVersions(id: string) {
    return this.db.mysql.themeVersion.findMany({
      where: { themeId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async rollback(id: string, tenantId: string, versionId: string) {
    const versionRecord = await this.db.mysql.themeVersion.findUnique({
      where: { id: versionId },
    });
    if (!versionRecord) throw new NotFoundException('Version not found');

    const tokens = JSON.parse(versionRecord.tokens as string);

    // Apply tokens
    await this.db.mysql.themeToken.deleteMany({ where: { themeId: id } });
    await this.db.mysql.themeToken.createMany({
      data: tokens.map((t: any) => ({
        themeId: id,
        name: t.name,
        value: t.value,
        type: t.type || 'color',
      })),
    });

    // Update main theme
    return this.db.mysql.theme.update({
      where: { id },
      data: {
        version: versionRecord.version,
        status: 'ACTIVE',
      },
    });
  }

  async delete(id: string, tenantId: string) {
    return this.db.mysql.theme.deleteMany({
      where: { id, tenantId },
    });
  }
}
