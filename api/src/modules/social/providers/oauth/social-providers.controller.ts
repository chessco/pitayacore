import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { getTenantId } from '../../../../common/tenant/tenant.middleware';
import { Public } from '../../../../common/guards/public.decorator';
import { SocialProvidersService } from './social-providers.service';
import { ConfirmSelectionDto } from './dto/provider.dto';

/**
 * OAuth & provider-management endpoints for the Social Suite.
 * Additive — the `social/providers/*` prefix does not touch the existing
 * `api/social/*` (outbound) or `social-intelligence/*` (analysis) routes.
 */
@Controller('social/providers')
export class SocialProvidersController {
  constructor(private readonly providers: SocialProvidersService) {}

  /** Available providers (persistent registry). */
  @Get()
  list() {
    return this.providers.listProviders();
  }

  /** Connected account instances for the current tenant. Declared before ':id'. */
  @Get('accounts')
  accounts(@Query('provider') provider?: string) {
    return this.providers.listAccounts(getTenantId(), provider);
  }

  /** Provider specification. */
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.providers.getProvider(id);
  }

  /** Begin OAuth: returns the provider authorization URL for the SPA to open. */
  @Post(':id/connect')
  connect(@Param('id') id: string) {
    return this.providers.connect(getTenantId(), id);
  }

  /**
   * Provider redirect callback (hit by the browser after user consent — NO auth
   * headers, so it's public and recovers the tenant from the signed state).
   * Exchanges the code, stores a transient session, and redirects to the
   * account-selection UI.
   */
  @Public()
  @Get('callback/:providerCode')
  async callback(
    @Param('providerCode') providerCode: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const { redirectUrl } = await this.providers.handleCallback(
      providerCode,
      code,
      state,
    );
    return res.redirect(redirectUrl);
  }

  /** Accounts/pages available for a selection session (tokens stripped). */
  @Get(':providerCode/pages')
  pages(
    @Param('providerCode') providerCode: string,
    @Query('session') session: string,
  ) {
    return this.providers.listSessionAccounts(providerCode, session);
  }

  /** Commit the selected accounts to SocialConnectorAccount (encrypted). */
  @Post(':providerCode/confirm')
  confirm(
    @Param('providerCode') providerCode: string,
    @Body() dto: ConfirmSelectionDto,
  ) {
    return this.providers.confirmSelection(
      getTenantId(),
      providerCode,
      dto.sessionId,
      dto.accountIds,
    );
  }

  /** Disconnect/delete a connected account (':id' = connected account id). */
  @Post(':id/disconnect')
  disconnect(@Param('id') id: string) {
    return this.providers.disconnect(getTenantId(), id);
  }

  /** Force a manual token refresh (':id' = connected account id). */
  @Post(':id/refresh')
  refresh(@Param('id') id: string) {
    return this.providers.refresh(getTenantId(), id);
  }

  /** Validate token status and scopes (':id' = connected account id). */
  @Post(':id/verify')
  verify(@Param('id') id: string) {
    return this.providers.verify(getTenantId(), id);
  }
}
