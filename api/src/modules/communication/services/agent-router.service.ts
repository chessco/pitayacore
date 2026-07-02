import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import {
  COMMUNICATION_EVENTS,
  MessageReceivedEvent,
} from '../events/communication.events';
import { AiRouterService } from '../../ai/ai-router.service';
import { WhatsappWebProvider } from '../providers/whatsapp-web/whatsapp-web.provider';
import { DatabaseService } from '../../../common/database/database.service';
import { AgentInboxGateway } from '../gateways/agent-inbox.gateway';

@Injectable()
export class AgentRouterService {
  private readonly logger = new Logger(AgentRouterService.name);

  constructor(
    private readonly aiRouter: AiRouterService,
    private readonly whatsappProvider: WhatsappWebProvider,
    private readonly db: DatabaseService,
    private readonly inboxGateway: AgentInboxGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(COMMUNICATION_EVENTS.MESSAGE_RECEIVED)
  async handleMessageReceived(event: MessageReceivedEvent) {
    this.logger.log(
      `AgentRouter received message from ${event.from} via ${event.provider} for tenant ${event.tenantId}`,
    );

    try {
      // 1. Get or create Contact
      let contact = await this.db.mysql.contact.findFirst({
        where: {
          tenantId: event.tenantId,
          externalId: event.from,
          provider: event.provider,
        },
      });

      const cleanPhone = event.from.includes('@')
        ? event.from.split('@')[0]
        : event.from;

      if (!contact) {
        contact = await this.db.mysql.contact.create({
          data: {
            tenantId: event.tenantId,
            name: cleanPhone,
            externalId: event.from,
            provider: event.provider,
            phone: cleanPhone,
          },
        });
      } else if (contact.name?.includes('@')) {
        contact = await this.db.mysql.contact.update({
          where: { id: contact.id },
          data: { name: cleanPhone, phone: cleanPhone },
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

      const isNewConversation = !conversation;

      if (!conversation) {
        // By default, turn OFF AI so it doesn't spam (especially groups)
        const isGroup = event.from.includes('@g.us');
        const defaultMetadata = { 
          humanActiveUntil: "2099-12-31T23:59:59.999Z", 
          reason: isGroup ? "Group chat default OFF" : "Default OFF per user request" 
        };

        conversation = await this.db.mysql.conversation.create({
          data: {
            tenantId: event.tenantId,
            contactId: contact.id,
            provider: event.provider,
            status: 'ACTIVE',
            metadata: defaultMetadata,
          },
        });
      }

      let finalContent = event.content;
      if (!finalContent || finalContent.trim() === '') {
        const rawType = event.rawMessage?.type;
        const rawBody = event.rawMessage?._data?.body;
        
        if (rawBody && typeof rawBody === 'string' && rawBody.trim() !== '') {
          finalContent = rawBody;
        } else if (rawType === 'ciphertext') {
          finalContent = "*(Mensaje cifrado/sincronizando)*";
        } else {
          finalContent = `*(Mensaje sin texto - tipo: ${rawType || 'desconocido'})*`;
        }
      }

      // 3. Save incoming message
      const inboundMessage = await this.db.mysql.message.create({
        data: {
          conversationId: conversation.id,
          provider: event.provider,
          direction: 'INBOUND',
          messageType: 'TEXT',
          content: finalContent,
        },
      });

      // Update conversation lastMessageAt
      await this.db.mysql.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });

      // Broadcast to agent-inbox WebSocket
      const displayName = contact.phone || contact.name || 'Nuevo Usuario';
      this.inboxGateway.broadcastNewMessage(event.tenantId, {
        id: inboundMessage.id,
        conversationId: conversation.id,
        content: finalContent,
        direction: 'INBOUND',
        provider: event.provider,
        senderId: displayName,
        createdAt: inboundMessage.createdAt,
      });

      if (isNewConversation) {
        this.inboxGateway.broadcastNewConversation(event.tenantId, {
          id: conversation.id,
          tenantId: event.tenantId,
          contactId: contact.id,
          provider: event.provider,
          status: 'ACTIVE',
          contact: {
            name: displayName,
            externalId: contact.externalId,
            phone: contact.phone,
          },
          messages: [
            {
              content: finalContent,
              direction: 'INBOUND',
              createdAt: inboundMessage.createdAt,
            },
          ],
          lastMessageAt: new Date().toISOString(),
        });
      }

      // Index in vector memory
      this.eventEmitter.emit('communication.message.received', {
        tenantId: event.tenantId,
        conversationId: conversation.id,
        messageId: inboundMessage.id,
        content: event.content,
        role: 'user',
      });

      // 4. Check if human is active (Intervened / Autopilot OFF)
      const convMetadata = (conversation.metadata as any) || {};
      const humanActiveUntil = convMetadata.humanActiveUntil
        ? new Date(convMetadata.humanActiveUntil)
        : null;

      let shouldRouteToAi = false;
      // Default is OFF. AI only responds if humanActiveUntil is explicitly set to the past.
      if (humanActiveUntil && humanActiveUntil <= new Date()) {
        shouldRouteToAi = true;
      }

      if (!shouldRouteToAi) {
        this.logger.log(
          `Skipping AI response for conversation ${conversation.id}: Human is in control until ${humanActiveUntil?.toISOString() || 'undefined (default OFF)'}`,
        );
        return;
      }

      // 5. Route to Agent Runtime (AI Router)
      const response = await this.aiRouter.route(event.content, event.tenantId);

      // 5. Send back via provider
      if (response && event.provider === 'whatsapp') {
        const responseText =
          typeof response === 'string' ? response : JSON.stringify(response);

        await this.whatsappProvider.sendMessage(
          event.tenantId,
          event.channelId,
          event.from,
          responseText,
        );

        // 6. Save outgoing message
        const outboundMessage = await this.db.mysql.message.create({
          data: {
            conversationId: conversation.id,
            provider: event.provider,
            direction: 'OUTBOUND',
            messageType: 'TEXT',
            content: responseText,
          },
        });

        // Update conversation lastMessageAt
        await this.db.mysql.conversation.update({
          where: { id: conversation.id },
          data: { lastMessageAt: new Date() },
        });

        // Broadcast outbound to agent-inbox WebSocket
        this.inboxGateway.broadcastNewMessage(event.tenantId, {
          id: outboundMessage.id,
          conversationId: conversation.id,
          content: responseText,
          direction: 'OUTBOUND',
          provider: event.provider,
          senderId: 'Asistente AI',
          createdAt: outboundMessage.createdAt,
        });

        // Index outbound in vector memory
        this.eventEmitter.emit('communication.message.received', {
          tenantId: event.tenantId,
          conversationId: conversation.id,
          messageId: outboundMessage.id,
          content: responseText,
          role: 'assistant',
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to route message for tenant ${event.tenantId}`,
        error,
      );
    }
  }
}
