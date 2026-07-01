import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './common/database/database.module';
import { TenantMiddleware } from './common/tenant/tenant.middleware';
import { TenantsModule } from './modules/tenants/tenants.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { HitlModule } from './modules/hitl/hitl.module';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { KnowledgeBaseModule } from './modules/knowledge-base/knowledge-base.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SkillsModule } from './modules/skills/skills.module';
import { AgentsModule } from './modules/agents/agents.module';
import { CapsulesModule } from './modules/capsules/capsules.module';
import { UsersModule } from './modules/users/users.module';
import { EcommerceModule } from './modules/ecommerce/ecommerce.module';
import { CrmModule } from './modules/crm/crm.module';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import { CombinedAuthGuard } from './common/guards/combined-auth.guard';
import { MailModule } from './common/mail/mail.module';
import { SystemSettingsModule } from './modules/system-settings/system-settings.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';

import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { VerticalsModule } from './modules/verticals/verticals.module';
import { AssetsModule } from './modules/assets/assets.module';
import { CharactersModule } from './modules/characters/characters.module';
import { AgentTemplatesModule } from './modules/agent-templates/agent-templates.module';
import { CreditsModule } from './modules/credits/credits.module';
import { VisionModule } from './modules/vision/vision.module';
import { ChatSessionsModule } from './modules/chat-sessions/chat-sessions.module';
import { BrandsModule } from './modules/brands/brands.module';
import { VisionCampaignsModule } from './modules/vision-campaigns/vision-campaigns.module';
import { VectorSearchModule } from './modules/vector-search/vector-search.module';
import { VisionDashboardModule } from './modules/vision-dashboard/vision-dashboard.module';
import { SocialPostsModule } from './modules/social-posts/social-posts.module';
import { IdentityModule } from './modules/identity/identity.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CommunicationModule } from './modules/communication/communication.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      serveRoot: '/static',
    }),
    DatabaseModule,
    TenantsModule,
    WebhooksModule,
    ConversationsModule,
    HitlModule,
    AiModule,
    AuthModule,
    KnowledgeBaseModule,
    AnalyticsModule,
    SkillsModule,
    AgentsModule,
    CapsulesModule,
    UsersModule,
    EcommerceModule,
    CrmModule,
    MailModule,
    SystemSettingsModule,
    WorkspaceModule,
    VerticalsModule,
    AssetsModule,
    CharactersModule,
    AgentTemplatesModule,
    CreditsModule,
    VisionModule,
    ChatSessionsModule,
    BrandsModule,
    VisionCampaignsModule,
    VectorSearchModule,
    VisionDashboardModule,
    SocialPostsModule,
    IdentityModule,
    CommunicationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ApiKeyGuard,
    {
      provide: APP_GUARD,
      useClass: CombinedAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes({ path: '(.*)', method: RequestMethod.ALL });
  }
}
