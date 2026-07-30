import { Injectable } from '@nestjs/common';
import { GeminiProvider } from '../../../../infrastructure/providers/ai/gemini.provider';
import { TopicCatalogService } from './topic-catalog.service';
import { AnalysisResult, ANALYSIS_SCHEMA } from './analysis.contract';

/**
 * Runs the 7 analysis agents over one piece of content.
 *
 * Agents: (1) language detection, (2) summarization, (3) sentiment,
 * (4) topic classification, (5) named-entity recognition, (6) risk
 * classification, (7) recommendation generation. Executed as a single
 * structured-output call to the configured AI provider for cost/latency.
 */
@Injectable()
export class ContentAnalyzer {
  constructor(
    private readonly gemini: GeminiProvider,
    private readonly topics: TopicCatalogService,
  ) {}

  async analyze(
    content: string,
    context: { source: string; type: string },
  ): Promise<AnalysisResult> {
    const catalog = this.topics.getCatalog();

    const systemInstruction = [
      'Eres un analista de inteligencia social. Analiza el contenido y responde EXCLUSIVAMENTE con JSON válido según el esquema.',
      'Realiza estas tareas:',
      '1) Detecta el idioma (código ISO, ej. "es", "en").',
      '2) Resume el contenido en una o dos frases.',
      '3) Clasifica el sentimiento como POSITIVE, NEGATIVE, NEUTRAL o MIXED, con un puntaje entre -1 y 1.',
      `4) Clasifica los temas eligiendo ÚNICAMENTE de este catálogo: ${catalog.join(', ')}. Usa "Otros" si ninguno aplica.`,
      '5) Extrae entidades nombradas con su tipo: PERSON, MUNICIPALITY, COLONY, INSTITUTION, DEPENDENCY, ORGANIZATION, PARTY, CANDIDATE.',
      '6) Clasifica el nivel de riesgo como LOW, MEDIUM, HIGH o CRITICAL.',
      '7) Genera acciones sugeridas para un humano. NUNCA propongas ejecutar acciones automáticamente; son solo sugerencias.',
    ].join('\n');

    const prompt = `Contenido (${context.source} · ${context.type}):\n"""${content}"""`;

    return this.gemini.generateStructuredData<AnalysisResult>(
      prompt,
      ANALYSIS_SCHEMA,
      systemInstruction,
    );
  }
}
