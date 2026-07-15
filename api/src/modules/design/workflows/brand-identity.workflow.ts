import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../../ai/ai.service';
import { ThemesService } from '../themes/themes.service';
import { ThemeRegistryService } from '../registry/theme-registry.service';
import { DesignMemoryService } from '../memory/design-memory.service';
import { DesignGateway } from '../gateways/design.gateway';
import { DatabaseService } from '../../../common/database/database.service';

export interface BrandIdentityInput {
  brandId: string;
  tenantId: string;
  brandName: string;
  industry: string;
  description: string;
  logo?: string;
  website?: string;
  requestedBy?: string;
}

export interface BrandIdentityResult {
  success: boolean;
  lightThemeId?: string;
  darkThemeId?: string;
  lightTheme?: any;
  darkTheme?: any;
  tokens?: any[];
  accessibilityReport?: any;
  preview?: any;
  error?: string;
}

@Injectable()
export class BrandIdentityWorkflow {
  private readonly logger = new Logger(BrandIdentityWorkflow.name);

  constructor(
    private readonly aiService: AiService,
    private readonly themesService: ThemesService,
    private readonly registry: ThemeRegistryService,
    private readonly memory: DesignMemoryService,
    private readonly gateway: DesignGateway,
    private readonly db: DatabaseService,
  ) {}

  async execute(input: BrandIdentityInput): Promise<BrandIdentityResult> {
    const {
      tenantId,
      brandId,
      brandName,
      industry,
      description,
      logo,
      website,
    } = input;
    this.logger.log(
      `[BrandIdentityWorkflow] Starting for brand: ${brandName} (${tenantId})`,
    );

    try {
      // ── Step 1: Analyze Brand ──────────────────────────────────────
      this.logger.debug('[Step 1] Analyzing brand...');
      const brandAnalysis = await this.analyzeBrand(
        brandName,
        industry,
        description,
        website,
      );

      // ── Step 2: Analyze Logo ───────────────────────────────────────
      this.logger.debug('[Step 2] Analyzing logo...');
      const logoInsights = logo ? this.analyzeLogo(logo, brandAnalysis) : null;

      // ── Step 3: Generate Design Tokens (Light) ─────────────────────
      this.logger.debug('[Step 3] Generating light tokens...');
      const lightTokens = await this.generateTokens(
        brandName,
        industry,
        description,
        'LIGHT',
        brandAnalysis,
      );

      // ── Step 4: Generate Light Theme ───────────────────────────────
      this.logger.debug('[Step 4] Creating light theme...');
      const lightTheme = await this.themesService.create(tenantId, {
        brandId,
        name: `${brandName} — Light`,
        description: `Auto-generated light theme for ${brandName}`,
        mode: 'LIGHT',
        status: 'DRAFT',
        version: '1.0.0',
        tokens: lightTokens,
      });

      // ── Step 5: Generate Dark Theme ────────────────────────────────
      this.logger.debug('[Step 5] Generating dark tokens...');
      const darkTokens = await this.generateTokens(
        brandName,
        industry,
        description,
        'DARK',
        brandAnalysis,
      );

      this.logger.debug('[Step 5b] Creating dark theme...');
      const darkTheme = await this.themesService.create(tenantId, {
        brandId,
        name: `${brandName} — Dark`,
        description: `Auto-generated dark theme for ${brandName}`,
        mode: 'DARK',
        status: 'DRAFT',
        version: '1.0.0',
        tokens: darkTokens,
      });

      // ── Step 6: Validate Accessibility ─────────────────────────────
      this.logger.debug('[Step 6] Validating accessibility...');
      const accessibilityReport = this.validateAccessibility(lightTokens);

      // ── Step 7: Generate Preview Manifest ──────────────────────────
      this.logger.debug('[Step 7] Generating preview manifest...');
      const preview = this.buildPreview(
        lightTheme,
        darkTheme,
        lightTokens,
        darkTokens,
        accessibilityReport,
      );

      // ── Step 8: Register (Publish Light Theme) ─────────────────────
      this.logger.debug('[Step 8] Publishing light theme to registry...');
      const publishedLight = await this.registry.publish(
        lightTheme.id,
        tenantId,
      );

      // ── Step 9: Activate Light Theme ───────────────────────────────
      this.logger.debug('[Step 9] Activating light theme...');
      await this.themesService.activate(lightTheme.id, tenantId);

      // ── Memory: persist brand analysis and design decisions ─────────
      await this.memory.saveBrandMemory(
        tenantId,
        'BrandAnalysis',
        `Brand Analysis: ${brandName}`,
        { brandAnalysis, logoInsights },
        brandId,
      );

      await this.memory.saveBrandMemory(
        tenantId,
        'ThemeHistory',
        `Generated themes for ${brandName}`,
        {
          lightThemeId: lightTheme.id,
          darkThemeId: darkTheme.id,
          accessibilityReport,
        },
        brandId,
      );

      await this.memory.saveBrandMemory(
        tenantId,
        'DesignDecision',
        `Token palette selected for ${brandName}`,
        {
          lightTokens: lightTokens.slice(0, 5),
          darkTokens: darkTokens.slice(0, 5),
        },
        brandId,
      );

      // ── WebSocket notification ──────────────────────────────────────
      this.gateway.emitWorkflowCompleted(tenantId, 'GenerateBrandIdentity', {
        lightThemeId: lightTheme.id,
        darkThemeId: darkTheme.id,
        brandId,
      });

      this.logger.log(
        `[BrandIdentityWorkflow] Completed successfully for brand: ${brandName}`,
      );

      return {
        success: true,
        lightThemeId: lightTheme.id,
        darkThemeId: darkTheme.id,
        lightTheme: publishedLight,
        darkTheme,
        tokens: lightTokens,
        accessibilityReport,
        preview,
      };
    } catch (error) {
      this.logger.error(
        `[BrandIdentityWorkflow] Failed: ${error.message}`,
        error.stack,
      );
      return { success: false, error: error.message };
    }
  }

  // ── Private Helpers ──────────────────────────────────────────────────

  private async analyzeBrand(
    brandName: string,
    industry: string,
    description: string,
    website?: string,
  ): Promise<any> {
    const prompt = `You are a Senior Brand Strategist. Analyze this brand and return a compact JSON object with personality, values, and color preferences.

Brand: ${brandName}
Industry: ${industry}
Description: ${description}
${website ? `Website: ${website}` : ''}

Return ONLY valid JSON (no markdown):
{
  "personality": ["professional", "innovative", "trustworthy"],
  "values": ["quality", "reliability"],
  "colorMood": "cool and trustworthy",
  "suggestedPrimaryHue": "blue-indigo",
  "suggestedAccentHue": "amber",
  "fontStyle": "modern-sans"
}`;

    const response = await this.aiService.generateResponse(
      prompt,
      [],
      'gemini-2.5-flash',
      'You are a JSON-only brand strategist.',
      'api',
    );

    try {
      const clean = response.content
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      return JSON.parse(clean);
    } catch {
      return {
        personality: ['professional'],
        colorMood: 'neutral',
        suggestedPrimaryHue: 'blue',
      };
    }
  }

  private analyzeLogo(logoUrl: string, brandAnalysis: any): any {
    // In a full implementation this could call a vision AI to extract colors
    // For now returns a structured placeholder based on brand analysis
    return {
      source: logoUrl,
      extractedColors: [],
      dominantMood: brandAnalysis?.colorMood || 'professional',
      notes: 'Logo analysis: using brand personality as primary signal',
    };
  }

  private async generateTokens(
    brandName: string,
    industry: string,
    description: string,
    mode: 'LIGHT' | 'DARK',
    brandAnalysis: any,
  ): Promise<any[]> {
    const modeContext =
      mode === 'DARK'
        ? 'Dark theme: dark backgrounds (#0f172a, #1e293b), light text, vibrant accent colors.'
        : 'Light theme: white/light-gray backgrounds, dark text, vivid brand colors.';

    const personalityCtx = brandAnalysis
      ? `Brand personality: ${JSON.stringify(brandAnalysis.personality)}. Color mood: ${brandAnalysis.colorMood}.`
      : '';

    const prompt = `Act as a Senior Design System Architect. Generate a complete design token set for a ${mode} theme.

Brand: ${brandName}
Industry: ${industry}
Description: ${description}
${personalityCtx}
${modeContext}

Return ONLY valid JSON (no markdown):
[
  { "name": "primary", "value": "#HEX", "type": "color" },
  { "name": "primary-light", "value": "#HEX", "type": "color" },
  { "name": "primary-dark", "value": "#HEX", "type": "color" },
  { "name": "secondary", "value": "#HEX", "type": "color" },
  { "name": "accent", "value": "#HEX", "type": "color" },
  { "name": "success", "value": "#HEX", "type": "color" },
  { "name": "warning", "value": "#HEX", "type": "color" },
  { "name": "danger", "value": "#HEX", "type": "color" },
  { "name": "info", "value": "#HEX", "type": "color" },
  { "name": "background", "value": "#HEX", "type": "color" },
  { "name": "surface", "value": "#HEX", "type": "color" },
  { "name": "card", "value": "#HEX", "type": "color" },
  { "name": "border", "value": "#HEX", "type": "color" },
  { "name": "sidebar", "value": "#HEX", "type": "color" },
  { "name": "navbar", "value": "#HEX", "type": "color" },
  { "name": "footer", "value": "#HEX", "type": "color" },
  { "name": "text-primary", "value": "#HEX", "type": "color" },
  { "name": "text-secondary", "value": "#HEX", "type": "color" },
  { "name": "muted", "value": "#HEX", "type": "color" },
  { "name": "status-online", "value": "#HEX", "type": "color" },
  { "name": "status-offline", "value": "#HEX", "type": "color" },
  { "name": "chart-1", "value": "#HEX", "type": "color" },
  { "name": "chart-2", "value": "#HEX", "type": "color" },
  { "name": "chart-3", "value": "#HEX", "type": "color" },
  { "name": "radius", "value": "8px", "type": "radius" },
  { "name": "radius-sm", "value": "4px", "type": "radius" },
  { "name": "radius-lg", "value": "16px", "type": "radius" },
  { "name": "spacing", "value": "16px", "type": "spacing" },
  { "name": "spacing-sm", "value": "8px", "type": "spacing" },
  { "name": "spacing-lg", "value": "24px", "type": "spacing" },
  { "name": "shadow-sm", "value": "0 1px 3px rgba(0,0,0,0.1)", "type": "shadow" },
  { "name": "shadow-md", "value": "0 4px 6px rgba(0,0,0,0.1)", "type": "shadow" },
  { "name": "shadow-lg", "value": "0 10px 15px rgba(0,0,0,0.1)", "type": "shadow" },
  { "name": "animation-fast", "value": "150ms ease", "type": "animation" },
  { "name": "animation-normal", "value": "300ms ease", "type": "animation" },
  { "name": "font-sans", "value": "Inter, system-ui, sans-serif", "type": "typography" },
  { "name": "font-size-base", "value": "16px", "type": "typography" },
  { "name": "font-weight-normal", "value": "400", "type": "typography" },
  { "name": "font-weight-semibold", "value": "600", "type": "typography" },
  { "name": "font-weight-bold", "value": "700", "type": "typography" }
]`;

    const response = await this.aiService.generateResponse(
      prompt,
      [],
      'gemini-2.5-flash',
      'You are a JSON-only design token generator.',
      'api',
    );

    try {
      const clean = response.content
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      return JSON.parse(clean);
    } catch {
      return this.fallbackTokens(mode);
    }
  }

  private validateAccessibility(tokens: any[]): any {
    const find = (name: string) =>
      tokens.find((t) => t.name === name)?.value || '#000000';

    const background = find('background');
    const textPrimary = find('text-primary');
    const primary = find('primary');

    // Simple hex contrast ratio approximation
    const getRelativeLuminance = (hex: string): number => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      const toLinear = (c: number) =>
        c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    };

    const contrastRatio = (hex1: string, hex2: string): number => {
      try {
        const l1 = getRelativeLuminance(hex1);
        const l2 = getRelativeLuminance(hex2);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
      } catch {
        return 0;
      }
    };

    const bgTextRatio = contrastRatio(background, textPrimary);
    const primaryTextRatio = contrastRatio(primary, '#ffffff');

    return {
      wcagLevel: bgTextRatio >= 7 ? 'AAA' : bgTextRatio >= 4.5 ? 'AA' : 'FAIL',
      backgroundToText: {
        ratio: Math.round(bgTextRatio * 100) / 100,
        passes: bgTextRatio >= 4.5,
      },
      primaryToWhite: {
        ratio: Math.round(primaryTextRatio * 100) / 100,
        passes: primaryTextRatio >= 3,
      },
      recommendations:
        bgTextRatio < 4.5
          ? [
              'Increase contrast between background and text colors for WCAG AA compliance.',
            ]
          : [],
    };
  }

  private buildPreview(
    lightTheme: any,
    darkTheme: any,
    lightTokens: any[],
    darkTokens: any[],
    accessibilityReport: any,
  ) {
    return {
      lightTheme: {
        id: lightTheme?.id,
        name: lightTheme?.name,
        tokenCount: lightTokens.length,
        sampleColors: lightTokens
          .filter((t) => t.type === 'color')
          .slice(0, 6)
          .map((t) => ({ name: t.name, value: t.value })),
      },
      darkTheme: {
        id: darkTheme?.id,
        name: darkTheme?.name,
        tokenCount: darkTokens.length,
        sampleColors: darkTokens
          .filter((t) => t.type === 'color')
          .slice(0, 6)
          .map((t) => ({ name: t.name, value: t.value })),
      },
      accessibility: accessibilityReport,
      generatedAt: new Date().toISOString(),
    };
  }

  private fallbackTokens(mode: 'LIGHT' | 'DARK'): any[] {
    const isLight = mode === 'LIGHT';
    return [
      { name: 'primary', value: '#4f46e5', type: 'color' },
      { name: 'primary-light', value: '#818cf8', type: 'color' },
      { name: 'primary-dark', value: '#3730a3', type: 'color' },
      { name: 'secondary', value: '#06b6d4', type: 'color' },
      { name: 'accent', value: '#f59e0b', type: 'color' },
      { name: 'success', value: '#10b981', type: 'color' },
      { name: 'warning', value: '#f59e0b', type: 'color' },
      { name: 'danger', value: '#ef4444', type: 'color' },
      { name: 'info', value: '#3b82f6', type: 'color' },
      {
        name: 'background',
        value: isLight ? '#f8fafc' : '#0f172a',
        type: 'color',
      },
      {
        name: 'surface',
        value: isLight ? '#ffffff' : '#1e293b',
        type: 'color',
      },
      { name: 'card', value: isLight ? '#ffffff' : '#1e293b', type: 'color' },
      { name: 'border', value: isLight ? '#e2e8f0' : '#334155', type: 'color' },
      {
        name: 'sidebar',
        value: isLight ? '#f1f5f9' : '#0f172a',
        type: 'color',
      },
      { name: 'navbar', value: isLight ? '#ffffff' : '#1e293b', type: 'color' },
      { name: 'footer', value: isLight ? '#f8fafc' : '#0f172a', type: 'color' },
      {
        name: 'text-primary',
        value: isLight ? '#0f172a' : '#f8fafc',
        type: 'color',
      },
      {
        name: 'text-secondary',
        value: isLight ? '#475569' : '#94a3b8',
        type: 'color',
      },
      { name: 'muted', value: isLight ? '#94a3b8' : '#64748b', type: 'color' },
      { name: 'radius', value: '8px', type: 'radius' },
      { name: 'spacing', value: '16px', type: 'spacing' },
      {
        name: 'font-sans',
        value: 'Inter, system-ui, sans-serif',
        type: 'typography',
      },
    ];
  }
}
