import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { WhatsappWebProvider } from './providers/whatsapp-web/whatsapp-web.provider';
import { DatabaseService } from '../../common/database/database.service';
import { AgentInboxGateway } from './gateways/agent-inbox.gateway';

@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private readonly whatsappProvider: WhatsappWebProvider,
    private readonly db: DatabaseService,
    private readonly inboxGateway: AgentInboxGateway,
  ) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiKeyGuard) // Valida que el header x-api-key o x-internal-key coincida con INTERNAL_API_KEY
  async sendWhatsAppMessage(
    @Headers('x-tenant-id') tenantId: string,
    @Body()
    body: { to: string; content: string; agentSlug?: string; metadata?: any },
  ) {
    if (!tenantId) {
      throw new BadRequestException('El encabezado x-tenant-id es requerido');
    }

    if (!body.to || !body.content) {
      throw new BadRequestException(
        'Los campos "to" y "content" son requeridos en el cuerpo',
      );
    }

    // 1. Obtener el primer canal que esté listo (READY) para ese Tenant ID
    const channelId = this.whatsappProvider.getFirstReadyChannel(tenantId);
    if (!channelId) {
      throw new BadRequestException(
        `No hay ningún canal de WhatsApp activo/vinculado (READY) para el tenant ${tenantId}.`,
      );
    }

    try {
      // 2. Enviar el mensaje usando el proveedor de whatsapp-web.js
      const result = (await this.whatsappProvider.sendMessage(
        tenantId,
        channelId,
        body.to,
        body.content,
      )) as { id?: { _serialized?: string } } | undefined;

      const messageId = result?.id?._serialized || 'SUCCESS';

      // 3. Persistir contacto, conversación y mensaje en DB para trazabilidad y flujo de agentes
      try {
        const resolvedTarget = (result as any)?.to || body.to;
        const cleanPhone = body.to.includes('@')
          ? body.to.split('@')[0]
          : body.to;
        let contact = await this.db.mysql.contact.findFirst({
          where: {
            tenantId,
            provider: 'whatsapp',
            OR: [
              { externalId: resolvedTarget },
              { externalId: body.to },
              { phone: cleanPhone },
            ],
          },
        });

        if (!contact) {
          contact = await this.db.mysql.contact.create({
            data: {
              tenantId,
              name: cleanPhone,
              externalId: resolvedTarget,
              provider: 'whatsapp',
              phone: cleanPhone,
            },
          });
        } else if (resolvedTarget && resolvedTarget.includes('@lid') && contact.externalId !== resolvedTarget) {
          contact = await this.db.mysql.contact.update({
            where: { id: contact.id },
            data: { externalId: resolvedTarget },
          });
        }

        const isAuthRequest =
          body.content.toUpperCase().includes('AUTORIZACIÓN') ||
          body.content.toUpperCase().includes('AUTORIZACION') ||
          body.agentSlug === 'icellshop-autorizaciones';

        const targetAgentSlug =
          body.agentSlug ||
          (isAuthRequest ? 'icellshop-autorizaciones' : undefined);

        let conversation = await this.db.mysql.conversation.findFirst({
          where: {
            tenantId,
            contactId: contact.id,
            provider: 'whatsapp',
            status: 'ACTIVE',
          },
        });

        const now = new Date();
        const pastDate = new Date(0).toISOString(); // 1970 - habilita IA de inmediato

        if (!conversation) {
          conversation = await this.db.mysql.conversation.create({
            data: {
              tenantId,
              contactId: contact.id,
              provider: 'whatsapp',
              status: 'ACTIVE',
              assignedAgentId: targetAgentSlug || null,
              metadata: {
                channelId,
                humanActiveUntil: isAuthRequest
                  ? pastDate
                  : '2099-12-31T23:59:59.999Z',
                isAuthRequest,
                ...body.metadata,
              },
            },
          });
        } else if (isAuthRequest) {
          // Si es una solicitud de autorización, asegurar que el agente esté asignado y la IA activa
          const existingMeta = (conversation.metadata as any) || {};
          conversation = await this.db.mysql.conversation.update({
            where: { id: conversation.id },
            data: {
              assignedAgentId: targetAgentSlug,
              metadata: {
                ...existingMeta,
                channelId,
                humanActiveUntil: pastDate, // Activar IA para responder la autorización
                isAuthRequest: true,
                ...body.metadata,
              },
            },
          });
        }

        // Guardar mensaje saliente
        const outbound = await this.db.mysql.message.create({
          data: {
            conversationId: conversation.id,
            provider: 'whatsapp',
            direction: 'OUTBOUND',
            messageType: 'TEXT',
            content: body.content,
          },
        });

        await this.db.mysql.conversation.update({
          where: { id: conversation.id },
          data: { lastMessageAt: now },
        });

        // Notificar por WebSocket al Agent Inbox
        this.inboxGateway.broadcastNewMessage(tenantId, {
          id: outbound.id,
          conversationId: conversation.id,
          content: body.content,
          direction: 'OUTBOUND',
          provider: 'whatsapp',
          senderId: 'Pro Buyer / Sistema',
          createdAt: outbound.createdAt,
        });
      } catch (dbError) {
        this.logger.warn(
          `Error secundario al persistir mensaje saliente: ${dbError.message}`,
        );
      }

      return {
        success: true,
        messageId,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
