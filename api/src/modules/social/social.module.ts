import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiModule } from '../ai/ai.module';

// Controllers
import { SocialBrandsController } from './brands/social-brands.controller';
import { SocialAudiencesController } from './audiences/social-audiences.controller';
import { SocialCampaignsController } from './campaigns/social-campaigns.controller';
import { SocialContentController } from './content/social-content.controller';
import { PublisherController } from './publisher/publisher.controller';
import { SocialOptimizationController } from './optimization/social-optimization.controller';
import { SocialTrendsController } from './trends/social-trends.controller';
import { SocialMemoryController } from './memory/social-memory.controller';
import { SocialAgentsController } from './agents/social-agents.controller';
import { CollectorController } from './collection/collector.controller';
import { SocialIntelligenceController } from './intelligence/social-intelligence.controller';

// Services / Engines
import { SocialBrandsService } from './brands/social-brands.service';
import { SocialAudiencesService } from './audiences/social-audiences.service';
import { SocialCampaignsService } from './campaigns/social-campaigns.service';
import { SocialContentService } from './content/social-content.service';
import { PublisherEngine } from './publisher/publisher.engine';
import { OptimizationEngine } from './optimization/optimization.engine';
import { TrendEngine } from './trends/trend.engine';
import { SocialMemoryService } from './memory/social-memory.service';
import { SocialAgentsService } from './agents/social-agents.service';
import { SocialSchedulerService } from './scheduler/social-scheduler.service';
import { HumanizerEngine } from './humanizer/humanizer.engine';
import { CollectorService } from './collection/collector.service';
import { ConnectorRegistry } from './accounts/connector-registry.service';
import { ConnectorAccountsService } from './accounts/connector-accounts.service';
import { TokenCryptoService } from './accounts/crypto/token-crypto.service';
import { NormalizerService } from './intelligence/normalizer/normalizer.service';
import { SisEventBus } from './events/social-intelligence.events';
import { SocialJobsService } from './jobs/social-jobs.service';
import { WebhookEngine } from './webhooks/webhook.engine';
import { SocialIntelligenceService } from './intelligence/social-intelligence.service';
import { OperationsModule } from '../operations/operations.module';

// Providers
import { ProviderRegistry } from './providers/provider.registry';
import { FacebookProvider } from './providers/facebook.provider';
import { InstagramProvider } from './providers/instagram.provider';
import { LinkedinProvider } from './providers/linkedin.provider';
import { XProvider } from './providers/x.provider';
import { TikTokProvider } from './providers/tiktok.provider';
import { WhatsAppStatusProvider } from './providers/whatsapp-status.provider';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { FacebookConnector } from './providers/facebook/facebook.connector';

// OAuth & provider management (PR8)
import { OAUTH_PROVIDERS } from './providers/oauth/provider-oauth.interface';
import { FacebookOAuthProvider } from './providers/oauth/facebook-oauth.provider';
import { ProviderOAuthRegistry } from './providers/oauth/provider-oauth-registry.service';
import { OAuthSessionService } from './providers/oauth/oauth-session.service';
import { SocialProvidersService } from './providers/oauth/social-providers.service';
import { SocialProvidersController } from './providers/oauth/social-providers.controller';

// SIS controllers/services that the refactor left unregistered (fix: 404s)
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { GeminiProvider } from '../../infrastructure/providers/ai/gemini.provider';
import { ConnectorsController } from './accounts/connectors.controller';
import { AnalyticsController } from './analytics/analytics.controller';
import { AnalyticsService } from './analytics/analytics.service';
import { TrendsService } from './analytics/trends.service';
import { AlertRulesController } from './intelligence/alerts/alert-rules.controller';
import { AlertRulesService } from './intelligence/alerts/alert-rules.service';
import { AlertsController } from './intelligence/alerts/alerts.controller';
import { AlertsService } from './intelligence/alerts/alerts.service';
import { AlertEngineService } from './intelligence/alerts/alert-engine.service';
import { ContentController } from './memory/collected-content/content.controller';
import { ContentService } from './memory/collected-content/content.service';
import { PipelineService } from './intelligence/ai/pipeline.service';
import { ContentAnalyzer } from './intelligence/ai/content-analyzer.service';
import { TopicCatalogService } from './intelligence/ai/topic-catalog.service';
import { KnowledgeController } from './memory/knowledge/knowledge.controller';
import { KnowledgeAdapterService } from './memory/knowledge/knowledge-adapter.service';
import { MandoController } from './services/mando/mando.controller';
import { MandoAdapterService } from './services/mando/mando-adapter.service';

@Module({
  imports: [AiModule, OperationsModule, HttpModule, KnowledgeBaseModule],
  controllers: [
    SocialBrandsController,
    SocialAudiencesController,
    SocialCampaignsController,
    SocialContentController,
    PublisherController,
    SocialOptimizationController,
    SocialTrendsController,
    SocialMemoryController,
    SocialAgentsController,
    CollectorController,
    SocialIntelligenceController,
    SocialProvidersController,
    // SIS controllers (were unregistered -> 404 in prod)
    ConnectorsController,
    AnalyticsController,
    AlertRulesController,
    AlertsController,
    ContentController,
    KnowledgeController,
    MandoController,
  ],
  providers: [
    SocialBrandsService,
    SocialAudiencesService,
    SocialCampaignsService,
    SocialContentService,
    PublisherEngine,
    OptimizationEngine,
    TrendEngine,
    SocialMemoryService,
    SocialAgentsService,
    SocialSchedulerService,
    HumanizerEngine,
    CollectorService,
    ConnectorRegistry,
    ConnectorAccountsService,
    TokenCryptoService,
    NormalizerService,
    SisEventBus,
    SocialJobsService,
    WebhookEngine,
    SocialIntelligenceService,
    ProviderRegistry,
    FacebookProvider,
    InstagramProvider,
    LinkedinProvider,
    XProvider,
    TikTokProvider,
    WhatsAppStatusProvider,
    ApiKeyGuard,
    FacebookConnector,
    {
      provide: 'SIS_SOCIAL_CONNECTORS',
      useFactory: (fb: FacebookConnector) => [fb],
      inject: [FacebookConnector],
    },
    // OAuth & provider management (PR8)
    FacebookOAuthProvider,
    {
      provide: OAUTH_PROVIDERS,
      useFactory: (facebook: FacebookOAuthProvider) => [facebook],
      inject: [FacebookOAuthProvider],
    },
    ProviderOAuthRegistry,
    OAuthSessionService,
    SocialProvidersService,
    // SIS services (were unregistered -> controllers 404)
    GeminiProvider,
    TopicCatalogService,
    ContentAnalyzer,
    PipelineService,
    ContentService,
    AnalyticsService,
    TrendsService,
    AlertRulesService,
    AlertsService,
    AlertEngineService,
    KnowledgeAdapterService,
    MandoAdapterService,
  ],
  exports: [
    SocialBrandsService,
    SocialAudiencesService,
    SocialCampaignsService,
    SocialContentService,
    PublisherEngine,
    OptimizationEngine,
    TrendEngine,
    SocialMemoryService,
    SocialAgentsService,
    HumanizerEngine,
    CollectorService,
    SocialJobsService,
    WebhookEngine,
    SocialIntelligenceService,
  ],
})
export class SocialModule {}
