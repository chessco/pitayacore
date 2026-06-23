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

  async getSessions(tenantId: string) {
    return this.db.mysql.conversation.findMany({
      where: { tenantId, source: 'CREATIVE_CHAT' },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async getSessionMessages(sessionId: string) {
    const session = await this.db.mysql.conversation.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    const messages = await this.db.mysql.message.findMany({
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
        bannerTitle: meta.bannerTitle || null,
        bannerStyle: meta.bannerStyle || null,
        bannerUrl: meta.bannerUrl || null,
        technicalDetails: meta.technicalDetails || null,
      };
    });
  }

  async createSession(tenantId: string, title: string) {
    const meta = { title };
    const session = await this.db.mysql.conversation.create({
      data: {
        tenantId,
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
    const session = await this.db.mysql.conversation.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    const userMessage = await this.db.mysql.message.create({
      data: {
        conversationId: sessionId,
        tenantId: session.tenantId,
        role: 'user',
        content: text,
      },
    });

    const aiMessageText = `He procesado tu solicitud: "${text}". Aquí está el resultado generado con FLUX.`;
    const completedSteps = [
      { label: 'Analizando guía de estilo y marca', status: 'done' },
      {
        label: 'Generando prompt optimizado con Gemini 1.5 Pro',
        status: 'done',
      },
      {
        label: 'Renderizando imagen de campaña con Fal.ai (FLUX)',
        status: 'done',
      },
    ];

    try {
      this.logger.log(`Starting AI pipeline for request: ${text}`);

      // 1. Generate Strategy with Gemini
      const strategyPrompt = `Crea un concepto visual y un copy publicitario para: "${text}".
Devuelve un JSON con:
- imagePrompt: (prompt en inglés para generar la imagen)
- copy: (texto sugerido para post)
- title: (título corto)`;

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
        'Eres un Director Creativo experto.',
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

      // 3. Save AI Message
      const meta = {
        steps: completedSteps,
        suggestedCopy: strategy.copy,
        bannerTitle: strategy.title,
        bannerStyle: 'FLUX Schnell • Fal.ai',
        bannerUrl: falResult.imageUrl, // Temporal. Luego lo subimos a R2
        technicalDetails: {
          dimensions: `${falResult.width || 1200} x ${falResult.height || 628} px`,
          format: falResult.contentType === 'image/jpeg' ? 'JPEG' : 'PNG',
          sizeBytes: falResult.buffer?.length || 0,
        },
      };

      const aiMessage = await this.db.mysql.message.create({
        data: {
          conversationId: sessionId,
          tenantId: session.tenantId,
          role: 'ai',
          content: aiMessageText,
          classification: JSON.stringify(meta), // We use classification to store the JSON string of metadata since metadata is not in Message model
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
    const session = await this.db.mysql.conversation.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    const lastAiMessage = await this.db.mysql.message.findFirst({
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
      capsule = await this.db.mysql.capsule.create({
        data: {
          tenantId: session.tenantId,
          title: 'Creative Chat Capsule',
          slug: 'creative-chat-' + session.id,
          topic: 'Creative',
          contentBlocks: {},
          agentId: agent?.id || 'GLOBAL_AGENT', // fallback
        },
      });
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
          dimensions: meta.technicalDetails?.dimensions,
          sizeBytes: meta.technicalDetails?.sizeBytes,
          prompt: meta.bannerStyle,
        }),
      },
    });

    const newSessionMeta = { ...sessionMeta, campaignId: campaign.id };
    await this.db.mysql.conversation.update({
      where: { id: sessionId },
      data: { metadata: JSON.stringify(newSessionMeta) },
    });

    return {
      campaign,
      asset,
    };
  }
}
