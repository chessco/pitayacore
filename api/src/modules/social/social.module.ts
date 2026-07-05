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

// Providers
import { ProviderRegistry } from './providers/provider.registry';
import { FacebookProvider } from './providers/facebook.provider';
import { InstagramProvider } from './providers/instagram.provider';
import { LinkedinProvider } from './providers/linkedin.provider';
import { XProvider } from './providers/x.provider';
import { TikTokProvider } from './providers/tiktok.provider';
import { WhatsAppStatusProvider } from './providers/whatsapp-status.provider';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@Module({
  imports: [AiModule],
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
    ProviderRegistry,
    FacebookProvider,
    InstagramProvider,
    LinkedinProvider,
    XProvider,
    TikTokProvider,
    WhatsAppStatusProvider,
    ApiKeyGuard,
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
  ],
})
export class SocialModule {}
