import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';

@Injectable()
export class TokensService {
  constructor(private readonly db: DatabaseService) {}

  async resolveCssVariables(
    themeId: string,
    tenantId: string,
  ): Promise<string> {
    const tokens = await this.db.mysql.themeToken.findMany({
      where: { themeId },
    });

    if (!tokens || tokens.length === 0) return '';

    let css = ':root {\n';
    for (const token of tokens) {
      const value = token.value;
      css += `  --${token.name}: ${value};\n`;
    }
    css += '}';

    return css;
  }

  async getTailwindThemeConfig(themeId: string): Promise<any> {
    const tokens = await this.db.mysql.themeToken.findMany({
      where: { themeId },
    });

    const colors: Record<string, string> = {};
    const spacing: Record<string, string> = {};
    const borderRadius: Record<string, string> = {};
    const boxShadow: Record<string, string> = {};
    const fontFamily: Record<string, string> = {};
    const fontSize: Record<string, string> = {};
    const fontWeight: Record<string, string> = {};
    const transitionDuration: Record<string, string> = {};

    for (const token of tokens) {
      if (token.type === 'color') {
        colors[token.name] = `var(--${token.name})`;
      } else if (token.type === 'spacing') {
        spacing[token.name] = `var(--${token.name})`;
      } else if (token.type === 'radius') {
        borderRadius[token.name] = `var(--${token.name})`;
      } else if (token.type === 'shadow') {
        boxShadow[token.name] = `var(--${token.name})`;
      } else if (
        token.type === 'typography' &&
        token.name.startsWith('font-sans')
      ) {
        fontFamily['sans'] = `var(--${token.name})`;
      } else if (token.type === 'animation') {
        transitionDuration[token.name] = `var(--${token.name})`;
      }
    }

    return {
      extend: {
        colors,
        spacing,
        borderRadius,
        boxShadow,
        fontFamily,
        transitionDuration,
      },
    };
  }

  /**
   * Generates ShadCN-compatible CSS variable format.
   * ShadCN convention: uses HSL values and specific variable names.
   */
  async resolveShadcnTokens(themeId: string): Promise<string> {
    const tokens = await this.db.mysql.themeToken.findMany({
      where: { themeId },
    });

    if (!tokens || tokens.length === 0) return '';

    // Map pitaya token names to ShadCN convention
    const shadcnMap: Record<string, string> = {
      background: '--background',
      surface: '--card',
      card: '--card',
      primary: '--primary',
      'primary-dark': '--primary-foreground',
      'text-primary': '--foreground',
      'text-secondary': '--muted-foreground',
      muted: '--muted',
      border: '--border',
      accent: '--accent',
      secondary: '--secondary',
      danger: '--destructive',
      'primary-light': '--ring',
    };

    let css = ':root {\n';
    for (const token of tokens) {
      if (token.type === 'color') {
        // Output native pitaya variable
        css += `  --pitaya-${token.name}: ${token.value};\n`;
        // Also output shadcn-compatible name if mapped
        if (shadcnMap[token.name]) {
          css += `  ${shadcnMap[token.name]}: ${token.value};\n`;
        }
      }
    }

    // ShadCN structural tokens
    const radiusToken = tokens.find((t) => t.name === 'radius');
    if (radiusToken) {
      css += `  --radius: ${radiusToken.value};\n`;
    }

    css += '}';
    return css;
  }

  /**
   * Returns all token formats combined: CSS variables, Tailwind config, ShadCN, and raw token list.
   */
  async resolveAllFormats(themeId: string, tenantId: string): Promise<any> {
    const [cssVariables, tailwindConfig, shadcnTokens, rawTokens] =
      await Promise.all([
        this.resolveCssVariables(themeId, tenantId),
        this.getTailwindThemeConfig(themeId),
        this.resolveShadcnTokens(themeId),
        this.db.mysql.themeToken.findMany({
          where: { themeId },
          orderBy: { type: 'asc' },
        }),
      ]);

    return {
      cssVariables,
      tailwindConfig,
      shadcnTokens,
      rawTokens,
      meta: {
        themeId,
        tokenCount: rawTokens.length,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Returns tokens grouped by type for easy consumption.
   */
  async getTokensByType(themeId: string): Promise<Record<string, any[]>> {
    const tokens = await this.db.mysql.themeToken.findMany({
      where: { themeId },
    });

    return tokens.reduce((acc: Record<string, any[]>, token) => {
      if (!acc[token.type]) acc[token.type] = [];
      acc[token.type].push({ name: token.name, value: token.value });
      return acc;
    }, {});
  }
}
