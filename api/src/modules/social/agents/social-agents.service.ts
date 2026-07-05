import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';
import { AiService } from '../../ai/ai.service';

@Injectable()
export class SocialAgentsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly aiService: AiService,
  ) {}

  async listTemplates() {
    return this.db.mysql.agentTemplate.findMany({
      where: {
        slug: {
          in: [
            'creative-director',
            'marketing-strategist',
            'copywriter',
            'humanizer-agent',
            'compliance-agent',
            'designer-agent',
            'publisher-agent',
            'performance-analyst',
          ],
        },
      },
    });
  }

  async chat(tenantId: string, agentSlug: string, message: string, contextData?: any) {
    const template = await this.db.mysql.agentTemplate.findFirst({
      where: { slug: agentSlug },
    });

    if (!template) {
      throw new NotFoundException(`Agent template for slug '${agentSlug}' not found`);
    }

    const systemPrompt = template.systemPrompt || `Actúas como un agente experto del sistema de Social Suite.`;
    const contextPrompt = contextData
      ? `\nContexto adicional de la marca/campaña:\n${JSON.stringify(contextData)}\n`
      : '';

    const res = await this.aiService.generateResponse(
      message,
      [],
      template.defaultModel || 'gemini-2.5-flash',
      `${systemPrompt}${contextPrompt}`,
      'web',
    );

    return {
      agentSlug,
      response: res.content,
      confidence: res.confidence,
    };
  }
}
