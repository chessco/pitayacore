import { Module } from '@nestjs/common';
import { ChatSessionsController } from './chat-sessions.controller';
import { ChatSessionsService } from './chat-sessions.service';
import { AgentsModule } from '../agents/agents.module';
import { DatabaseModule } from '../../common/database/database.module';
import { GeminiProvider } from '../../infrastructure/providers/ai/gemini.provider';
import { FalProvider } from '../../infrastructure/providers/image/fal.provider';
import { R2StorageProvider } from '../../infrastructure/providers/storage/r2-storage.provider';

@Module({
  imports: [DatabaseModule, AgentsModule],
  controllers: [ChatSessionsController],
  providers: [ChatSessionsService, GeminiProvider, FalProvider, R2StorageProvider],
})
export class ChatSessionsModule {}
