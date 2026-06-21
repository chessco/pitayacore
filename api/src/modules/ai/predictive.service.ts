import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { AiService } from './ai.service';
import { DatabaseService } from '../../common/database/database.service';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';
import { getTenantId } from '../../common/tenant/tenant.middleware';

@Injectable()
export class PredictiveService {
  private readonly logger = new Logger(PredictiveService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly db: DatabaseService,
    @Inject(forwardRef(() => KnowledgeBaseService))
    private readonly kbService: KnowledgeBaseService,
  ) {}

  async generateInsight(tenantId: string, data: any) {
    this.logger.log(`Generating predictive insight for tenant ${tenantId}`);

    const prompt = `
      SISTEMA: Hub Predictivo PitayaCore AI.
      CONTEXTO: Análisis de parámetros en cultivo de camarón.
      DATOS ACTUALES: ${JSON.stringify(data)}
      
      TAREA:
      1. Identificar tendencias críticas (Oxígeno, Temperatura, Salinidad).
      2. Predecir riesgos biológicos (Hipoxia, Estrés Térmico, Patógenos).
      3. Dar 3 recomendaciones técnicas accionables.
      
      FORMATO: Texto profesional, directo, técnico. Máximo 150 palabras.
    `;

    try {
      const result = await this.aiService.generateResponse(prompt, []);
      return {
        insight: result.content,
        confidence: 0.94,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error generating insight: ${error.message}`);
      throw error;
    }
  }

  async analyzeConversation(messages: any[]) {
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return {
        sentiment: "Neutral",
        intent: "Soporte",
        summary: "Sin mensajes para analizar.",
        suggestedResponse: "Hola, ¿en qué puedo ayudarte?",
        confidence: 1.0,
        references: []
      };
    }
    const lastMessage = messages[messages.length - 1]?.content || '';
    // Use the full conversation context for search, not just the last message
    const recentMessages = messages.slice(-15);
    const context = recentMessages.map(m => `${m.role === 'user' ? 'CLIENTE' : 'AI'}: ${m.content}`).join('\n');
    
    // Build a search query from recent user messages to capture the real topic
    const userMessages = recentMessages.filter(m => m.role === 'user').map(m => m.content);
    const searchQuery = userMessages.slice(-3).join(' '); // Last 3 user messages for KB search
    
    let references: any[] = [];
    try {
      // Search using combined context from recent user messages
      const realRefs = await this.kbService.search(searchQuery, 3) as any[];
      if (realRefs && realRefs.length > 0) {
        references = await Promise.all(realRefs.map(async (ref: any) => {
          const kb = await this.db.mysql.knowledgeBase.findUnique({ where: { id: ref.refId } });
          return { id: ref.refId, title: kb?.title || 'Documento Técnico' };
        }));
      }
    } catch (searchError) {
      this.logger.error(`KB Search failed: ${searchError.message}`);
    }

    const prompt = `
      SISTEMA: Analista de Conversaciones PitayaCore AI.
      CONVERSACIÓN RECIENTE:
      ${context}
      
      REFERENCIAS ENCONTRADAS (BASE DE CONOCIMIENTO):
      ${JSON.stringify(references)}

      TAREA:
      Analiza la conversación y responde estrictamente en formato JSON con la siguiente estructura:
      {
        "sentiment": "Positivo" | "Neutral" | "Negativo",
        "intent": "Técnica" | "Soporte" | "Comercial" | "Urgencia",
        "summary": "Breve resumen de 1 oración",
        "suggestedResponse": "Sugerencia de respuesta profesional",
        "confidence": 0.XX,
        "references": [{"id": "UUID", "title": "Nombre del Documento"}]
      }
      
      IMPORTANTE:
      - Si hay REFERENCIAS ENCONTRADAS relevantes al tema, inclúyelas en el campo "references".
      - Si no hay referencias relevantes, deja el campo "references" como un arreglo vacío [].
      - El resumen debe ser conciso.
    `;

    try {
      const tenantId = getTenantId();
      
      // Fetch the "Don Juan Camarón" skill or any active skill for this tenant
      const activeSkill = await this.db.mysql.skill.findFirst({
        where: { 
          OR: [
            { tenantId },
            { tenantId: 'DEFAULT_TENANT' }
          ],
          id: { contains: 'juan' } // Specifically look for the Juan skill for now
        }
      });

      const result = await this.aiService.generateResponse(
        prompt, 
        [], 
        'gemini-2.5-flash', 
        activeSkill?.prompt
      );
      
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("La IA no devolvió un formato JSON válido.");
      }

        try {
        const parsed = JSON.parse(jsonMatch[0]);
        // Merge or prioritize references found by semantic search if AI returned empty
        if ((!parsed.references || parsed.references.length === 0) && references.length > 0) {
          parsed.references = references;
        }
        
        // Final deduplication of references by ID
        if (parsed.references && parsed.references.length > 0) {
          const uniqueRefs = [];
          const seenIds = new Set();
          for (const ref of parsed.references) {
            if (!seenIds.has(ref.id)) {
              seenIds.add(ref.id);
              uniqueRefs.push(ref);
            }
          }
          parsed.references = uniqueRefs;
        }

        return parsed;
      } catch (parseError) {
        this.logger.error(`Failed to parse AI JSON: ${jsonMatch[0].substring(0, 100)}...`);
        throw new Error('Formato JSON inválido detectado.');
      }
    } catch (error) {
      this.logger.error(`Error analyzing conversation: ${error.message}`);
      return {
        sentiment: "Neutral",
        intent: "Soporte",
        summary: `Error: ${error.message}. (Modo Resiliencia activado para diagnóstico)`,
        suggestedResponse: "Lo siento, hubo un error técnico al analizar esta parte. Por favor, reintenta en un momento.",
        confidence: 0.8,
        references: []
      };
    }
  }
}
