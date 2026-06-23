import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationsGateway } from './conversations.gateway';
import { DatabaseModule } from '../../common/database/database.module';
import { AiModule } from '../ai/ai.module';
import { HttpModule } from '@nestjs/axios';
import { ConversationsController } from './conversations.controller';

@Module({
  imports: [DatabaseModule, AiModule, HttpModule],
  providers: [ConversationsService, ConversationsGateway],
  exports: [ConversationsService],
  controllers: [ConversationsController],
})
export class ConversationsModule {}
