import { Module } from '@nestjs/common';

// ── Existing controllers ──────────────────────────────────────────────
import { BrandsController } from './brands/brands.controller';
import { ThemesController } from './themes/themes.controller';
import { WhiteLabelController } from './white-label/white-label.controller';

// ── Existing services ─────────────────────────────────────────────────
import { ThemeGeneratorService } from './generators/theme-generator.service';
import { ThemeValidatorService } from './validators/theme-validator.service';

// ── Extended / new services ───────────────────────────────────────────
import { BrandsService } from './brands/brands.service';
import { ThemesService } from './themes/themes.service';
import { TokensService } from './design-tokens/tokens.service';
import { WhiteLabelService } from './white-label/white-label.service';

// ── New token controller ──────────────────────────────────────────────
import { TokensController } from './design-tokens/tokens.controller';

// ── Registry ──────────────────────────────────────────────────────────
import { ThemeRegistryService } from './registry/theme-registry.service';
import { ThemeRegistryController } from './registry/theme-registry.controller';

// ── Appearance ────────────────────────────────────────────────────────
import { AppearanceService } from './appearance/appearance.service';
import { AppearanceController } from './appearance/appearance.controller';

// ── Synchronization ───────────────────────────────────────────────────
import { ThemeSyncService } from './synchronization/sync.service';
import { SyncController } from './synchronization/sync.controller';

// ── Cache ─────────────────────────────────────────────────────────────
import { ThemeCacheService } from './cache/cache.service';
import { CacheController } from './cache/cache.controller';

// ── Audit ─────────────────────────────────────────────────────────────
import { DesignAuditService } from './audit/design-audit.service';
import { DesignAuditController } from './audit/design-audit.controller';

// ── Memory ────────────────────────────────────────────────────────────
import { DesignMemoryService } from './memory/design-memory.service';
import { DesignMemoryController } from './memory/design-memory.controller';

// ── WebSocket Gateway ─────────────────────────────────────────────────
import { DesignGateway } from './gateways/design.gateway';

// ── Workflow ──────────────────────────────────────────────────────────
import { BrandIdentityWorkflow } from './workflows/brand-identity.workflow';
import { WorkflowsController } from './workflows/workflows.controller';

// ── Design Architect Agent ────────────────────────────────────────────
import { DesignArchitectService } from './agents/design-architect.service';
import { DesignAgentsController } from './agents/design-agents.controller';

// ── External dependencies ─────────────────────────────────────────────
import { AiService } from '../ai/ai.service';

@Module({
  controllers: [
    // Existing
    BrandsController,
    ThemesController,
    WhiteLabelController,
    // New
    TokensController,
    ThemeRegistryController,
    AppearanceController,
    SyncController,
    CacheController,
    DesignAuditController,
    DesignMemoryController,
    WorkflowsController,
    DesignAgentsController,
  ],
  providers: [
    // ── Foundation (existing, extended) ────────────────────────────
    BrandsService,
    ThemesService,
    TokensService,
    ThemeGeneratorService,
    ThemeValidatorService,
    WhiteLabelService,
    AiService,

    // ── Core Design Suite services ──────────────────────────────────
    DesignAuditService,
    DesignMemoryService,
    ThemeCacheService,
    ThemeSyncService,
    AppearanceService,
    ThemeRegistryService,

    // ── WebSocket Gateway ───────────────────────────────────────────
    DesignGateway,

    // ── Workflow ─────────────────────────────────────────────────────
    BrandIdentityWorkflow,

    // ── Agent ────────────────────────────────────────────────────────
    DesignArchitectService,
  ],
  exports: [
    // Existing exports (unchanged — backward compatible)
    BrandsService,
    ThemesService,
    TokensService,
    WhiteLabelService,
    // New exports for cross-module consumption
    DesignAuditService,
    DesignMemoryService,
    ThemeCacheService,
    ThemeSyncService,
    AppearanceService,
    ThemeRegistryService,
    DesignGateway,
  ],
})
export class DesignModule {}
