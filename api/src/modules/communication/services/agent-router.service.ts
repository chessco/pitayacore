import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import {
  COMMUNICATION_EVENTS,
  MessageReceivedEvent,
} from '../events/communication.events';
import { AiRouterService } from '../../ai/ai-router.service';
import { AiService } from '../../ai/ai.service';
import { WhatsappWebProvider } from '../providers/whatsapp-web/whatsapp-web.provider';
import { DatabaseService } from '../../../common/database/database.service';
import { AgentInboxGateway } from '../gateways/agent-inbox.gateway';
import { ExecutionEngine } from '../../operations/executions/execution.engine';
import { ProBuyerWebhookService } from './probuyer-webhook.service';

@Injectable()
export class AgentRouterService {
  private readonly logger = new Logger(AgentRouterService.name);

  constructor(
    private readonly aiRouter: AiRouterService,
    private readonly whatsappProvider: WhatsappWebProvider,
    private readonly db: DatabaseService,
    private readonly inboxGateway: AgentInboxGateway,
    private readonly eventEmitter: EventEmitter2,
    private readonly executionEngine: ExecutionEngine,
    private readonly probuyerWebhook: ProBuyerWebhookService,
    private readonly ai: AiService,
  ) {}

  @OnEvent(COMMUNICATION_EVENTS.MESSAGE_RECEIVED)
  async handleMessageReceived(event: MessageReceivedEvent) {
    this.logger.log(
      `AgentRouter received message from ${event.from} via ${event.provider} for tenant ${event.tenantId}`,
    );

    try {
      // 1. Get or create Contact (resolving @lid vs regular phone)
      const senderPhone = (event as any).senderPhone;
      let contact = await this.db.mysql.contact.findFirst({
        where: {
          tenantId: event.tenantId,
          externalId: event.from,
          provider: event.provider,
        },
      });

      if (!contact && senderPhone) {
        const clean10 = senderPhone.replace(/\D/g, '').replace(/^521?/, '');
        contact = await this.db.mysql.contact.findFirst({
          where: {
            tenantId: event.tenantId,
            provider: event.provider,
            OR: [
              { phone: senderPhone },
              { phone: `52${clean10}` },
              { phone: `521${clean10}` },
              { phone: clean10 },
              { externalId: senderPhone },
              { externalId: `52${clean10}` },
              { externalId: `521${clean10}` },
              { externalId: `${senderPhone}@c.us` },
            ],
          },
        });
        if (contact) {
          // Link this LID to the contact so future lookups are immediate
          await this.db.mysql.contact.update({
            where: { id: contact.id },
            data: { externalId: event.from },
          });
        }
      }

      const cleanPhone =
        senderPhone ||
        (event.from.includes('@') ? event.from.split('@')[0] : event.from);

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
      } else if (contact.name?.includes('@') || (cleanPhone && contact.phone?.includes('@lid'))) {
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
          humanActiveUntil: '2099-12-31T23:59:59.999Z',
          reason: isGroup
            ? 'Group chat default OFF'
            : 'Default OFF per user request',
          channelId: event.channelId,
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
      } else {
        // Ensure channelId is in metadata
        const metadata = (conversation.metadata as any) || {};
        if (metadata.channelId !== event.channelId) {
          metadata.channelId = event.channelId;
          conversation = await this.db.mysql.conversation.update({
            where: { id: conversation.id },
            data: { metadata },
          });
        }
      }

      let finalContent = event.content;
      if (!finalContent || finalContent.trim() === '') {
        const rawType = event.rawMessage?.type;
        const rawBody = event.rawMessage?._data?.body;

        if (rawBody && typeof rawBody === 'string' && rawBody.trim() !== '') {
          finalContent = rawBody;
        } else if (rawType === 'ciphertext') {
          finalContent = '*(Mensaje cifrado/sincronizando)*';
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

      // Forward inbound message to iCellShop messages webhook
      this.forwardMessageToProbuyer({
        cleanPhone,
        contactName: contact.name || cleanPhone,
        content: finalContent,
        timestamp: inboundMessage.createdAt,
      }).catch((err) => {
        this.logger.debug(`Forward to iCellShop skipped/failed: ${err?.message}`);
      });

      // 4. Check if human is active or if this is an authorization flow
      const convMetadata = (conversation.metadata as any) || {};
      const trimmedContent = (finalContent || '').trim();

      const isAuthKeyword =
        /^(si|sí|ok|autorizo|autorizado|apruebo|aprobado|rechazo|rechazado|no)\b/i.test(
          trimmedContent,
        ) || /(autoriz|aprueb|rechaz)/i.test(trimmedContent);

      // Look for pending authorization id in conversation metadata or previous messages
      let pendingAuthId = convMetadata.authorizationId;
      if (!pendingAuthId) {
        let lastAuthMsg = await this.db.mysql.message.findFirst({
          where: {
            conversationId: conversation.id,
            direction: 'OUTBOUND',
            content: { contains: 'SOLICITUD DE AUTORIZACIÓN' },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (!lastAuthMsg) {
          lastAuthMsg = await this.db.mysql.message.findFirst({
            where: {
              conversation: {
                tenantId: event.tenantId,
                contactId: contact.id,
              },
              direction: 'OUTBOUND',
              content: { contains: 'SOLICITUD DE AUTORIZACIÓN' },
              createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
            orderBy: { createdAt: 'desc' },
          });
        }

        // 3. Fallback: Search across tenant for any recent outbound authorization request in the last 2 hours
        if (!lastAuthMsg) {
          lastAuthMsg = await this.db.mysql.message.findFirst({
            where: {
              conversation: {
                tenantId: event.tenantId,
              },
              direction: 'OUTBOUND',
              content: { contains: 'SOLICITUD DE AUTORIZACIÓN' },
              createdAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) },
            },
            orderBy: { createdAt: 'desc' },
          });
        }

        if (lastAuthMsg) {
          const match = lastAuthMsg.content.match(/ID:\s*([A-Za-z0-9-]+)/i);
          if (match) pendingAuthId = match[1];
        }
      }

      const isAuthFlow =
        conversation.assignedAgentId === 'icellshop-autorizaciones' ||
        Boolean(convMetadata.isAuthRequest) ||
        Boolean(pendingAuthId && isAuthKeyword);

      const humanActiveUntil = convMetadata.humanActiveUntil
        ? new Date(convMetadata.humanActiveUntil)
        : null;

      let shouldRouteToAi = false;
      // Authorizations ALWAYS bypass humanActiveUntil
      if ((humanActiveUntil && humanActiveUntil <= new Date()) || isAuthFlow) {
        shouldRouteToAi = true;
      }

      if (!shouldRouteToAi) {
        this.logger.log(
          `Skipping AI response for conversation ${conversation.id}: Human is in control until ${humanActiveUntil?.toISOString() || 'undefined (default OFF)'}`,
        );
        return;
      }

      // Check for Pro Buyer Authorization Flow
      let authHandled = false;
      let responseText: string | null = null;

      if (isAuthFlow && event.provider === 'whatsapp') {
        try {
          // Identify authorizationId from pendingAuthId or metadata
          let authId = pendingAuthId || convMetadata.authorizationId;
          if (!authId) {
            const lastAuthMsg = await this.db.mysql.message.findFirst({
              where: {
                conversationId: conversation.id,
                direction: 'OUTBOUND',
                content: { contains: 'SOLICITUD DE AUTORIZACIÓN' },
              },
              orderBy: { createdAt: 'desc' },
            });
            if (lastAuthMsg) {
              const match = lastAuthMsg.content.match(/ID:\s*([A-Za-z0-9-]+)/i);
              if (match) authId = match[1];
            }
          }

          if (authId) {
            // Find agent configuration
            const agent = await this.db.mysql.agent.findFirst({
              where: {
                slug: 'icellshop-autorizaciones',
                isActive: true,
              },
            });

            const agentConfig = (agent?.config as any) || {};
            const webhookConfig = agentConfig.webhookConfig || {};
            const webhookUrl = webhookConfig.url;
            const webhookSecret = webhookConfig.secret;

            // Interpret decision
            const decision =
              await this.probuyerWebhook.interpretAuthorizerResponse(
                event.content,
                this.ai,
              );

            this.logger.log(
              `[AgentRouter] Decisión de autorización interpretada para ${authId}: ${decision.action} (${decision.reason})`,
            );

            if (decision.action !== 'AMBIGUOUS') {
              if (webhookUrl && !webhookUrl.includes('[TU-DOMINIO]')) {
                const senderAuthorizedPhone = contact.phone || cleanPhone || event.from.replace(/\D/g, '');
                const hookRes =
                  await this.probuyerWebhook.sendAuthorizationWebhook({
                    webhookUrl,
                    webhookSecret,
                    payload: {
                      authorizationId: authId,
                      action: decision.action,
                      partialAmount: decision.partialAmount,
                      responseNote: event.content,
                      authorizedByPhone: senderAuthorizedPhone,
                    },
                  });

                const shortId = authId.slice(0, 8).toUpperCase();
                if (hookRes.success) {
                  if (decision.action === 'APPROVE') {
                    responseText = `✅ *Autorización Aprobada*\n\nHe registrado la aprobación de la solicitud [${shortId}] en Pro Buyer. La caja ya quedó autorizada para cerrar la venta.`;
                  } else if (decision.action === 'APPROVE_PARTIAL') {
                    responseText = `💛 *Autorización Parcial Registrada*\n\nHe registrado la aprobación parcial por *$${decision.partialAmount}* para la solicitud [${shortId}] en Pro Buyer. El descuento ha sido actualizado en la caja.`;
                  } else {
                    responseText = `❌ *Autorización Rechazada*\n\nHe registrado el rechazo de la solicitud [${shortId}] en Pro Buyer. El descuento no será aplicado.`;
                  }
                } else {
                  responseText = `⚠️ Interpreté tu decisión como *${
                    decision.action === 'APPROVE'
                      ? 'APROBADA'
                      : decision.action === 'APPROVE_PARTIAL'
                        ? `APROBADA PARCIAL ($${decision.partialAmount})`
                        : 'RECHAZADA'
                  }*, pero ocurrió un detalle al reportarlo a Pro Buyer: ${
                    hookRes.error || 'Error de conexión'
                  }.`;
                }
              } else {
                responseText = `⚠️ Interpreté tu respuesta como *${decision.action}*, pero la URL del webhook de Pro Buyer no está configurada o contiene un valor temporal en PitayaCore. Por favor configúrala en Capacidades Técnicas del agente.`;
              }
              authHandled = true;
            } else {
              // Ambiguous
              responseText = `No pude determinar con certeza tu respuesta para la solicitud de autorización. Por favor responde:\n\n• *"Sí"* o *"Autorizado"* para aprobar el descuento completo.\n• *"Autorizo $300"* para autorizar un monto parcial específico.\n• *"No"* para rechazar la solicitud.`;
              authHandled = true;
            }
          }
        } catch (authError: any) {
          this.logger.error(
            `Error procesando flujo de autorización: ${authError.message}`,
            authError.stack,
          );
        }
      }

      // If not an authorization or authorization fallback, use standard AI Router
      if (!authHandled) {
        const agentSlug =
          conversation.assignedAgentId &&
          !conversation.assignedAgentId.startsWith('usr_')
            ? conversation.assignedAgentId
            : undefined;
        const response = await this.aiRouter.route(
          event.content,
          event.tenantId,
          undefined,
          agentSlug,
        );

        if (response) {
          responseText =
            typeof response === 'string'
              ? response
              : (response as any).content || JSON.stringify(response);

          // --- NEW INTERCEPTOR LOGIC ---
          try {
            const cleanedStr = responseText
              .replace(/```json/g, '')
              .replace(/```/g, '')
              .trim();
            if (cleanedStr.startsWith('{') && cleanedStr.endsWith('}')) {
              const parsed = JSON.parse(cleanedStr);
              if (parsed.action === 'list_jobs') {
                const jobs = await this.db.mysql.job.findMany({
                  where: { tenantId: event.tenantId, cronExpression: null },
                });
                if (jobs.length === 0) {
                  responseText =
                    'No hay trabajos manuales configurados en este momento.';
                } else {
                  const list = jobs
                    .map(
                      (j) =>
                        `- ${j.name}: ${j.description || 'Sin descripción'}`,
                    )
                    .join('\n');
                  responseText = `Trabajos disponibles:\n${list}`;
                }
              } else if (parsed.action === 'execute_job' && parsed.jobName) {
                const job = await this.db.mysql.job.findFirst({
                  where: {
                    tenantId: event.tenantId,
                    name: { contains: parsed.jobName },
                  },
                });
                if (job) {
                  await this.executionEngine.executeJob(job.id);
                  responseText = `✅ Iniciando ejecución del trabajo "${job.name}".`;
                } else {
                  responseText = `❌ No pude encontrar un trabajo llamado "${parsed.jobName}".`;
                }
              }
            }
          } catch (e) {}
          // --- END NEW INTERCEPTOR LOGIC ---
        }
      }

      if (responseText && event.provider === 'whatsapp') {
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
  private async forwardMessageToProbuyer(params: {
    cleanPhone: string;
    contactName: string;
    content: string;
    timestamp: Date;
  }) {
    try {
      const agent = await this.db.mysql.agent.findFirst({
        where: {
          slug: 'icellshop-autorizaciones',
          isActive: true,
        },
      });

      const agentConfig = (agent?.config as any) || {};
      const webhookConfig = agentConfig.webhookConfig || {};
      const webhookUrl = webhookConfig.url;
      const webhookSecret = webhookConfig.secret;

      if (webhookUrl && webhookUrl.startsWith('http')) {
        const msgWebhookUrl = webhookUrl.replace(
          /\/api\/sales\/authorizations\/webhook.*$/,
          '/api/messages/webhook',
        );

        await axios.post(
          msgWebhookUrl,
          {
            from: params.cleanPhone,
            content: params.content,
            senderName: params.contactName,
            timestamp: params.timestamp.toISOString(),
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-pitayacore-secret': webhookSecret || '',
            },
            timeout: 5000,
          },
        );
      }
    } catch (err: any) {
      this.logger.debug(
        `[ForwardToProbuyer] Optional forward failed: ${err.message}`,
      );
    }
  }
}
