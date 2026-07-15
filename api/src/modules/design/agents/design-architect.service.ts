import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../../ai/ai.service';
import { BrandIdentityWorkflow } from '../workflows/brand-identity.workflow';
import { DesignMemoryService } from '../memory/design-memory.service';
import { DatabaseService } from '../../../common/database/database.service';

export interface DesignAgentInput {
  tenantId: string;
  task:
    | 'generate-brand-identity'
    | 'analyze-brand'
    | 'recommend-theme'
    | 'validate-accessibility'
    | 'query';
  brandId?: string;
  payload?: any;
  context?: string;
}

export interface DesignAgentResult {
  success: boolean;
  task: string;
  response?: string;
  data?: any;
  error?: string;
}

const DESIGN_ARCHITECT_SLUG = 'design-architect';

@Injectable()
export class DesignArchitectService {
  private readonly logger = new Logger(DesignArchitectService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly brandIdentityWorkflow: BrandIdentityWorkflow,
    private readonly memory: DesignMemoryService,
    private readonly db: DatabaseService,
  ) {}

  async run(input: DesignAgentInput): Promise<DesignAgentResult> {
    const { tenantId, task, brandId, payload } = input;
    this.logger.log(`[DesignArchitect] Task: ${task} | Tenant: ${tenantId}`);

    // Load memory context for the agent
    const memoryContext = await this.memory.buildAgentContext(
      tenantId,
      brandId,
    );

    switch (task) {
      case 'generate-brand-identity':
        return this.handleBrandIdentity(tenantId, payload, memoryContext);

      case 'analyze-brand':
        return this.handleAnalyzeBrand(
          tenantId,
          brandId,
          payload,
          memoryContext,
        );

      case 'recommend-theme':
        return this.handleRecommendTheme(tenantId, brandId, memoryContext);

      case 'validate-accessibility':
        return this.handleValidateAccessibility(payload);

      case 'query':
        return this.handleQuery(tenantId, payload?.question, memoryContext);

      default:
        return { success: false, task, error: `Unknown task: ${task}` };
    }
  }

  private async handleBrandIdentity(
    tenantId: string,
    payload: any,
    memoryContext: string,
  ): Promise<DesignAgentResult> {
    if (!payload?.brandId || !payload?.brandName) {
      return {
        success: false,
        task: 'generate-brand-identity',
        error: 'brandId and brandName are required',
      };
    }

    const result = await this.brandIdentityWorkflow.execute({
      tenantId,
      brandId: payload.brandId,
      brandName: payload.brandName,
      industry: payload.industry || 'technology',
      description: payload.description || '',
      logo: payload.logo,
      website: payload.website,
    });

    return {
      success: result.success,
      task: 'generate-brand-identity',
      data: result,
    };
  }

  private async handleAnalyzeBrand(
    tenantId: string,
    brandId: string,
    payload: any,
    memoryContext: string,
  ): Promise<DesignAgentResult> {
    const systemPrompt = `You are the Design Architect — an expert AI specializing in brand identity, design systems, and visual strategy for SaaS products.
${memoryContext ? `\n${memoryContext}\n` : ''}
Provide actionable, expert brand analysis. Be specific and professional.`;

    const question = `Analyze this brand and provide strategic recommendations:
Name: ${payload?.brandName || 'Unknown'}
Industry: ${payload?.industry || 'Unknown'}
Description: ${payload?.description || 'No description provided'}
Website: ${payload?.website || 'Not provided'}

Provide: personality assessment, color palette recommendations, typography guidance, and brand strengths/weaknesses.`;

    const response = await this.aiService.generateResponse(
      question,
      [],
      'gemini-2.5-flash',
      systemPrompt,
      'api',
    );

    // Save analysis to memory
    if (brandId) {
      await this.memory.saveBrandMemory(
        tenantId,
        'BrandAnalysis',
        `Brand Analysis — ${payload?.brandName}`,
        { analysis: response.content, payload },
        brandId,
      );
    }

    return { success: true, task: 'analyze-brand', response: response.content };
  }

  private async handleRecommendTheme(
    tenantId: string,
    brandId: string,
    memoryContext: string,
  ): Promise<DesignAgentResult> {
    const themes = await this.db.mysql.theme.findMany({
      where: { tenantId },
      include: { tokens: true, brand: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    const systemPrompt = `You are the Design Architect. Analyze the existing themes and make recommendations.
${memoryContext ? `\n${memoryContext}\n` : ''}`;

    const context = themes
      .slice(0, 5)
      .map(
        (t) =>
          `- ${t.name} (${t.mode}, ${t.status}) — ${t.tokens.length} tokens`,
      )
      .join('\n');

    const response = await this.aiService.generateResponse(
      `Existing themes:\n${context}\n\nProvide recommendations for improving the design system.`,
      [],
      'gemini-2.5-flash',
      systemPrompt,
      'api',
    );

    return {
      success: true,
      task: 'recommend-theme',
      response: response.content,
      data: { themeCount: themes.length },
    };
  }

  private handleValidateAccessibility(payload: any): DesignAgentResult {
    const tokens = payload?.tokens || [];
    const issues: string[] = [];
    const passed: string[] = [];

    // Check minimum token set
    const requiredColors = ['primary', 'background', 'text-primary'];
    for (const req of requiredColors) {
      const found = tokens.find((t: any) => t.name === req);
      if (!found) {
        issues.push(`Missing required token: ${req}`);
      } else {
        passed.push(`✓ Token "${req}" present: ${found.value}`);
      }
    }

    return {
      success: true,
      task: 'validate-accessibility',
      data: {
        passed,
        issues,
        isCompliant: issues.length === 0,
        recommendation:
          issues.length > 0
            ? 'Fix missing tokens and run /design/workflows/brand-identity to regenerate a complete set.'
            : 'Token set is complete. Run contrast validation for full WCAG compliance.',
      },
    };
  }

  private async handleQuery(
    tenantId: string,
    question: string,
    memoryContext: string,
  ): Promise<DesignAgentResult> {
    if (!question) {
      return { success: false, task: 'query', error: 'question is required' };
    }

    const systemPrompt = `You are the Design Architect for PitayaCore — an expert in brand identity, design systems, and white-label platforms.
${memoryContext ? `\nContext from brand memory:\n${memoryContext}\n` : ''}
Answer questions about design, themes, tokens, branding, and visual identity. Be concise and actionable.`;

    const response = await this.aiService.generateResponse(
      question,
      [],
      'gemini-2.5-flash',
      systemPrompt,
      'api',
    );

    return { success: true, task: 'query', response: response.content };
  }

  async ensureAgentRegistered(tenantId: string): Promise<void> {
    try {
      const existing = await this.db.mysql.agent.findFirst({
        where: { slug: DESIGN_ARCHITECT_SLUG },
      });

      if (!existing) {
        await this.db.mysql.agent.create({
          data: {
            tenantId,
            name: 'Design Architect',
            slug: DESIGN_ARCHITECT_SLUG,
            description:
              'Official Design Architect agent for the PitayaCore Design Suite. Specializes in brand identity, theme generation, design tokens, white-label configuration, and WCAG accessibility.',
            prompt:
              'You are the Design Architect — the visual intelligence of PitayaCore. You analyze brands, generate design systems, recommend themes, and ensure visual consistency across all PitayaCode products.',
            isActive: true,
            category: 'design',
            status: 'PRODUCTION',
            version: '1.0.0',
          },
        });
        this.logger.log(
          `[DesignArchitect] Agent registered in Agent table with slug: ${DESIGN_ARCHITECT_SLUG}`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `[DesignArchitect] Could not register agent: ${err.message}`,
      );
    }
  }
}
