import { Module } from '@nestjs/common';
import { VisionCampaignsController } from './vision-campaigns.controller';
import { VisionCampaignsService } from './vision-campaigns.service';
import { DatabaseModule } from '../../common/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [VisionCampaignsController],
  providers: [VisionCampaignsService],
})
export class VisionCampaignsModule {}
