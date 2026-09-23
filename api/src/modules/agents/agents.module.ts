import { Module, forwardRef } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { DatabaseModule } from '../../common/database/database.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { ProBuyerWebhookService } from '../communication/services/probuyer-webhook.service';

@Module({
  imports: [DatabaseModule, forwardRef(() => ConversationsModule)],
  controllers: [AgentsController],
  providers: [AgentsService, ProBuyerWebhookService],
  exports: [AgentsService],
})
export class AgentsModule {}
