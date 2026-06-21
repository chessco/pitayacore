import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { AiService } from '../ai/ai.service';
import { AiRouterService } from '../ai/ai-router.service';
import { getTenantId } from '../../common/tenant/tenant.middleware';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConversationsGateway } from './conversations.gateway';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private db: DatabaseService,
    private aiRouter: AiRouterService,
    private httpService: HttpService,
    public gateway: ConversationsGateway,
  ) {}

  async handleIncomingMessage(userId: string, content: string, tenantIdParam?: string, externalId?: string, skills?: any, agentSlug?: string, channel: string = 'whatsapp', metadata?: any) {
    const tenantId = tenantIdParam || getTenantId();

    // 1. Find or create conversation
    let conversation = await this.db.mysql.conversation.findFirst({
      where: { 
        tenantId,
        OR: [
          { userId },
          { externalId: userId }
        ]
      },
    });

    if (!conversation) {
      const isCapsule = channel.toUpperCase() === 'CAPSULE';
      const isInternal = channel.toUpperCase() === 'INTERNAL';
      conversation = await this.db.mysql.conversation.create({
        data: { 
          userId: (isCapsule || isInternal) ? null : userId, 
          tenantId, 
          externalId: (isCapsule || isInternal) ? userId : externalId,
          source: isCapsule ? 'CAPSULE' : (isInternal ? 'INTERNAL' : 'WHATSAPP'),
          metadata: metadata || null
        },
      });
      // Notify about the new conversation structure
      this.gateway.server.to(tenantId).emit('conversationUpdate', conversation);
    }

    // Unificación de Identidad: Sincronizar con CRM si es WhatsApp
    if (channel.toLowerCase() === 'whatsapp') {
      let contact = await this.db.mysql.contact.findFirst({
        where: { tenantId, phone: userId }
      });

      if (!contact) {
        contact = await this.db.mysql.contact.create({
          data: {
            tenantId,
            name: metadata?.name || userId,
            phone: userId,
            status: 'LEAD'
          }
        });
      }

      // Vincular conversación al contacto si no lo está
      await this.db.mysql.lead.upsert({
        where: { id: conversation.id }, // Reusing ID or finding related
        update: { contactId: contact.id },
        create: {
          tenantId,
          capsuleId: 'system-whatsapp', // Placeholder
          conversationId: conversation.id,
          contactId: contact.id,
          name: contact.name,
          email: contact.email || ''
        }
      });

      await this.db.mysql.activity.create({
        data: {
          tenantId,
          contactId: contact.id,
          type: 'WHATSAPP',
          subject: 'Mensaje Entrante',
          content: content.length > 200 ? content.substring(0, 200) + '...' : content
        }
      });
    }

    // 2. Save user message
    const savedUserMessage = await this.db.mysql.message.create({
      data: {
        conversationId: conversation.id,
        tenantId,
        role: 'user',
        content,
      },
    });
    
    // 2. Emit via Socket.io (Silent failure if gateway not ready)
    try {
      this.gateway.emitNewMessage(tenantId, savedUserMessage);
    } catch (e) {
      console.warn('Gateway emit failed:', e.message);
    }

    // 3. Check if human is active (Intervened)
    const convMetadata = (conversation.metadata as any) || {};
    const humanActiveUntil = convMetadata.humanActiveUntil ? new Date(convMetadata.humanActiveUntil) : null;
    const isHumanInControl = humanActiveUntil && humanActiveUntil > new Date();

    if (isHumanInControl) {
      this.logger.log(`Skipping AI response for conversation ${conversation.id}: Human is in control until ${humanActiveUntil.toISOString()}`);
      return savedUserMessage;
    }

    // 4. Generate AI response via Router (Cost Optimized)
    let aiResult;
    try {
      aiResult = await this.aiRouter.route(content, tenantId, skills, agentSlug, channel, metadata || conversation.metadata);
      
      // Security Trim: Meta/WhatsApp limit is 4096. We clip at 4000 for safety.
      if (aiResult.content && aiResult.content.length > 4000) {
        this.logger.warn(`AI response truncated from ${aiResult.content.length} to 4000 chars.`);
        aiResult.content = aiResult.content.substring(0, 4000);
      }
    } catch (e) {
      console.error('AI Routing failed:', e.message);
      return savedUserMessage; // Return at least the user message
    }

    // 4. Save AI message
    const savedAiMessage = await this.db.mysql.message.create({
      data: {
        conversationId: conversation.id,
        tenantId,
        role: 'assistant',
        content: aiResult.content,
        confidence: aiResult.confidence || 1.0,
        isFlagged: aiResult.isFlagged || false,
        classification: aiResult.decision, // Store routing decision
      },
    });
    
    // Emit AI message to frontend
    this.gateway.emitNewMessage(tenantId, savedAiMessage);

    // 5. If flagged or routed to human, create HITL action
    this.logger.log(`AI Decision: ${aiResult.decision} | isFlagged: ${aiResult.isFlagged}`);
    
    if (aiResult.isFlagged || aiResult.decision === 'HUMAN') {
      this.logger.log(`Creating HITL action for message ${savedAiMessage.id}`);
      await this.db.mysql.hitlAction.create({
        data: {
          messageId: savedAiMessage.id,
          tenantId,
          level: 'EXPERT',
          status: 'PENDING',
        },
      });
    } else if (channel.toLowerCase() === 'whatsapp') {
      // Send AI Response to Flow
      try {
        const flowApiUrl = process.env.FLOW_API_URL || 'https://flow-api.pitayacode.io';
        const internalKey = process.env.INTERNAL_API_KEY;
        
        if (!internalKey) {
          throw new Error('INTERNAL_API_KEY not defined in environment');
        }
        
        this.logger.log(`[Flow Forward] Sending response to ${userId} via Flow...`);
        const response = await firstValueFrom(
          this.httpService.post(`${flowApiUrl}/whatsapp/internal/send`, {
            tenantId,
            to: userId,
            content: aiResult.content,
            key: internalKey
          })
        );
        this.logger.log(`Successfully sent AI response to Flow. Status: ${response.status}`);
      } catch (error) {
        this.logger.error(`Failed to send response to Flow: ${error.message}`);
        if (error.response) {
          this.logger.error(`Flow API responded with: ${JSON.stringify(error.response.data)}`);
        }
      }
    }

    return savedAiMessage;
  }

  async findConversationByPhone(phone: string) {
    const tenantId = getTenantId();
    return this.db.mysql.conversation.findFirst({
      where: { 
        tenantId,
        OR: [
          { userId: phone },
          { externalId: phone }
        ]
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  }

  async getConversations() {
    const tenantId = getTenantId();
    const whereClause = tenantId === 'global' ? {} : { tenantId };
    
    return this.db.mysql.conversation.findMany({
      where: whereClause,
      include: {
        assignedTo: {
          select: { id: true, name: true, role: true, email: true }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMessages(conversationId: string) {
    const tenantId = getTenantId();
    const whereClause: any = { conversationId };
    if (tenantId !== 'global') {
      whereClause.tenantId = tenantId;
    }
    
    return this.db.mysql.message.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
    });
  }

  async getOperators(tenantId?: string) {
    const tid = tenantId || getTenantId();
    return this.db.mysql.user.findMany({
      where: { 
        tenantId: tid,
        role: 'OPERATOR' 
      },
      select: { id: true, name: true, role: true }
    });
  }

  async assignToOperator(conversationId: string, operatorId: string, userId?: string) {
    const tenantId = getTenantId();
    
    const updated = await this.db.mysql.conversation.upsert({
      where: { id: conversationId },
      update: { 
        assignedToId: operatorId,
        tenantId // Ensure tenantId is correct
      },
      create: {
        id: conversationId,
        tenantId,
        userId: userId || 'unknown',
        assignedToId: operatorId,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, role: true }
        }
      }
    });

    // Notify via socket
    this.gateway.server.to(tenantId).emit('conversationUpdate', updated);

    return updated;
  }

  async setHumanActive(conversationId: string) {
    const conversation = await this.db.mysql.conversation.findUnique({
      where: { id: conversationId }
    });

    if (conversation) {
      const currentMetadata = (conversation.metadata as any) || {};
      const updatedMetadata = {
        ...currentMetadata,
        humanActiveUntil: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      };

      await this.db.mysql.conversation.update({
        where: { id: conversationId },
        data: { metadata: updatedMetadata }
      });
    }
    return { success: true };
  }
  
  async setAutopilotActive(conversationId: string) {
    const conversation = await this.db.mysql.conversation.findUnique({
      where: { id: conversationId }
    });

    if (conversation) {
      const currentMetadata = (conversation.metadata as any) || {};
      const updatedMetadata = {
        ...currentMetadata,
        humanActiveUntil: null // Clear human control timer
      };

      const updatedConv = await this.db.mysql.conversation.update({
        where: { id: conversationId },
        data: { metadata: updatedMetadata },
        include: { assignedTo: true }
      });

      // Notify inbox via socket to update UI
      this.gateway.emitConversationUpdate(conversation.tenantId, updatedConv);
    }
    return { success: true };
  }

  async autoAssignOperator(conversationId: string, tenantId: string) {
    // 1. Get all operators for this tenant
    const operators = await this.db.mysql.user.findMany({
      where: { 
        tenantId, 
        role: 'OPERATOR', 
        status: 'ACTIVE' 
      },
    });

    if (operators.length === 0) {
      // If no operators, try to find an admin as fallback
      const admins = await this.db.mysql.user.findMany({
        where: { tenantId, role: 'ADMIN', status: 'ACTIVE' },
      });
      if (admins.length > 0) {
        operators.push(...admins);
      } else {
        throw new NotFoundException('No hay operadores o administradores disponibles en este momento.');
      }
    }

    // 2. Count tickets for each operator
    const operatorCounts = await Promise.all(
      operators.map(async (op) => {
        const count = await this.db.mysql.conversation.count({
          where: { assignedToId: op.id },
        });
        return { op, count };
      }),
    );

    // 3. Sort and pick the best one (least tickets)
    operatorCounts.sort((a, b) => a.count - b.count);
    const bestOperator = operatorCounts[0].op;

    // 4. Assign
    const updatedConv = await this.db.mysql.conversation.update({
      where: { id: conversationId },
      data: { assignedToId: bestOperator.id },
      include: { 
        assignedTo: {
          select: { id: true, name: true, role: true, email: true }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    // 5. Notify via socket
    this.gateway.server.to(tenantId).emit('conversationUpdate', updatedConv);
    
    // Emit specific notification for the operator
    this.gateway.server.to(tenantId).emit('newTicket', {
      operatorId: bestOperator.id,
      conversationId: updatedConv.id,
      userName: updatedConv.userId || updatedConv.externalId || 'Usuario',
      message: 'Tienes un nuevo ticket asignado de una Cápsula'
    });

    return updatedConv;
  }

  async saveOperatorMessage(conversationId: string, content: string) {
    const tenantId = getTenantId();
    
    // 1. Save operator message
    const message = await this.db.mysql.message.create({
      data: {
        conversationId,
        tenantId,
        role: 'assistant',
        content,
      },
    });

    // 2. Mark human as active for 10 minutes
    const conversation = await this.db.mysql.conversation.findUnique({
      where: { id: conversationId }
    });

    if (conversation) {
      const currentMetadata = (conversation.metadata as any) || {};
      const updatedMetadata = {
        ...currentMetadata,
        humanActiveUntil: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes from now
      };

      const updatedConv = await this.db.mysql.conversation.update({
        where: { id: conversationId },
        data: { metadata: updatedMetadata },
        include: { assignedTo: true }
      });

      // Notify inbox
      this.gateway.emitConversationUpdate(tenantId, updatedConv);
    }

    // 3. Notify via socket
    this.gateway.emitNewMessage(tenantId, message);

    return message;
  }
}


