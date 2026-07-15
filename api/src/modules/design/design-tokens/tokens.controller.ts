import { Controller, Get, Param } from '@nestjs/common';
import { TokensService } from './tokens.service';
import { getTenantId } from '../../../common/tenant/tenant.middleware';

@Controller('design/tokens')
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  @Get(':themeId/css')
  async getCssVariables(@Param('themeId') themeId: string) {
    const tenantId = getTenantId();
    const css = await this.tokensService.resolveCssVariables(themeId, tenantId);
    return { themeId, format: 'css', content: css };
  }

  @Get(':themeId/tailwind')
  async getTailwindConfig(@Param('themeId') themeId: string) {
    const config = await this.tokensService.getTailwindThemeConfig(themeId);
    return { themeId, format: 'tailwind', content: config };
  }

  @Get(':themeId/shadcn')
  async getShadcnTokens(@Param('themeId') themeId: string) {
    const shadcn = await this.tokensService.resolveShadcnTokens(themeId);
    return { themeId, format: 'shadcn', content: shadcn };
  }

  @Get(':themeId/all')
  async getAllFormats(@Param('themeId') themeId: string) {
    const tenantId = getTenantId();
    return this.tokensService.resolveAllFormats(themeId, tenantId);
  }

  @Get(':themeId/by-type')
  async getByType(@Param('themeId') themeId: string) {
    return this.tokensService.getTokensByType(themeId);
  }
}
