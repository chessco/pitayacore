import { Injectable, NotFoundException, Logger, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { AiService } from '../ai/ai.service';
import { CreateCapsuleDto } from './dto/create-capsule.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ConversationsService } from '../conversations/conversations.service';
import { WorkflowsService } from '../crm/workflows.service';
import { CrmService } from '../crm/crm.service';

@Injectable()
export class CapsulesService {
  private readonly logger = new Logger(CapsulesService.name);

  constructor(
    private db: DatabaseService,
    private ai: AiService,
    private conversationsService: ConversationsService,
    private workflowsService: WorkflowsService,
    private crmService: CrmService,
  ) {}

  async create(dto: CreateCapsuleDto) {
    return this.db.mysql.capsule.create({
      data: {
        ...dto,
        contentBlocks: dto.contentBlocks as any,
        knowledgeIds: dto.knowledgeIds as any,
        promptConfig: dto.promptConfig as any,
        ctaConfig: dto.ctaConfig as any,
      },
    });
  }

  async findAll(tenantId?: string, user?: any) {
    const isSystem = user?.role === 'SYSTEM' || user?.role === 'ADMIN';
    const isGlobal = tenantId === 'global' || tenantId === 'all';
    
    const where = (tenantId && !isSystem && !isGlobal) ? { tenantId } : {};
    
    console.log('CAPSULES QUERY:', { tenantId, isSystem, isGlobal, where });

    const results = await this.db.mysql.capsule.findMany({
      where,
      include: { 
        agent: true,
        _count: {
          select: { leads: true, campaigns: true }
        }
      },
    });

    console.log('CAPSULES RESULT:', results.length);
    return results;
  }

  async findOne(id: string, tenantId: string, user?: any) {
    console.log(`FIND_ONE: id="${id}" (length: ${id?.length}), tenantId=${tenantId}, userRole=${user?.role}`);
    const isSystem = user?.role === 'SYSTEM' || user?.role === 'ADMIN';
    const isGlobal = tenantId === 'global' || tenantId === 'all';
    
    const where = (isSystem || isGlobal) ? { id: id.trim() } : { id: id.trim(), tenantId };
    console.log(`FIND_ONE WHERE: ${JSON.stringify(where)}`);
    
    const capsule = await this.db.mysql.capsule.findFirst({
      where,
      include: { agent: true },
    });
    
    if (!capsule) {
        console.log('FIND_ONE NOT FOUND IN DB');
        // Let's try to find it by ID only to be sure
        const debugCapsule = await this.db.mysql.capsule.findUnique({ where: { id: id.trim() } });
        console.log('DEBUG_FIND_BY_ID_ONLY:', debugCapsule ? 'FOUND' : 'NOT FOUND');
        
        throw new NotFoundException('Capsule not found');
    }
    return capsule;
  }

  async update(id: string, tenantId: string, dto: any, user?: any) {
    const isSystem = user?.role === 'SYSTEM' || user?.role === 'ADMIN';
    const isGlobal = tenantId === 'global' || tenantId === 'all';
    const where = (isSystem || isGlobal) ? { id } : { id, tenantId };

    this.logger.debug(`Updating capsule ${id}. Admin bypass: ${isSystem}`);
    return this.db.mysql.capsule.update({
      where,
      data: {
        ...dto,
        contentBlocks: dto.contentBlocks ? (dto.contentBlocks as any) : undefined,
        knowledgeIds: dto.knowledgeIds ? (dto.knowledgeIds as any) : undefined,
        promptConfig: dto.promptConfig ? (dto.promptConfig as any) : undefined,
        ctaConfig: dto.ctaConfig ? (dto.ctaConfig as any) : undefined,
      },
    });
  }

  async remove(id: string, tenantId: string, user?: any) {
    const isSystem = user?.role === 'SYSTEM' || user?.role === 'ADMIN';
    const isGlobal = tenantId === 'global' || tenantId === 'all';

    const capsule = await this.db.mysql.capsule.findFirst({
      where: (isSystem || isGlobal) ? { id } : { id, tenantId },
      include: { campaigns: true }
    });

    if (!capsule) throw new NotFoundException('Cápsula no encontrada');

    if (!isSystem) {
      // Regla: No borrar si ya está publicada
      if (capsule.status.toUpperCase() === 'PUBLISHED') {
        throw new ConflictException('No se puede eliminar una cápsula que ya está publicada. Cámbiala a borrador primero.');
      }

      // Regla: No borrar si tiene campañas enviadas
      const hasSentCampaigns = capsule.campaigns.some((c: any) => c.sentAt !== null);
      if (hasSentCampaigns) {
        throw new ConflictException('No se puede eliminar esta cápsula porque tiene campañas que ya fueron enviadas por correo.');
      }
    }

    return this.db.mysql.capsule.delete({
      where: { id },
    });
  }

  async findBySlug(slug: string, tenantId?: string, includeDrafts = false, user?: any) {
    const isSystem = user?.role === 'SYSTEM' || user?.role === 'ADMIN';
    const isGlobal = tenantId === 'global' || tenantId === 'all';

    const capsule = await this.db.mysql.capsule.findUnique({
      where: { slug },
      include: { agent: true, tenant: true },
    });

    if (!capsule) {
      throw new NotFoundException(`Capsule with slug ${slug} not found`);
    }

    // Si se especifica tenantId, validar pertenencia (excepto si es admin)
    if (tenantId && !(isSystem || isGlobal) && capsule.tenantId !== tenantId) {
      throw new NotFoundException(`Capsule with slug ${slug} not found for this tenant`);
    }

    // Validar status si no se permiten borradores
    if (!includeDrafts && capsule.status.toUpperCase() !== 'PUBLISHED') {
      throw new NotFoundException(`Esta cápsula no está disponible actualmente.`);
    }

    return capsule;
  }

  async updateStatus(id: string, tenantId: string, status: string, user?: any) {
    const isSystem = user?.role === 'SYSTEM' || user?.role === 'ADMIN';
    const isGlobal = tenantId === 'global' || tenantId === 'all';
    const where = (isSystem || isGlobal) ? { id } : { id, tenantId };

    return this.db.mysql.capsule.update({
      where,
      data: { status },
    });
  }

  async createLead(dto: CreateLeadDto & { userId?: string, tenantId?: string }) {
    const { userId, ...leadData } = dto;
    
    // Resolver tenantId si no viene (ej: desde el widget público)
    let tenantId = leadData.tenantId;
    if (!tenantId) {
      const capsule = await this.db.mysql.capsule.findUnique({
        where: { id: leadData.capsuleId }
      });
      tenantId = capsule?.tenantId || 'DEFAULT';
    }
    
    // Unificación de Identidad: Sincronizar con CRM
    let contact = null;
    if (leadData.email || leadData.phone) {
      contact = await this.db.mysql.contact.findFirst({
        where: { 
          tenantId, 
          OR: [
            ...(leadData.email ? [{ email: leadData.email }] : []),
            ...(leadData.phone ? [{ phone: leadData.phone }] : [])
          ]
        }
      });

      if (!contact) {
        contact = await this.db.mysql.contact.create({
          data: {
            tenantId,
            name: leadData.name,
            email: leadData.email,
            phone: leadData.phone,
            status: 'LEAD'
          }
        });
      } else {
        // Actualizar información si es necesario
        await this.db.mysql.contact.update({
          where: { id: contact.id },
          data: {
            name: leadData.name,
            email: leadData.email || contact.email,
            phone: leadData.phone || contact.phone
          }
        });
      }
    }

    // Create the lead record linked to contact
    const lead = await this.db.mysql.lead.create({
      data: {
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        capsuleId: leadData.capsuleId,
        conversationId: leadData.conversationId,
        campaignId: leadData.campaignId,
        metadata: leadData.metadata,
        tenantId,
        contactId: contact?.id
      },
    });

    // Log de Actividad Omnicanal
    if (contact) {
      await this.db.mysql.activity.create({
        data: {
          tenantId,
          contactId: contact.id,
          type: 'NOTE',
          subject: 'Interacción con Cápsula',
          content: `Registro de lead desde cápsula: ${leadData.name}.`
        }
      });
    }

    // If userId is provided, try to find and update the associated conversation
    if (userId) {
      const conversation = await this.db.mysql.conversation.findFirst({
        where: {
          OR: [
            { userId: userId },
            { externalId: userId }
          ]
        },
        include: { tenant: true }
      });

      if (conversation) {
        // Update conversation metadata with the lead's name
        const currentMetadata = (conversation.metadata as any) || {};
        const updatedMetadata = {
          ...currentMetadata,
          userName: dto.name,
          userEmail: dto.email,
          userPhone: dto.phone
        };

        const updatedConv = await this.db.mysql.conversation.update({
          where: { id: conversation.id },
          data: {
            metadata: updatedMetadata
          },
          include: { assignedTo: true }
        });

        // Notify inbox to update display name
        this.conversationsService.gateway.server
          .to(conversation.tenantId)
          .emit('conversationUpdate', updatedConv);
      }
    }

    // Trigger de Bienvenida Automático (Workflow)
    this.workflowsService.triggerWelcomeMessage(lead.id).catch(err => {
      this.logger.error(`Error in welcome workflow: ${err.message}`);
    });

    // Recompensa de AcuaPoints por registro de lead
    if (contact) {
      await this.crmService.addPoints(contact.id, tenantId || 'DEFAULT', 50, 'Registro inicial en cápsula');
    }

    return lead;
  }

  async chat(slug: string, body: any, tenantId?: string, includeDrafts = false, user?: any) {
    const { message, userId, agentSlug } = body;
    // Buscamos la cápsula primero para obtener su tenantId real si no viene en el header
    const capsule = await this.findBySlug(slug, tenantId, includeDrafts, user);
    const resolvedTenantId = tenantId || capsule.tenantId || 'DEFAULT_TENANT';
    const finalUserId = userId || 'anon-' + Date.now();

    // Determinar qué agente usar: El solicitado o el por defecto de la cápsula
    const targetAgentSlug = agentSlug || capsule.agent?.slug;

    // Handle via ConversationsService to ensure it appears in Bandeja
    const aiMessage = await this.conversationsService.handleIncomingMessage(
      finalUserId,
      message,
      resolvedTenantId,
      undefined, // externalId
      undefined, // skills
      targetAgentSlug,
      'capsule',
      { capsuleId: capsule.id, capsuleTitle: capsule.title }
    );

    // Recompensa de AcuaPoints por interacción (si hay contacto vinculado)
    if (aiMessage.conversationId) {
      const conv = await this.db.mysql.conversation.findUnique({
        where: { id: aiMessage.conversationId },
        include: { leads: { include: { contact: true } } }
      });
      const contact = conv?.leads[0]?.contact;
      if (contact) {
        await this.crmService.addPoints(contact.id, resolvedTenantId, 5, 'Interacción con el asesor AI');
      }
    }

    return {
      content: aiMessage.content,
      role: 'assistant',
      capsuleId: capsule.id,
      conversationId: aiMessage.conversationId,
    };
  }

  async getAnalytics(tenantId?: string) {
    const filters = tenantId ? { tenantId } : {};
    
    const [totalCapsules, totalLeads, recentLeads] = await Promise.all([
      this.db.mysql.capsule.count({ where: filters }),
      this.db.mysql.lead.count({ where: { capsule: filters } }),
      this.db.mysql.lead.findMany({
        where: { capsule: filters },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { capsule: true },
      }),
    ]);

    return {
      totalCapsules,
      totalLeads,
      recentLeads,
      conversionRate: totalCapsules > 0 ? (totalLeads / (totalCapsules * 100)) : 0, // Mocked rate
    };
  }

  async getBranding(tenantId: string) {
    const tenant = await this.db.mysql.tenant.findUnique({
      where: { id: tenantId },
      select: { brandingConfig: true },
    });
    return tenant?.brandingConfig || {};
  }

  async updateBranding(tenantId: string, config: any) {
    return this.db.mysql.tenant.update({
      where: { id: tenantId },
      data: { brandingConfig: config },
    });
  }

  async getLeads(tenantId: string) {
    if (!tenantId) return [];
    
    return this.db.mysql.lead.findMany({
      where: { 
        OR: [
          { tenantId },
          { capsule: { tenantId } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: { 
        capsule: true,
        campaign: true,
        conversation: true,
        contact: true
      },
    });
  }

  async removeLead(id: string, tenantId: string) {
    const lead = await this.db.mysql.lead.findFirst({
      where: {
        id,
        OR: [
          { tenantId },
          { capsule: { tenantId } }
        ]
      }
    });
    if (!lead) throw new NotFoundException('Lead no encontrado');
    return this.db.mysql.lead.delete({
      where: { id },
    });
  }

  async syncLeadToCRM(leadId: string, tenantId: string) {
    const lead = await this.db.mysql.lead.findFirst({
      where: {
        id: leadId,
        OR: [
          { tenantId },
          { capsule: { tenantId } }
        ]
      },
      include: { capsule: true }
    });

    if (!lead) {
      throw new NotFoundException('Lead no encontrado');
    }

    // Buscar contacto existente por email o teléfono bajo el mismo tenant
    let contact = await this.db.mysql.contact.findFirst({
      where: {
        tenantId,
        OR: [
          ...(lead.email ? [{ email: lead.email }] : []),
          ...(lead.phone ? [{ phone: lead.phone }] : [])
        ]
      }
    });

    if (!contact) {
      // Crear nuevo contacto
      contact = await this.db.mysql.contact.create({
        data: {
          tenantId,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: 'Cápsula: ' + (lead.capsule?.title || 'Lead'),
          status: 'LEAD'
        }
      });
    } else {
      // Actualizar el contacto existente para asegurar que tenga nombre y compañía
      contact = await this.db.mysql.contact.update({
        where: { id: contact.id },
        data: {
          name: contact.name || lead.name,
          phone: contact.phone || lead.phone,
          company: contact.company || 'Cápsula: ' + (lead.capsule?.title || 'Lead')
        }
      });
    }

    // Vincular el lead con el contacto en la base de datos
    await this.db.mysql.lead.update({
      where: { id: leadId },
      data: { contactId: contact.id }
    });

    // Recompensa de AcuaPoints por sincronización exitosa
    await this.crmService.addPoints(contact.id, tenantId, 10, 'Sincronización manual de lead a CRM');

    return {
      success: true,
      contactId: contact.id,
      contact
    };
  }

  async getLeadJourney(conversationId: string, tenantId: string) {
    const conversation = await this.db.mysql.conversation.findUnique({
      where: { id: conversationId },
      include: { 
        leads: {
          include: {
            campaign: true
          }
        }
      }
    });

    if (!conversation) throw new NotFoundException('Conversation not found');

    const lead = conversation.leads[0];
    const timeline: any[] = [];

    // 1. Marketing events if lead exists
    if (lead) {
      // Creation
      timeline.push({
        type: 'LEAD_CREATED',
        title: 'Lead Registrado',
        description: `El lead se registró a través de la cápsula: ${(lead.metadata as any)?.capsuleTitle || 'General'}`,
        timestamp: lead.createdAt,
        metadata: lead.metadata
      });

      // Campaign Events
      if (lead.campaignId && lead.email) {
        const events = await this.db.mysql.campaignEvent.findMany({
          where: {
            campaignId: lead.campaignId,
            email: lead.email
          },
          orderBy: { createdAt: 'asc' }
        });

        events.forEach((event: any) => {
          timeline.push({
            type: event.type === 'OPEN' ? 'EMAIL_OPEN' : 'EMAIL_CLICK',
            title: event.type === 'OPEN' ? 'Email Abierto' : 'Clic en Enlace',
            description: event.type === 'OPEN' 
              ? `Abrió el correo de la campaña: ${lead.campaign?.name}`
              : `Hizo clic en un enlace de la campaña: ${lead.campaign?.name}`,
            timestamp: event.createdAt,
            metadata: {
              ip: event.ip,
              userAgent: event.userAgent
            }
          });
        });
      }
    }

    // 2. Chat events
    timeline.push({
      type: 'CHAT_STARTED',
      title: 'Chat Iniciado',
      description: 'El usuario inició una conversación con el agente AI.',
      timestamp: conversation.createdAt
    });

    return timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async generateOgHtml(slug: string) {
    try {
      const capsule = await this.db.mysql.capsule.findUnique({
        where: { slug },
        include: { agent: true, tenant: true },
      });

      if (!capsule) return '<html><title>PitayaCore</title></html>';

      // Extraer datos para OG
      const title = capsule.title || 'PitayaCore - Cápsula Interactiva';
      const description = capsule.description || 'Descubre esta nueva experiencia interactiva impulsada por IA.';
      const url = `https://pitayacore.pitayacode.io/capsules/${slug}`;
      
      // Buscar imagen (Hero o Logo del Tenant)
      let imageUrl = 'https://pitayacore.pitayacode.io/logo192.png';
      if (capsule.contentBlocks) {
        const blocks = capsule.contentBlocks as any[];
        const heroBlock = blocks.find(b => b.type === 'hero');
        if (heroBlock?.data?.imageUrl) {
          imageUrl = heroBlock.data.imageUrl;
        }
      }

      return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <meta name="description" content="${description}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${url}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${imageUrl}">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${url}">
    <meta property="twitter:title" content="${title}">
    <meta property="twitter:description" content="${description}">
    <meta property="twitter:image" content="${imageUrl}">

    <!-- Redirección para humanos -->
    <script>window.location.href = '${url}';</script>
</head>
<body>
    <h1>${title}</h1>
    <p>${description}</p>
    <img src="${imageUrl}" alt="${title}">
</body>
</html>`;
    } catch (error) {
      return '<html><title>PitayaCore</title></html>';
    }
  }
}
