import { Module } from '@nestjs/common';
import { ChatSessionsController } from './chat-sessions.controller';
import { ChatSessionsService } from './chat-sessions.service';
import { AgentsModule } from '../agents/agents.module';
import { DatabaseModule } from '../../common/database/database.module';
import { GeminiProvider } from '../../infrastructure/providers/ai/gemini.provider';
import { FalProvider } from '../../infrastructure/providers/image/fal.provider';

@Module({
  imports: [DatabaseModule, AgentsModule],
  controllers: [ChatSessionsController],
  providers: [ChatSessionsService, GeminiProvider, FalProvider],
})
export class ChatSessionsModule {}
