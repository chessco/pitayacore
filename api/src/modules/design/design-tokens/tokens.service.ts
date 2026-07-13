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
      // Check type and format appropriately
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

    for (const token of tokens) {
      if (token.type === 'color') {
        colors[token.name] = `var(--${token.name})`;
      } else if (token.type === 'spacing') {
        spacing[token.name] = `var(--${token.name})`;
      } else if (token.type === 'radius') {
        borderRadius[token.name] = `var(--${token.name})`;
      }
    }

    return {
      extend: {
        colors,
        spacing,
        borderRadius,
      },
    };
  }
}
