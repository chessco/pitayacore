import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { COMMUNICATION_EVENTS, MessageReceivedEvent } from '../events/communication.events';
import { AiRouterService } from '../../ai/ai-router.service';
import { WhatsappWebProvider } from '../providers/whatsapp-web/whatsapp-web.provider';
import { DatabaseService } from '../../../common/database/database.service';

@Injectable()
export class AgentRouterService {
  private readonly logger = new Logger(AgentRouterService.name);

  constructor(
    private readonly aiRouter: AiRouterService,
    private readonly whatsappProvider: WhatsappWebProvider,
    private readonly db: DatabaseService,
  ) {}

  @OnEvent(COMMUNICATION_EVENTS.MESSAGE_RECEIVED)
  async handleMessageReceived(event: MessageReceivedEvent) {
    this.logger.log(`AgentRouter received message from ${event.from} via ${event.provider} for tenant ${event.tenantId}`);
    
    try {
      // 1. Get or create Contact
      let contact = await this.db.mysql.contact.findFirst({
        where: { tenantId: event.tenantId, externalId: event.from, provider: event.provider },
      });

      if (!contact) {
        contact = await this.db.mysql.contact.create({
          data: {
            tenantId: event.tenantId,
            name: event.from, // default name
            externalId: event.from,
            provider: event.provider,
            phone: event.from.split('@')[0],
          },
        });
      }

      // 2. Get or create active Conversation
      let conversation = await this.db.mysql.conversation.findFirst({
        where: {
          tenantId: event.tenantId,
          contactId: contact.id,
          provider: event.provider,
          status: 'ACTIVE',
        },
      });

      if (!conversation) {
        conversation = await this.db.mysql.conversation.create({
          data: {
            tenantId: event.tenantId,
            contactId: contact.id,
            provider: event.provider,
            status: 'ACTIVE',
          },
        });
      }

      // 3. Save incoming message
      await this.db.mysql.message.create({
        data: {
          conversationId: conversation.id,
          provider: event.provider,
          direction: 'INBOUND',
          messageType: 'TEXT',
          content: event.content,
        },
      });

      // 4. Route to Agent Runtime (AI Router)
      // AiRouter.route historically returned a structured response string or payload.
      const response = await this.aiRouter.route(event.content, event.tenantId);

      // 5. Send back via provider
      if (response && event.provider === 'whatsapp') {
        const responseText = typeof response === 'string' ? response : JSON.stringify(response);
        await this.whatsappProvider.sendMessage(event.tenantId, event.channelId, event.from, responseText);
        
        // 6. Save outgoing message
        await this.db.mysql.message.create({
          data: {
            conversationId: conversation.id,
            provider: event.provider,
            direction: 'OUTBOUND',
            messageType: 'TEXT',
            content: responseText,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to route message for tenant ${event.tenantId}`, error);
    }
  }
}