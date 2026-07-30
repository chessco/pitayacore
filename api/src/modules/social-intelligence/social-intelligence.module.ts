import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SocialIntelligenceController } from './social-intelligence.controller';
import { SocialIntelligenceService } from './social-intelligence.service';
import { SisEventBus } from './events/social-intelligence.events';
import { TokenCryptoService } from './crypto/token-crypto.service';
import { SOCIAL_CONNECTORS } from './connectors/social-connector.interface';
import { FacebookConnector } from './connectors/facebook/facebook.connector';
import { ConnectorRegistry } from './connectors/connector-registry.service';
import { ConnectorAccountsService } from './connectors/connector-accounts.service';
import { ConnectorsController } from './connectors/connectors.controller';
import { NormalizerService } from './normalizer/normalizer.service';
import { CollectorService } from './collector/collector.service';
import { AiModule } from '../ai/ai.module';
import { GeminiProvider } from '../../infrastructure/providers/ai/gemini.provider';
import { TopicCatalogService } from './ai/topic-catalog.service';
import { ContentAnalyzer } from './ai/content-analyzer.service';
import { PipelineService } from './ai/pipeline.service';
import { ContentService } from './content/content.service';
import { ContentController } from './content/content.controller';
import { AlertRulesService } from './alerts/alert-rules.service';
import { AlertsService } from './alerts/alerts.service';
import { AlertEngineService } from './alerts/alert-engine.service';
import { AlertRulesController } from './alerts/alert-rules.controller';
import { AlertsController } from './alerts/alerts.controller';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { AnalyticsService } from './analytics/analytics.service';
import { TrendsService } from './analytics/trends.service';
import { AnalyticsController } from './analytics/analytics.controller';
import { KnowledgeAdapterService } from './knowledge/knowledge-adapter.service';
import { KnowledgeController } from './knowledge/knowledge.controller';

/**
 * Social Intelligence Suite (SIS).
 *
 * Fully decoupled, add-only module. Integrates with the rest of PitayaCore
 * exclusively through public exported services (AiService for embeddings, and
 * — in later PRs — KnowledgeBaseService) plus its own domain-event bus. It
 * never modifies existing modules and uses scalar `tenantId` columns (no FK to
 * Tenant) so it introduces zero changes to existing tables.
 *
 * Adding a new social network = implement ISocialConnector + add it to the
 * SOCIAL_CONNECTORS factory below. Nothing else in the module changes.
 */
@Module({
  imports: [HttpModule, AiModule, KnowledgeBaseModule],
  controllers: [
    SocialIntelligenceController,
    ConnectorsController,
    ContentController,
    AlertRulesController,
    AlertsController,
    AnalyticsController,
    KnowledgeController,
  ],
  providers: [
    SocialIntelligenceService,
    SisEventBus,
    TokenCryptoService,
    // Connectors
    FacebookConnector,
    {
      provide: SOCIAL_CONNECTORS,
      useFactory: (facebook: FacebookConnector) => [facebook],
      inject: [FacebookConnector],
    },
    ConnectorRegistry,
    ConnectorAccountsService,
    NormalizerService,
    CollectorService,
    // AI pipeline (7 agents) + embeddings
    GeminiProvider,
    TopicCatalogService,
    ContentAnalyzer,
    PipelineService,
    // Read side
    ContentService,
    // Alert engine (PR4)
    AlertRulesService,
    AlertsService,
    AlertEngineService,
    // Analytics + Knowledge integration (PR5)
    AnalyticsService,
    TrendsService,
    KnowledgeAdapterService,
  ],
  exports: [SocialIntelligenceService, SisEventBus],
})
export class SocialIntelligenceModule {}
