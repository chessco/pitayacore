import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';

import { FilesystemSessionStorageProvider } from './providers/session-storage/filesystem-session-storage.provider';
import { WhatsappWebProvider } from './providers/whatsapp-web/whatsapp-web.provider';
import { CommunicationEventBusService } from './events/communication-event-bus.service';
import { SessionService } from './sessions/session.service';
import { SessionController } from './sessions/session.controller';
import { ContactService } from './contacts/contact.service';
import { ConversationService } from './conversations/conversation.service';
import { MessageService } from './messages/message.service';
import { InboxService } from './agent-inbox/inbox.service';
import { InboxController } from './agent-inbox/inbox.controller';
import { CommunicationGateway } from './gateways/communication.gateway';
import { AgentInboxGateway } from './gateways/agent-inbox.gateway';
import { PresenceGateway } from './gateways/presence.gateway';
import { AgentRouterService } from './services/agent-router.service';

import { AiModule } from '../ai/ai.module';
import { DatabaseModule } from '../../common/database/database.module';
import { VectorSearchModule } from '../vector-search/vector-search.module';
import { ChannelsModule } from './channels/channels.module';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(), // Setup event emitter for the module
    DatabaseModule,
    AiModule,
    VectorSearchModule,
    ChannelsModule,
  ],
  providers: [
    FilesystemSessionStorageProvider,
    CommunicationEventBusService,
    WhatsappWebProvider,
    
    // Core Services
    SessionService,
    ContactService,
    ConversationService,
    MessageService,
    InboxService,
    AgentRouterService,

    // Gateways
    CommunicationGateway,
    AgentInboxGateway,
    PresenceGateway,
  ],
  controllers: [SessionController, InboxController],
  exports: [
    WhatsappWebProvider,
    CommunicationEventBusService,
    SessionService,
    ContactService,
    ConversationService,
    MessageService,
  ],
})
export class CommunicationModule {}