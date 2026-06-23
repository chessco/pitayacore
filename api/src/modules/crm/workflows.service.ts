import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);

  constructor(
    private db: DatabaseService,
    private httpService: HttpService,
  ) {}

  /**
   * Envía un mensaje de bienvenida por WhatsApp cuando se registra un lead.
   */
  async triggerWelcomeMessage(leadId: string) {
    try {
      const lead = await this.db.mysql.lead.findUnique({
        where: { id: leadId },
        include: { capsule: true, contact: true },
      });

      if (!lead || !lead.phone) {
        this.logger.debug(
          `Skipping welcome message: Lead ${leadId} has no phone.`,
        );
        return;
      }

      const tenantId = lead.tenantId;
      const flowApiUrl =
        process.env.FLOW_API_URL || 'https://flow-api.pitayacode.io';
      const internalKey = process.env.INTERNAL_API_KEY;

      if (!internalKey) {
        this.logger.error(
          'INTERNAL_API_KEY not defined. Cannot send welcome message.',
        );
        return;
      }

      const message = `¡Hola ${lead.name}! 👋 Gracias por interesarte en "${lead.capsule.title}". Soy el asistente de IA de PitayaCore. ¿En qué puedo ayudarte hoy?`;

      this.logger.log(
        `[Workflow] Sending welcome message to ${lead.phone} (Tenant: ${tenantId})`,
      );

      await firstValueFrom(
        this.httpService.post(`${flowApiUrl}/whatsapp/internal/send`, {
          tenantId,
          to: lead.phone,
          content: message,
          key: internalKey,
        }),
      );

      // Registrar actividad
      if (lead.contactId && tenantId) {
        await this.db.mysql.activity.create({
          data: {
            tenantId,
            contactId: lead.contactId,
            type: 'WHATSAPP',
            subject: 'Mensaje Automático de Bienvenida',
            content: message,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to trigger welcome message: ${error.message}`);
    }
  }

  /**
   * Revisa deals estancados y crea alertas/actividades.
   * Se puede llamar periódicamente.
   */
  async checkStaleDeals(tenantId: string) {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const staleDeals = await this.db.mysql.deal.findMany({
      where: {
        tenantId,
        stage: 'NEGOTIATION',
        updatedAt: { lt: fortyEightHoursAgo },
      },
      include: { contact: true },
    });

    this.logger.log(
      `[Workflow] Found ${staleDeals.length} stale deals for tenant ${tenantId}`,
    );

    for (const deal of staleDeals) {
      // Crear una actividad de "Recordatorio"
      await this.db.mysql.activity.create({
        data: {
          tenantId,
          contactId: deal.contactId,
          type: 'TASK',
          subject: '⚠️ SEGUIMIENTO PENDIENTE',
          content: `El deal "${deal.title}" lleva más de 48h sin actividad en etapa de Negociación. Por favor, contacta al cliente.`,
        },
      });

      // Actualizar el deal para que no se repita la alerta inmediatamente (o marcarlo como alertado)
      await this.db.mysql.deal.update({
        where: { id: deal.id },
        data: { updatedAt: new Date() }, // "Tocar" el deal
      });
    }

    return staleDeals.length;
  }
}
