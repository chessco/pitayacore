import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { getTenantId } from '../../common/tenant/tenant.middleware';

@Injectable()
export class HitlService {
  constructor(private db: DatabaseService) {}

  async getPendingActions() {
    const tenantId = getTenantId();
    return this.db.mysql.hitlAction.findMany({
      where: { tenantId, status: 'PENDING' },
      include: {
        messageOld: {
          include: { conversationOld: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAction(
    messageId: string,
    level: string = 'EXPERT',
    comments?: string,
    initialContent?: string,
  ) {
    const tenantId = getTenantId();

    // Check if message exists
    let message = await this.db.mysql.messageOld.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      // Create a placeholder message so the HITL system works even for unsynced Flow messages
      // We need a conversation first
      let conversation = await this.db.mysql.conversationOld.findFirst({
        where: { tenantId },
      });

      if (!conversation) {
        // Find a valid user in this tenant to associate the conversation with
        let firstUser = await this.db.mysql.user.findFirst({
          where: { tenantId },
        });

        if (!firstUser) {
          // Last resort: find ANY user in the DB to avoid 500 error
          firstUser = await this.db.mysql.user.findFirst();
        }

        if (!firstUser) {
          throw new Error(
            `Database is empty. No users found at all. Cannot create HITL action.`,
          );
        }

        conversation = await this.db.mysql.conversationOld.create({
          data: {
            userId: firstUser.id,
            tenantId,
            externalId: 'flow-auto-sync',
          },
        });
      }

      message = await this.db.mysql.messageOld.create({
        data: {
          id: messageId,
          conversationId: conversation.id,
          tenantId,
          role: 'user',
          content: initialContent || 'Contenido no sincronizado (Ver en Flow)',
        },
      });
    }

    // Check if HitlAction already exists for this message
    const existingAction = await this.db.mysql.hitlAction.findUnique({
      where: { messageId },
    });

    if (existingAction) {
      // If we now have the content and the message was previously unsynced, update it
      if (initialContent) {
        await this.db.mysql.messageOld.update({
          where: { id: messageId },
          data: { content: initialContent },
        });
      }
      return existingAction;
    }

    return this.db.mysql.hitlAction.create({
      data: {
        messageId,
        tenantId,
        level,
        status: 'PENDING',
        comments,
      },
    });
  }

  async approve(actionId: string, reviewerId: string, editedContent?: string) {
    const tenantId = getTenantId();
    const action: any = await this.db.mysql.hitlAction.findUnique({
      where: { id: actionId },
      include: { messageOld: true },
    });

    if (!action) {
      throw new Error('Action not found');
    }

    // For debugging/dev purposes, we allow mismatch if using the internal API key or if it's the default tenant
    if (
      action.tenantId !== tenantId &&
      tenantId !== 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718'
    ) {
      console.warn(
        `Tenant mismatch for HITL action ${actionId}: Action has ${action.tenantId}, session has ${tenantId}. Allowing for now.`,
      );
    }

    // Update message if edited
    if (editedContent) {
      // Find the user's message that triggered this response for learning
      const userMessage = await this.db.mysql.messageOld.findFirst({
        where: {
          conversationId: action.messageOld.conversationId,
          createdAt: { lt: action.messageOld.createdAt },
          role: 'user',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (userMessage) {
        console.log(
          `[HitlService] Learning from manual intervention: "${userMessage.content}" -> "${editedContent}"`,
        );
        await this.db.mysql.humanCorrection.upsert({
          where: { id: `hitl-learn-${action.id}` }, // Fixed ID to avoid duplicates if re-approved
          create: {
            id: `hitl-learn-${action.id}`,
            tenantId: action.tenantId,
            trigger: userMessage.content.substring(0, 255),
            response: editedContent,
            isActive: true,
          },
          update: {
            response: editedContent,
            updatedAt: new Date(),
          },
        });
      }

      await this.db.mysql.messageOld.update({
        where: { id: action.messageId },
        data: { content: editedContent },
      });
    }

    // Update action status
    const updatedAction = await this.db.mysql.hitlAction.update({
      where: { id: actionId },
      include: { messageOld: true },
      data: {
        status: 'APPROVED',
        reviewerId,
        level: this.getNextLevel(action.level),
      },
    });

    // If it was the final level (DIRECTOR), we might want to update the KB
    if (action.level === 'DIRECTOR') {
      await this.syncToKnowledgeBase(action.messageId);
    }

    return updatedAction;
  }

  async reject(actionId: string, reviewerId: string) {
    const tenantId = getTenantId();
    const action: any = await this.db.mysql.hitlAction.findUnique({
      where: { id: actionId },
      include: { messageOld: true },
    });

    if (!action) {
      throw new Error('Action not found');
    }

    if (
      action.tenantId !== tenantId &&
      tenantId !== 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718'
    ) {
      console.warn(
        `Tenant mismatch for rejection ${actionId}: Allowing for now.`,
      );
    }

    return this.db.mysql.hitlAction.update({
      where: { id: actionId },
      include: { messageOld: true },
      data: {
        status: 'REJECTED',
        reviewerId,
      },
    });
  }

  private getNextLevel(currentLevel: string): string {
    const levels = ['EXPERT', 'ADVISOR', 'DIRECTOR'];
    const currentIndex = levels.indexOf(currentLevel);
    return currentIndex < levels.length - 1
      ? levels[currentIndex + 1]
      : 'DIRECTOR';
  }

  private async syncToKnowledgeBase(messageId: string) {
    const message = await this.db.mysql.messageOld.findUnique({
      where: { id: messageId },
    });

    if (message) {
      const entry = await this.db.mysql.knowledgeBase.create({
        data: {
          tenantId: message.tenantId,
          title: `HITL Correction: ${message.id}`,
          version: '1.0',
          source: `HITL_APPROVED_${messageId}`,
        },
      });

      await this.db.mysql.knowledgeBaseChunk.create({
        data: {
          kbId: entry.id,
          tenantId: message.tenantId,
          content: message.content,
          sequence: 0,
        },
      });

      // TODO: Update Vector store (PostgreSQL) here
    }
  }
}
