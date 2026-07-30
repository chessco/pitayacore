import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'crypto';
import { Prisma, type SocialConnectorAccount } from '@prisma/mysql-client';
import { DatabaseService } from '../../../../common/database/database.service';
import { TokenCryptoService } from '../../accounts/crypto/token-crypto.service';
import { ProviderOAuthRegistry } from './provider-oauth-registry.service';
import { OAuthSessionService } from './oauth-session.service';
import { ProviderAccount } from './provider-oauth.interface';

interface StatePayload {
  tenantId: string;
  provider: string;
  nonce: string;
}

/**
 * Orchestrates the OAuth lifecycle: authorize → callback → account selection →
 * confirm (persist encrypted) → verify/refresh/disconnect. Provider-specific
 * logic is delegated to IProviderOAuth implementations via the registry.
 */
@Injectable()
export class SocialProvidersService {
  private readonly logger = new Logger(SocialProvidersService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly registry: ProviderOAuthRegistry,
    private readonly sessions: OAuthSessionService,
    private readonly crypto: TokenCryptoService,
    private readonly config: ConfigService,
  ) {}

  // --- config-derived URLs --------------------------------------------------

  private get callbackBase(): string {
    return (
      this.config.get<string>('SIS_OAUTH_CALLBACK_BASE') ||
      'http://localhost:2014'
    );
  }
  private get frontendUrl(): string {
    return (
      this.config.get<string>('SIS_OAUTH_FRONTEND_URL') ||
      'http://localhost:3000'
    );
  }
  private redirectUri(providerCode: string): string {
    return `${this.callbackBase}/social/providers/callback/${providerCode.toLowerCase()}`;
  }

  // --- signed state (recovers tenant on the credential-less callback) -------

  private stateSecret(): string {
    return (
      this.config.get<string>('SIS_TOKEN_ENC_KEY') ||
      this.config.get<string>('FACEBOOK_APP_SECRET') ||
      'sis-oauth-state'
    );
  }
  private signState(payload: StatePayload): string {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = createHmac('sha256', this.stateSecret())
      .update(body)
      .digest('base64url');
    return `${body}.${sig}`;
  }
  private verifyState(state: string): StatePayload {
    const [body, sig] = (state || '').split('.');
    if (!body || !sig) throw new BadRequestException('Invalid OAuth state');
    const expected = createHmac('sha256', this.stateSecret())
      .update(body)
      .digest('base64url');
    if (sig !== expected)
      throw new BadRequestException('OAuth state signature mismatch');
    return JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as StatePayload;
  }

  // --- registry (persistent provider catalog) -------------------------------

  listProviders() {
    return this.db.mysql.socialProvider.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { displayName: 'asc' },
    });
  }

  async getProvider(idOrCode: string) {
    const provider = await this.db.mysql.socialProvider.findFirst({
      where: { OR: [{ id: idOrCode }, { code: idOrCode.toUpperCase() }] },
    });
    if (!provider) throw new NotFoundException('Provider not found');
    return provider;
  }

  // --- OAuth flow -----------------------------------------------------------

  /** Build the authorization URL. Accepts a provider code or DB id. */
  async connect(
    tenantId: string,
    providerRef: string,
  ): Promise<{ url: string }> {
    const code = this.registry.has(providerRef)
      ? providerRef
      : (await this.getProvider(providerRef)).code;
    const provider = this.registry.get(code);
    const state = this.signState({
      tenantId,
      provider: provider.code,
      nonce: randomUUID(),
    });
    const { url } = provider.authorize({
      tenantId,
      redirectUri: this.redirectUri(provider.code),
      state,
    });
    return { url };
  }

  /**
   * Provider callback: exchange the code, fetch selectable accounts, stash the
   * user token in a transient session, and return the frontend URL to redirect
   * to for account selection.
   */
  async handleCallback(
    providerCode: string,
    code: string,
    state: string,
  ): Promise<{ redirectUrl: string }> {
    const payload = this.verifyState(state);
    const provider = this.registry.get(providerCode);
    if (provider.code !== payload.provider) {
      throw new BadRequestException('Provider mismatch in OAuth state');
    }

    const tokens = await provider.exchangeCode(code, {
      tenantId: payload.tenantId,
      redirectUri: this.redirectUri(provider.code),
      state,
    });
    const accounts = await provider.listAccounts(tokens.accessToken);

    const sessionId = this.sessions.create({
      tenantId: payload.tenantId,
      provider: provider.code,
      userToken: tokens.accessToken,
      accounts,
    });

    const redirectUrl = `${this.frontendUrl}/social/select-accounts?session=${encodeURIComponent(
      sessionId,
    )}&provider=${encodeURIComponent(provider.code)}`;
    return { redirectUrl };
  }

  /** Accounts available for selection — WITHOUT their access tokens. */
  listSessionAccounts(providerCode: string, sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session.provider !== providerCode.toUpperCase()) {
      throw new BadRequestException('Session does not match provider');
    }
    return (session.accounts ?? []).map((a) => this.publicAccount(a));
  }

  private publicAccount(a: ProviderAccount) {
    const { accessToken: _t, ...safe } = a;
    void _t;
    return safe;
  }

  /** Commit the user's selection: persist chosen accounts with encrypted tokens. */
  async confirmSelection(
    tenantId: string,
    providerCode: string,
    sessionId: string,
    accountIds: string[],
  ) {
    const session = this.sessions.get(sessionId);
    if (session.tenantId !== tenantId) {
      throw new BadRequestException('Session tenant mismatch');
    }
    if (session.provider !== providerCode.toUpperCase()) {
      throw new BadRequestException('Session provider mismatch');
    }
    const chosen = (session.accounts ?? []).filter((a) =>
      accountIds.includes(a.id),
    );
    if (!chosen.length) {
      throw new BadRequestException('No matching accounts selected');
    }

    const saved: SocialConnectorAccount[] = [];
    for (const account of chosen) {
      const row = await this.db.mysql.socialConnectorAccount.upsert({
        where: {
          tenantId_provider_externalAccountId: {
            tenantId,
            provider: session.provider,
            externalAccountId: account.id,
          },
        },
        create: {
          tenantId,
          provider: session.provider,
          externalAccountId: account.id,
          name: account.name,
          accessToken: this.crypto.encrypt(account.accessToken),
          business: account.business,
          page: account.name,
          permissions: account.permissions ?? [],
          oauthStatus: 'VALID',
          verificationStatus: 'VERIFIED',
          lastVerifiedAt: new Date(),
          metadata: {
            followers: account.followers,
            category: account.category,
            pictureUrl: account.pictureUrl,
          },
        },
        update: {
          name: account.name,
          accessToken: this.crypto.encrypt(account.accessToken),
          permissions: account.permissions ?? [],
          oauthStatus: 'VALID',
          verificationStatus: 'VERIFIED',
          lastVerifiedAt: new Date(),
          status: 'ACTIVE',
        },
      });
      saved.push(row);
    }

    this.sessions.consume(sessionId);
    this.logger.log(
      `Connected ${saved.length} ${session.provider} account(s) for tenant ${tenantId}`,
    );
    return saved.map((a) => this.redact(a));
  }

  // --- account management ---------------------------------------------------

  private redact(account: SocialConnectorAccount) {
    const { accessToken, ...safe } = account;
    return { ...safe, hasToken: Boolean(accessToken) };
  }

  private async getAccountOrThrow(tenantId: string, id: string) {
    const account = await this.db.mysql.socialConnectorAccount.findFirst({
      where: { id, tenantId },
    });
    if (!account) throw new NotFoundException('Connected account not found');
    return account;
  }

  async disconnect(tenantId: string, id: string) {
    const account = await this.getAccountOrThrow(tenantId, id);
    if (this.registry.has(account.provider)) {
      try {
        const token = this.crypto.decrypt(account.accessToken);
        await this.registry.get(account.provider).disconnect(token);
      } catch (error) {
        this.logger.warn(
          `Provider disconnect best-effort failed: ${String(error)}`,
        );
      }
    }
    await this.db.mysql.socialConnectorAccount.delete({ where: { id } });
    return { disconnected: true };
  }

  async refresh(tenantId: string, id: string) {
    const account = await this.getAccountOrThrow(tenantId, id);
    const provider = this.registry.get(account.provider);
    await this.db.mysql.socialConnectorAccount.update({
      where: { id },
      data: { refreshStatus: 'REFRESHING' },
    });
    try {
      const token = this.crypto.decrypt(account.accessToken);
      const tokens = await provider.refreshToken(token);
      const updated = await this.db.mysql.socialConnectorAccount.update({
        where: { id },
        data: {
          accessToken: this.crypto.encrypt(tokens.accessToken),
          expiresAt: tokens.expiresAt ?? account.expiresAt,
          refreshStatus: 'OK',
          oauthStatus: 'VALID',
        },
      });
      return this.redact(updated);
    } catch (error) {
      await this.db.mysql.socialConnectorAccount.update({
        where: { id },
        data: {
          refreshStatus: 'FAILED',
          lastError: String(error).slice(0, 500),
        },
      });
      throw error;
    }
  }

  async verify(tenantId: string, id: string) {
    const account = await this.getAccountOrThrow(tenantId, id);
    const provider = this.registry.get(account.provider);
    const token = this.crypto.decrypt(account.accessToken);
    const result = await provider.verify(token, account.externalAccountId);
    const updated = await this.db.mysql.socialConnectorAccount.update({
      where: { id },
      data: {
        verificationStatus: result.valid ? 'VERIFIED' : 'FAILED',
        oauthStatus: result.valid
          ? account.expiresAt && account.expiresAt < new Date()
            ? 'EXPIRED'
            : 'VALID'
          : 'REVOKED',
        permissions: result.scopes
          ? (result.scopes as Prisma.InputJsonValue)
          : undefined,
        expiresAt: result.expiresAt ?? account.expiresAt,
        lastVerifiedAt: new Date(),
        lastError: result.valid
          ? null
          : (result.reason ?? 'verification failed'),
      },
    });
    return { ...this.redact(updated), verification: result };
  }

  listAccounts(tenantId: string, provider?: string) {
    return this.db.mysql.socialConnectorAccount
      .findMany({
        where: {
          tenantId,
          ...(provider ? { provider: provider.toUpperCase() } : {}),
        },
        orderBy: { createdAt: 'desc' },
      })
      .then((rows) => rows.map((r) => this.redact(r)));
  }
}
