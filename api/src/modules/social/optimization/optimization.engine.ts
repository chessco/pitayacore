import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';
import { AiService } from '../../ai/ai.service';

@Injectable()
export class OptimizationEngine {
  private readonly logger = new Logger(OptimizationEngine.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly aiService: AiService,
  ) {}

  async getInsights(tenantId: string): Promise<any> {
    this.logger.log(`Generating optimization insights for tenant ${tenantId}`);

    // Fetch analytics and pieces
    const analytics = await this.db.mysql.postAnalytics.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    if (analytics.length === 0) {
      return {
        summary: 'Aún no hay suficientes datos analíticos para generar optimizaciones.',
        recommendations: [
          {
            title: 'Configura canales sociales',
            description: 'Conecta al menos un proveedor social y publica contenidos para iniciar la recopilación de métricas.',
            impact: 'HIGH',
          },
        ],
        platformComparison: [],
        abTestingSuggestions: [],
      };
    }

    // Compute simple local stats
    const totalReach = analytics.reduce((acc, curr) => acc + curr.reach, 0);
    const totalEngagement = analytics.reduce((acc, curr) => acc + curr.engagement, 0);
    const avgCtr = analytics.length > 0 ? analytics.reduce((acc, curr) => acc + curr.ctr, 0) / analytics.length : 0;

    const dataContext = `Métricas generales acumuladas de los últimos ${analytics.length} posts:
    - Alcance Total: ${totalReach}
    - Engagement Total: ${totalEngagement}
    - CTR Promedio: ${avgCtr.toFixed(2)}%
    
    Detalles por plataforma:
    ${analytics.map((a) => `- Proveedor: ${a.provider}, Alcance: ${a.reach}, Engagement: ${a.engagement}, CTR: ${a.ctr}%`).join('\n')}`;

    const prompt = `Actúa como un analista de marketing experto y estratega de optimización de redes sociales.
A partir del siguiente contexto analítico de posts de la marca:

"""
${dataContext}
"""

Responde con un objeto JSON válido que contenga la estructura descrita abajo (no agregues texto fuera del JSON, solo el JSON puro):
{
  "summary": "Resumen ejecutivo humano del rendimiento, identificando qué funciona mejor y por qué.",
  "recommendations": [
    {
      "title": "Título sugerencia accionable",
      "description": "Explicación detallada de por qué y cómo implementarlo.",
      "impact": "HIGH | MEDIUM | LOW"
    }
  ],
  "platformComparison": [
    {
      "platform": "FACEBOOK | INSTAGRAM | LINKEDIN | etc.",
      "performance": "Excelente | Promedio | Requiere optimización",
      "metric": "CTR de X% u otra métrica destacable"
    }
  ],
  "abTestingSuggestions": [
    {
      "test": "Hipótesis del test A/B (ej: Tono humorístico vs. técnico)",
      "metric": "Métrica clave a medir (ej: Conversión / ROI)"
    }
  ]
}`;

    try {
      const aiResponse = await this.aiService.generateRaw(prompt, 'gemini-2.5-flash');
      // Clean JSON formatting from Gemini if present
      const jsonStart = aiResponse.indexOf('{');
      const jsonEnd = aiResponse.lastIndexOf('}') + 1;
      const jsonStr = aiResponse.substring(jsonStart, jsonEnd);
      return JSON.parse(jsonStr);
    } catch (error) {
      this.logger.error('Error generating optimization insights via AI', error);
      return {
        summary: 'Error al computar optimizaciones asistidas por IA. Mostrando resumen preliminar.',
        recommendations: [
          {
            title: 'Monitoreo de interacción',
            description: `Se detectaron ${totalReach} personas alcanzadas. Recomendamos maximizar publicaciones los martes y jueves.`,
            impact: 'MEDIUM',
          },
        ],
        platformComparison: [],
        abTestingSuggestions: [],
      };
    }
  }
}
