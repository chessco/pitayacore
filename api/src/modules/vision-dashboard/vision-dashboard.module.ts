import { Module } from '@nestjs/common';
import { VisionDashboardController } from './vision-dashboard.controller';
import { VisionDashboardService } from './vision-dashboard.service';
import { DatabaseModule } from '../../common/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [VisionDashboardController],
  providers: [VisionDashboardService],
})
export class VisionDashboardModule {}
