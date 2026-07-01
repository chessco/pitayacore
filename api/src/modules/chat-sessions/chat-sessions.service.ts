import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { AgentsService } from '../agents/agents.service';
import { GeminiProvider } from '../../infrastructure/providers/ai/gemini.provider';
import { FalProvider } from '../../infrastructure/providers/image/fal.provider';

@Injectable()
export class ChatSessionsService {
  private readonly logger = new Logger(ChatSessionsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly agentsService: AgentsService,
    private readonly geminiProvider: GeminiProvider,
    private readonly falProvider: FalProvider,
  ) {}

  private async resolveTenantId(tenantId: string): Promise<string> {
    if (tenantId === 'DEFAULT_TENANT') {
      const defaultTenant = await this.db.mysql.tenant.findFirst();
      return defaultTenant?.id || tenantId;
    }
    return tenantId;
  }

  async getSessions(tenantId: string) {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return this.db.mysql.conversationOld.findMany({
      where: { tenantId: resolvedTenantId, source: 'CREATIVE_CHAT' },
      orderBy: { createdAt: 'desc' },
      include: { messagesOld: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async getSessionMessages(sessionId: string) {
    const session = await this.db.mysql.conversationOld.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    const messages = await this.db.mysql.messageOld.findMany({
      where: { conversationId: sessionId },
      orderBy: { createdAt: 'asc' },
    });

    // Mapear los campos de metadata para el frontend de Vision
    return messages.map((m) => {
      const meta: any = m.classification ? JSON.parse(m.classification) : {};
      return {
        id: m.id,
        sender: m.role,
        text: m.content,
        createdAt: m.createdAt,
        steps: meta.steps || [],
        suggestedCopy: meta.suggestedCopy || null,
        imagePrompt: meta.imagePrompt || null,
        bannerTitle: meta.bannerTitle || null,
        bannerStyle: meta.bannerStyle || null,
        bannerUrl: meta.bannerUrl || null,
        technicalDetails: meta.technicalDetails || null,
      };
    });
  }

  async createSession(tenantId: string, title: string) {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    const meta = { title };
    const session = await this.db.mysql.conversationOld.create({
      data: {
        tenantId: resolvedTenantId,
        source: 'CREATIVE_CHAT',
        metadata: JSON.stringify(meta),
      },
    });

    return {
      id: session.id,
      title,
      tenantId: session.tenantId,
      createdAt: session.createdAt,
    };
  }

  async postMessage(sessionId: string, text: string) {
    const session = await this.db.mysql.conversationOld.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    const userMessage = await this.db.mysql.messageOld.create({
      data: {
        conversationId: sessionId,
        tenantId: session.tenantId,
        role: 'user',
        content: text,
      },
    });

    // Steps will be populated after strategy generation with the actual imagePrompt used
    const baseSteps = [
      {
        label: 'Analizando solicitud con Director Creativo IA',
        status: 'done',
      },
      {
        label: 'Generando estrategia completa de campaña con Gemini',
        status: 'done',
      },
      { label: 'Optimizando prompt visual para FLUX', status: 'done' },
      {
        label: 'Renderizando banner de campaña con Fal.ai (FLUX)',
        status: 'done',
      },
    ];

    try {
      this.logger.log(`Starting AI pipeline for request: ${text}`);

      // 1. Fetch Creative Director or Creative Producer prompt to act as the agent context
      let systemInstruction =
        'Eres un Director Creativo experto de Pitaya Visual.';
      const dbAgent =
        (await this.db.mysql.agent.findFirst({
          where: { slug: 'creative-director', tenantId: session.tenantId },
        })) ||
        (await this.db.mysql.agent.findFirst({
          where: { slug: 'creative-producer', tenantId: session.tenantId },
        }));

      if (dbAgent && dbAgent.prompt) {
        systemInstruction = dbAgent.prompt;
      }

      const strategyPrompt = `Analiza la siguiente solicitud y diseña una campaña creativa completa en español.
Solicitud: "${text}"

Debes estructurar tu respuesta con las siguientes secciones:
- Estrategia: Explicación de la estrategia de la campaña.
- Oferta: La propuesta de valor u oferta comercial.
- Segmentación: Público objetivo detallado.
- Concepto Creativo: La idea central e identidad visual de la campaña.
- Anuncios (Genera 3 anuncios): Copy y descripción visual para cada uno.
- Publicaciones (Genera 5 publicaciones): Contenido para redes sociales.
- Assets requeridos: Listado de recursos visuales y de copy.

Además, define un prompt de imagen altamente optimizado (en inglés) para generar el banner visual de esta campaña, detallando estilo, iluminación, elementos y composición.

Devuelve un JSON estrictamente estructurado con:
{
  "title": "Título corto y atractivo para la campaña",
  "copy": "Texto detallado conteniendo la Estrategia, Oferta, Segmentación, Concepto Creativo, los 3 Anuncios, las 5 Publicaciones y los Assets requeridos. Usa saltos de línea y formato limpio en español.",
  "imagePrompt": "Detailed English visual prompt for generating the main banner (including style, subjects, lighting, mood, camera details)"
}

Asegúrate de incluir absolutamente toda la información solicitada en el campo 'copy' de forma detallada.`;

      const schema = {
        type: 'OBJECT',
        properties: {
          imagePrompt: { type: 'STRING' },
          copy: { type: 'STRING' },
          title: { type: 'STRING' },
        },
        required: ['imagePrompt', 'copy', 'title'],
      };

      const strategy = await this.geminiProvider.generateStructuredData<any>(
        strategyPrompt,
        schema,
        systemInstruction,
      );

      // 2. Generate Image with Fal (inject Character LoRA if session has one)
      const sessionMetaForLora: any = session.metadata
        ? JSON.parse(session.metadata as string)
        : {};
      let loraPath: string | undefined;

      if (sessionMetaForLora.characterId) {
        const character = await this.db.mysql.character.findFirst({
          where: { id: sessionMetaForLora.characterId },
        });
        if (character?.loraId) {
          const loraAsset = await this.db.mysql.asset.findFirst({
            where: { id: character.loraId },
          });
          loraPath = loraAsset?.storagePath;
        }
      }

      const falResult = await this.falProvider.generateImage(
        strategy.imagePrompt,
        loraPath ? { loras: [{ path: loraPath, scale: 1.0 }] } : undefined,
      );

      // 3. Save AI MessageOld — use strategy.copy as the main content displayed in chat
      const completedSteps = [
        ...baseSteps,
        {
          label: `Prompt visual: ${strategy.imagePrompt?.substring(0, 80)}...`,
          status: 'done',
        },
      ];

      const meta = {
        steps: completedSteps,
        suggestedCopy: strategy.copy, // Campaign copy in Spanish
        imagePrompt: strategy.imagePrompt, // English prompt used for image generation
        bannerTitle: strategy.title,
        bannerStyle: 'FLUX Schnell • Fal.ai',
        bannerUrl: falResult.imageUrl,
        technicalDetails: {
          dimensions: `${falResult.width || 1200} x ${falResult.height || 628} px`,
          format: falResult.contentType === 'image/jpeg' ? 'JPEG' : 'PNG',
          sizeBytes: falResult.buffer?.length || 0,
        },
      };

      // The main chat content IS the full campaign strategy generated by Gemini
      const fullCampaignContent =
        strategy.copy ||
        `Campaña generada para: "${text}"\n\n[Sin contenido generado]`;

      const aiMessage = await this.db.mysql.messageOld.create({
        data: {
          conversationId: sessionId,
          tenantId: session.tenantId,
          role: 'ai',
          content: fullCampaignContent,
          classification: JSON.stringify(meta),
        },
      });

      return {
        userMessage: {
          id: userMessage.id,
          sender: userMessage.role,
          text: userMessage.content,
          createdAt: userMessage.createdAt,
        },
        aiMessage: {
          id: aiMessage.id,
          sender: aiMessage.role,
          text: aiMessage.content,
          createdAt: aiMessage.createdAt,
          ...meta,
        },
      };
    } catch (error) {
      this.logger.error('Error in postMessage pipeline', error);
      throw error;
    }
  }

  async approveCampaign(sessionId: string) {
    const session = await this.db.mysql.conversationOld.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    const lastAiMessage = await this.db.mysql.messageOld.findFirst({
      where: { conversationId: sessionId, role: 'ai' },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastAiMessage) {
      throw new NotFoundException('No assets to approve in this session');
    }

    const meta = lastAiMessage.classification
      ? JSON.parse(lastAiMessage.classification)
      : {};

    const sessionMeta = session.metadata
      ? JSON.parse(session.metadata as string)
      : {};
    const campaignName = sessionMeta.title || 'Nueva Campaña de Redes';

    // In PitayaCore, Capsule is required for Campaign
    // So we just fetch the first capsule or create a dummy one
    let capsule = await this.db.mysql.capsule.findFirst({
      where: { tenantId: session.tenantId },
    });
    if (!capsule) {
      const agent = await this.db.mysql.agent.findFirst({
        where: { tenantId: session.tenantId },
      });
      const capsuleData: any = {
        tenantId: session.tenantId,
        title: 'Creative Chat Capsule',
        slug: 'creative-chat-' + session.id.slice(0, 8),
        topic: 'Creative',
        contentBlocks: {},
      };
      if (agent?.id) {
        capsuleData.agentId = agent.id;
      }
      capsule = await this.db.mysql.capsule.create({ data: capsuleData });
    }

    const campaign = await this.db.mysql.campaign.create({
      data: {
        tenantId: session.tenantId,
        capsuleId: capsule.id,
        name: campaignName,
        content: meta.suggestedCopy || 'Generado vía Creative Chat',
        subject: meta.bannerTitle || 'Campaña',
        channel: 'EMAIL',
      },
    });

    const asset = await this.db.mysql.asset.create({
      data: {
        tenantId: session.tenantId,
        name: meta.bannerTitle || 'Banner de Campaña',
        type: 'CAMPAIGN_ASSET',
        storageProvider: 'R2',
        storagePath: meta.bannerUrl || '/safe_streets_banner.png',
        metadata: JSON.stringify({
          campaignId: campaign.id,
          campaignName: campaignName,
          dimensions: meta.technicalDetails?.dimensions,
          sizeBytes: meta.technicalDetails?.sizeBytes,
          prompt: meta.bannerStyle,
        }),
      },
    });

    const newSessionMeta = { ...sessionMeta, campaignId: campaign.id };
    await this.db.mysql.conversationOld.update({
      where: { id: sessionId },
      data: { metadata: JSON.stringify(newSessionMeta) },
    });

    return {
      campaign,
      asset,
    };
  }
}
