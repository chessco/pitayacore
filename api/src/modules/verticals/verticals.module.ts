import { Module } from '@nestjs/common';
import { VerticalsService } from './verticals.service';
import { VerticalsController } from './verticals.controller';
import { DatabaseModule } from '../../common/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [VerticalsController],
  providers: [VerticalsService],
})
export class VerticalsModule {}
