import { Module } from '@nestjs/common';
import { CapsulesService } from './capsules.service';
import { CampaignService } from './campaign.service';
import { CapsulesController } from './capsules.controller';
import { CapsuleStudioController } from './capsule-studio.controller';
import { AudiencesController } from './audiences.controller';
import { AudiencesService } from './audiences.service';
import { UploadsController } from './uploads.controller';
import { DatabaseModule } from '../../common/database/database.module';
import { AiModule } from '../ai/ai.module';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { CombinedAuthGuard } from '../../common/guards/combined-auth.guard';
import { FeatureFlagGuard } from '../../common/guards/feature-flag.guard';

import { ConversationsModule } from '../conversations/conversations.module';
import { CrmModule } from '../crm/crm.module';
import { CommunicationModule } from '../communication/communication.module';

import { CampaignTrackingController } from './campaign-tracking.controller';

@Module({
  imports: [
    DatabaseModule,
    AiModule,
    ConversationsModule,
    CrmModule,
    CommunicationModule,
  ],
  controllers: [
    CapsulesController,
    CapsuleStudioController,
    AudiencesController,
    UploadsController,
    CampaignTrackingController,
  ],
  providers: [
    CapsulesService,
    CampaignService,
    AudiencesService,
    ApiKeyGuard,
    CombinedAuthGuard,
    FeatureFlagGuard,
  ],
  exports: [CapsulesService],
})
export class CapsulesModule {}
