import { Module } from '@nestjs/common';
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

@Module({
  imports: [AiModule, OperationsModule],
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
    ProviderRegistry,
    FacebookProvider,
    InstagramProvider,
    LinkedinProvider,
    XProvider,
    TikTokProvider,
    WhatsAppStatusProvider,
    ApiKeyGuard,
    FacebookConnector,
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
  ],
})
export class SocialModule {}
