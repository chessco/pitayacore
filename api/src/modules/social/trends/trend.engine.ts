import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../../ai/ai.service';
import { SocialMemoryService } from '../memory/social-memory.service';

@Injectable()
export class TrendEngine {
  private readonly logger = new Logger(TrendEngine.name);

  constructor(
    private readonly aiService: AiService,
    private readonly memoryService: SocialMemoryService,
  ) {}

  async fetchTrends(tenantId: string, sector = 'marketing'): Promise<any> {
    this.logger.log(`Fetching trends for sector: ${sector} and tenant ${tenantId}`);

    const prompt = `Actúa como un analista de tendencias (Coolhunter) digital y estratega de redes sociales.
Analiza la industria/sector: "${sector}".

Genera un reporte de tendencias actualizadas en formato JSON estructurado tal como se detalla abajo. No agregues explicaciones fuera de la respuesta JSON:
{
  "hashtags": [
    { "tag": "#NombreTag", "volume": "Alto | Creciente | Estable", "context": "De qué trata la conversación" }
  ],
  "topics": [
    { "title": "Tema viral o tendencia actual", "growth": "+45%", "description": "Por qué es relevante publicar sobre esto hoy" }
  ],
  "competitorAnalysis": [
    { "competitor": "Competidor sugerido", "recentStrategy": "Descripción de qué tipo de posts/estrategia visual están usando", "engagement": "Alto" }
  ],
  "recommendedPrompts": [
    "Prompt de generación para que nuestro copywriter cree una pieza sobre la tendencia X",
    "Prompt de generación visual sobre la tendencia Y"
  ]
}`;

    try {
      const aiResponse = await this.aiService.generateRaw(prompt, 'gemini-2.5-flash');
      const jsonStart = aiResponse.indexOf('{');
      const jsonEnd = aiResponse.lastIndexOf('}') + 1;
      const jsonStr = aiResponse.substring(jsonStart, jsonEnd);
      const parsed = JSON.parse(jsonStr);

      // Index trend report in memory for future reference
      const trendContent = `Sector: ${sector}. Hashtags destacados: ${parsed.hashtags.map((h: any) => h.tag).join(', ')}. Temas: ${parsed.topics.map((t: any) => t.title).join('; ')}`;
      await this.memoryService.indexMemory(
        tenantId,
        `trend_${sector}_${Date.now()}`,
        'TREND_MEMORY',
        trendContent,
      );

      return parsed;
    } catch (error) {
      this.logger.error('Error fetching trends via AI', error);
      return {
        hashtags: [
          { tag: '#SocialIntelligence', volume: 'Creciente', context: 'Uso de IA en flujos de marketing' },
          { tag: '#VisionAI', volume: 'Alto', context: 'Generación visual de alta calidad' },
        ],
        topics: [
          { title: 'Automatización Humana', growth: '+15%', description: 'Interés por copys que no parezcan escritos por IA' },
        ],
        competitorAnalysis: [],
        recommendedPrompts: [
          'Escribe un artículo sobre cómo la inteligencia social supera a la analítica básica.',
        ],
      };
    }
  }
}
