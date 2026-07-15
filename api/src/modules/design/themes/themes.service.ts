import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';
import { DesignAuditService } from '../audit/design-audit.service';
import { ThemeSyncService } from '../synchronization/sync.service';
import { ThemeCacheService } from '../cache/cache.service';
import { AppearanceService } from '../appearance/appearance.service';
import { DesignGateway } from '../gateways/design.gateway';

@Injectable()
export class ThemesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: DesignAuditService,
    private readonly sync: ThemeSyncService,
    private readonly cache: ThemeCacheService,
    private readonly appearance: AppearanceService,
    private readonly gateway: DesignGateway,
  ) {}

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

    const theme = await this.db.mysql.theme.create({
      data: {
        ...themeData,
        tenantId,
      },
    });

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

    if (assets && Array.isArray(assets)) {
      await this.db.mysql.themeAsset.createMany({
        data: assets.map((a: any) => ({
          themeId: theme.id,
          key: a.key,
          value: a.value,
        })),
      });
    }

    await this.db.mysql.themeVersion.create({
      data: {
        themeId: theme.id,
        version: theme.version,
        tokens: tokens ? JSON.stringify(tokens) : '{}',
        status: 'ACTIVE',
      },
    });

    // Audit
    await this.audit.log({
      tenantId,
      action: 'ThemeCreated',
      entity: 'Theme',
      entityId: theme.id,
      after: { name: theme.name, mode: theme.mode, status: theme.status },
    });

    // Rebuild sync manifest
    await this.sync.rebuild(tenantId).catch(() => {});

    return this.findOne(theme.id, tenantId);
  }

  async activate(id: string, tenantId: string) {
    const before = await this.findOne(id, tenantId);

    await this.db.mysql.theme.updateMany({
      where: { tenantId, isDefault: true },
      data: { isDefault: false },
    });

    const updated = await this.db.mysql.theme.update({
      where: { id },
      data: { isDefault: true, status: 'ACTIVE' },
    });

    // Audit
    await this.audit.log({
      tenantId,
      action: 'ThemeActivated',
      entity: 'Theme',
      entityId: id,
      before: { isDefault: before?.isDefault },
      after: { isDefault: true, status: 'ACTIVE' },
    });

    // Update Appearance Manager
    await this.appearance
      .updateAfterActivation(
        tenantId,
        id,
        updated.version,
        updated.mode,
        updated.brandId,
      )
      .catch(() => {});

    // Rebuild sync manifest
    const manifest = await this.sync.rebuild(tenantId).catch(() => null);

    // Update cache
    const tokens = await this.db.mysql.themeToken.findMany({
      where: { themeId: id },
    });
    await this.cache
      .upsertCache(tenantId, id, updated.version, tokens)
      .catch(() => {});

    // WebSocket event
    this.gateway.emitThemeActivated(tenantId, id, updated.version);
    if (manifest) {
      this.gateway.emitSyncCompleted(
        tenantId,
        manifest.version,
        manifest.checksum,
      );
    }

    return updated;
  }

  async duplicate(id: string, tenantId: string, newName: string) {
    const existing = await this.findOne(id, tenantId);
    if (!existing) throw new NotFoundException('Theme not found');

    return this.create(tenantId, {
      brandId: existing.brandId,
      name: newName,
      description: `Copia de ${existing.name}`,
      mode: existing.mode,
      status: 'DRAFT',
      version: '1.0.0',
      tokens: existing.tokens,
      assets: existing.assets,
    });
  }

  async createVersion(
    id: string,
    tenantId: string,
    version: string,
    tokens: any,
  ) {
    const theme = await this.findOne(id, tenantId);
    if (!theme) throw new NotFoundException('Theme not found');

    await this.db.mysql.themeVersion.create({
      data: {
        themeId: id,
        version,
        tokens: JSON.stringify(tokens),
        status: 'DRAFT',
      },
    });

    await this.db.mysql.themeToken.deleteMany({ where: { themeId: id } });
    await this.db.mysql.themeToken.createMany({
      data: tokens.map((t: any) => ({
        themeId: id,
        name: t.name,
        value: t.value,
        type: t.type || 'color',
      })),
    });

    const updated = await this.db.mysql.theme.update({
      where: { id },
      data: { version },
    });

    // Audit
    await this.audit.log({
      tenantId,
      action: 'ThemeVersionCreated',
      entity: 'Theme',
      entityId: id,
      after: { version },
    });

    // Invalidate cache for this theme
    await this.cache.invalidate(tenantId, id).catch(() => {});

    // Rebuild manifest
    await this.sync.rebuild(tenantId).catch(() => {});

    // WebSocket event
    this.gateway.emitThemeVersionCreated(tenantId, id, version);

    return updated;
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

    await this.db.mysql.themeToken.deleteMany({ where: { themeId: id } });
    await this.db.mysql.themeToken.createMany({
      data: tokens.map((t: any) => ({
        themeId: id,
        name: t.name,
        value: t.value,
        type: t.type || 'color',
      })),
    });

    const updated = await this.db.mysql.theme.update({
      where: { id },
      data: {
        version: versionRecord.version,
        status: 'ACTIVE',
      },
    });

    // Audit
    await this.audit.log({
      tenantId,
      action: 'ThemeRolledBack',
      entity: 'Theme',
      entityId: id,
      after: { version: versionRecord.version, versionId },
    });

    // Invalidate cache
    await this.cache.invalidate(tenantId, id).catch(() => {});

    // Rebuild manifest
    await this.sync.rebuild(tenantId).catch(() => {});

    // WebSocket event
    this.gateway.emitThemeRolledBack(tenantId, id, versionRecord.version);

    return updated;
  }

  async delete(id: string, tenantId: string) {
    await this.audit.log({
      tenantId,
      action: 'ThemeDeleted',
      entity: 'Theme',
      entityId: id,
    });

    await this.cache.invalidate(tenantId, id).catch(() => {});

    return this.db.mysql.theme.deleteMany({
      where: { id, tenantId },
    });
  }
}
