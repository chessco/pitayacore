import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DatabaseService } from '../../../common/database/database.service';
import { VectorSearchService } from '../../vector-search/vector-search.service';

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  constructor(
    private db: DatabaseService,
    private vectorSearch: VectorSearchService
  ) {}

  async getConversations(tenantId: string) {
    return this.db.mysql.conversation.findMany({
      where: { tenantId },
      include: {
        contact: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        assignments: {
          orderBy: { assignedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async getMessages(tenantId: string, conversationId: string) {
    // Verify tenant ownership
    const conv = await this.db.mysql.conversation.findFirst({
      where: { id: conversationId, tenantId },
    });
    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }

    return this.db.mysql.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async assignConversation(tenantId: string, conversationId: string, agentId: string, humanUserId?: string) {
    const conv = await this.db.mysql.conversation.findFirst({
      where: { id: conversationId, tenantId },
    });
    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }

    // Mark previous active assignment as TRANSFERRED
    await this.db.mysql.conversationAssignment.updateMany({
      where: { conversationId, status: 'ACTIVE' },
      data: { status: 'TRANSFERRED' },
    });

    const newAssignment = await this.db.mysql.conversationAssignment.create({
      data: {
        conversationId,
        agentId,
        humanUserId,
        status: 'ACTIVE',
      },
    });

    // Update conversation assignedAgentId
    await this.db.mysql.conversation.update({
      where: { id: conversationId },
      data: { assignedAgentId: agentId || humanUserId },
    });

    return newAssignment;
  }

  @OnEvent('agent-inbox.message.send')
  async handleOutboundMessage(payload: { conversationId: string; content: string; tenantId: string }) {
    try {
      this.logger.log(`Handling outbound message for conversation ${payload.conversationId}`);
      
      // Save message in MySQL
      const message = await this.db.mysql.message.create({
        data: {
          conversationId: payload.conversationId,
          content: payload.content,
          direction: 'OUTBOUND',
          messageType: 'text',
          provider: 'web',
        }
      });

      // Update conversation lastMessageAt
      await this.db.mysql.conversation.update({
        where: { id: payload.conversationId },
        data: { lastMessageAt: new Date() }
      });

      // Index in pgvector semantic memory
      await this.vectorSearch.indexMemory(
        payload.tenantId,
        message.id,
        payload.conversationId,
        payload.content,
        'assistant'
      );

      this.logger.log(`Successfully stored and indexed outbound message ${message.id}`);
    } catch (error) {
      this.logger.error(`Failed to handle outbound message: ${error.message}`);
    }
  }

  @OnEvent('communication.message.received')
  async handleInboundMessage(payload: { tenantId: string; conversationId: string; messageId: string; content: string; role: string }) {
    // Index inbound messages into memory too
    try {
      await this.vectorSearch.indexMemory(
        payload.tenantId,
        payload.messageId,
        payload.conversationId,
        payload.content,
        payload.role
      );
      this.logger.log(`Indexed inbound message ${payload.messageId} to memory`);
    } catch (error) {
      this.logger.error(`Failed to index inbound message: ${error.message}`);
    }
  }
}