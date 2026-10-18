import { Injectable, Logger } from '@nestjs/common';
import { AiService } from './ai.service';
import { DatabaseService } from '../../common/database/database.service';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';
import { getTenantId } from '../../common/tenant/tenant.middleware';
import { AgentsService } from '../agents/agents.service';

export enum RouterDecision {
  STATIC = 'STATIC',
  CHEAP = 'CHEAP',
  RAG = 'RAG',
  PREMIUM = 'PREMIUM',
  HUMAN = 'HUMAN',
}

export interface RouterResponse {
  decision: RouterDecision;
  content: string;
  cost?: number;
  confidence: number;
  isFlagged: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    toolCalls: number;
  };
}

@Injectable()
export class AiRouterService {
  private readonly logger = new Logger(AiRouterService.name);

  constructor(
    private ai: AiService,
    private db: DatabaseService,
    private kb: KnowledgeBaseService,
    private agentsService: AgentsService,
  ) {}

  private activeKbCache = new Map<
    string,
    { hasActive: boolean; expiresAt: number }
  >();

  clearActiveKbCache(tenantId?: string) {
    if (tenantId) {
      this.activeKbCache.delete(tenantId);
    } else {
      this.activeKbCache.clear();
    }
  }

  async hasActiveKnowledgeBase(tenantId: string): Promise<boolean> {
    if (!tenantId) {
      return false;
    }

    const now = Date.now();
    const cached = this.activeKbCache.get(tenantId);
    if (cached && cached.expiresAt > now) {
      return cached.hasActive;
    }

    const activeKb = await this.db.mysql.knowledgeBase.findFirst({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    const hasActive = !!activeKb;
    this.activeKbCache.set(tenantId, {
      hasActive,
      expiresAt: now + 60_000,
    });

    return hasActive;
  }

  async route(
    userInput: string,
    tenantIdParam?: string,
    skills?: any,
    agentSlug?: string,
    channel: string = 'whatsapp',
    metadata?: any,
    conversationId?: string,
    excludeMessageId?: string,
  ): Promise<RouterResponse> {
    const tenantId = tenantIdParam || getTenantId();
    console.log(`[AiRouter] Routing message. Skills received:`, skills);

    // 0. Check for Human Correction (Manual override) - Priority 1
    const correction = await this.checkHumanCorrection(userInput, tenantId);
    if (correction) {
      this.logger.log(`[AiRouter] Human Correction found for: ${userInput}`);
      return {
        decision: RouterDecision.STATIC,
        content: correction.response,
        cost: 0,
        confidence: 1.0,
        isFlagged: false,
      };
    }

    // 0. Fetch recent history for context
    const historyWhere: any = { tenantId };
    if (conversationId) {
      historyWhere.conversationId = conversationId;
    }
    if (excludeMessageId) {
      historyWhere.id = { not: excludeMessageId };
    }

    const history = await this.db.mysql.messageOld.findMany({
      where: historyWhere,
      orderBy: { createdAt: 'desc' },
      take: 6, // Last 3 turns
    });
    const filteredHistory = excludeMessageId
      ? history.filter((m: any) => m.id !== excludeMessageId)
      : history;
    const formattedHistory = [...filteredHistory].reverse();

    // 1. Check for FAQ (Static) - Cost: $0
    const faq = await this.checkFaq(userInput, tenantId);
    if (faq) {
      return {
        decision: RouterDecision.STATIC,
        content: faq.content,
        cost: 0,
        confidence: 1.0,
        isFlagged: false,
      };
    }

    // Si se especifica un agentSlug explícito (ej. Asistente Interno con 'alicia'),
    // enrutar directamente a handleRAG para respetar la identidad del agente y el modelo del tenant.
    if (agentSlug) {
      return {
        decision: RouterDecision.RAG,
        ...(await this.handleRAG(
          userInput,
          tenantId,
          skills,
          formattedHistory,
          agentSlug,
          channel,
          metadata,
        )),
      };
    }

    // 2. Classify Complexity
    const classification = await this.classifyComplexity(userInput, tenantId);

    // 3. Route based on complexity
    if (classification.complexity === 'low') {
      const response = await this.ai.generateResponse(
        userInput,
        formattedHistory,
        undefined,
        undefined,
        channel,
        tenantId,
        agentSlug,
      );
      return { decision: RouterDecision.CHEAP, ...response };
    }

    if (classification.complexity === 'technical') {
      return {
        decision: RouterDecision.RAG,
        ...(await this.handleRAG(
          userInput,
          tenantId,
          skills,
          formattedHistory,
          agentSlug,
          channel,
          metadata,
        )),
      };
    }

    if (classification.complexity === 'critical') {
      return {
        decision: RouterDecision.PREMIUM,
        ...(await this.ai.generateResponse(
          userInput,
          formattedHistory,
          undefined,
          undefined,
          channel,
          tenantId,
          agentSlug,
        )),
      };
    }

    return {
      decision: RouterDecision.HUMAN,
      content: 'Escalating to a technical advisor.',
      isFlagged: true,
      confidence: 1.0,
    };
  }

  private async checkFaq(input: string, tenantId: string) {
    // Simple exact match or high-score full-text search for simulation
    return await this.db.mysql.knowledgeBaseChunk.findFirst({
      where: {
        tenantId,
        content: { contains: input }, // In reality, use Full-text index or high-threshold similarity
        kb: { status: 'ACTIVE' },
      },
    });
  }

  private async checkHumanCorrection(input: string, tenantId: string) {
    return await this.db.mysql.humanCorrection.findFirst({
      where: {
        tenantId,
        isActive: true,
        trigger: { contains: input },
      },
    });
  }

  private async classifyComplexity(input: string, tenantId?: string) {
    // Using a very small prompt to classify
    const prompt = `Classify the complexity of this user query: "${input}". 
    Options: low (greetings, simple info), technical (troubleshooting, technical details), critical (emergencies, business critical).
    Return JSON: { "complexity": "low" | "technical" | "critical" }`;

    const result = await this.ai.generateRaw(prompt, undefined, tenantId);
    try {
      return JSON.parse(result);
    } catch {
      return { complexity: 'technical' }; // Default to technical for safety
    }
  }

  private async handleRAG(
    input: string,
    tenantId: string,
    skills?: any,
    history: any[] = [],
    agentSlug?: string,
    channel: string = 'whatsapp',
    metadata?: any,
  ) {
    // 1. Load Agent Persona
    let persona = `Eres PitayaCore AI, un asistente inteligente experto.`;
    let agentModel: string | undefined = undefined;

    if (agentSlug) {
      const agent = await this.agentsService.findBySlug(agentSlug, tenantId);
      if (agent) {
        this.logger.log(`[AiRouter] Using Agent: ${agent.name}`);
        persona = agent.prompt;
        agentModel = agent.defaultModel || undefined;
      } else {
        this.logger.warn(
          `[AiRouter] Agent slug '${agentSlug}' provided but not found. Using default persona.`,
        );
      }
    } else if (skills?.default_assistant || skills?.don_juan_camaron) {
      // Fallback para retrocompatibilidad
      const assistant =
        (await this.agentsService.findBySlug('default-assistant', tenantId)) ||
        (await this.agentsService.findBySlug('don-juan', tenantId));
      persona = assistant?.prompt || persona;
    }

    // 2. SEMANTIC SEARCH (RAG 2.0)
    let context = '';
    try {
      let filterIds: string[] | undefined = undefined;

      if (
        channel.toUpperCase() === 'CAPSULE' &&
        (metadata?.capsuleId || metadata?.capsuleTitle)
      ) {
        const capsule = await this.db.mysql.capsule.findFirst({
          where: metadata?.capsuleId
            ? { id: metadata.capsuleId }
            : { title: metadata.capsuleTitle },
        });
        if (capsule) {
          // 2.a Add capsule's OWN content (Landing page info) to context
          const landingContent = `
DATOS DE LA LANDING PAGE (Contexto inmediato):
Título: ${capsule.title}
Descripción General: ${capsule.description}
Bloques de Contenido: ${JSON.stringify(capsule.contentBlocks)}
`;
          context += landingContent + '\n---\n';

          if (capsule.knowledgeIds) {
            filterIds = capsule.knowledgeIds as string[];
            this.logger.log(
              `[AiRouter] Restricting search to capsule knowledge: ${filterIds.join(', ')}`,
            );
          }
        }
      }

      const hasActiveKb = await this.hasActiveKnowledgeBase(tenantId);
      if (hasActiveKb) {
        const results = (await this.kb.search(input, 3, filterIds)) as any[];
        context += results.map((r: any) => r.content).join('\n---\n');
        console.log(
          `[AiRouter] Semantic search found ${results.length} relevant chunks.`,
        );
      }
    } catch (e) {
      this.logger.error(`Semantic search failed: ${e.message}`);
    }

    const userPrompt = context
      ? `BASÁNDOTE EN ESTA INFORMACIÓN TÉCNICA:\n${context}\n\nRESPONDE A ESTA CONSULTA: ${input}`
      : input;

    const effectiveAgentSlug =
      agentSlug ||
      (skills?.don_juan_camaron
        ? 'don-juan'
        : skills?.default_assistant
          ? 'default-assistant'
          : undefined);

    if (metadata?.tools || metadata?.toolCallback) {
      return await this.ai.generateResponse(
        userPrompt,
        history,
        agentModel,
        persona,
        channel,
        tenantId,
        effectiveAgentSlug,
        metadata.tools,
        metadata.toolCallback,
      );
    }

    return await this.ai.generateResponse(
      userPrompt,
      history,
      agentModel,
      persona,
      channel,
      tenantId,
      effectiveAgentSlug,
    );
  }
}
