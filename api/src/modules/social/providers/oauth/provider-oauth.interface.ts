/**
 * Generic OAuth engine contract. Every platform provider (Facebook, Instagram,
 * LinkedIn, …) implements this so the controller/service stay provider-agnostic.
 * This is distinct from the publishing-oriented `SocialProvider` interface in
 * `../social-provider.interface.ts`; OAuth connection lifecycle lives here.
 */

export interface OAuthAuthorizeResult {
  /** Fully-built provider authorization URL to redirect the user to. */
  url: string;
  /** Opaque state value to round-trip through the provider (CSRF protection). */
  state: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes?: string[];
  /** Raw provider payload for debugging/metadata (never returned to clients). */
  raw?: Record<string, any>;
}

/** A selectable account/page returned after authorization. */
export interface ProviderAccount {
  id: string;
  name: string;
  /** Per-account access token (e.g. a Facebook Page token). */
  accessToken: string;
  category?: string;
  business?: string;
  followers?: number;
  permissions?: string[];
  pictureUrl?: string;
}

export interface OAuthVerifyResult {
  valid: boolean;
  scopes?: string[];
  expiresAt?: Date;
  reason?: string;
}

/** Context needed to build/redeem an authorization. */
export interface OAuthFlowContext {
  tenantId: string;
  /** The provider callback URL registered with the platform. */
  redirectUri: string;
  state: string;
}

export interface IProviderOAuth {
  /** Provider code, e.g. 'FACEBOOK'. */
  readonly code: string;

  /** Build the provider authorization URL. */
  authorize(context: OAuthFlowContext): OAuthAuthorizeResult;

  /** Exchange an authorization code for (long-lived) user tokens. */
  exchangeCode(code: string, context: OAuthFlowContext): Promise<OAuthTokens>;

  /** List the accounts/pages the user token can manage. */
  listAccounts(userAccessToken: string): Promise<ProviderAccount[]>;

  /** Exchange/refresh a token for a new one (throws if unsupported). */
  refreshToken(currentToken: string): Promise<OAuthTokens>;

  /** Validate a token (and optionally a specific account). */
  verify(
    accessToken: string,
    externalAccountId?: string,
  ): Promise<OAuthVerifyResult>;

  /** Revoke/disconnect the token at the provider (best-effort). */
  disconnect(accessToken: string): Promise<void>;

  /** List the scopes currently granted to a token. */
  getPermissions(accessToken: string): Promise<string[]>;
}

/** DI token for the array of registered OAuth providers. */
export const OAUTH_PROVIDERS = 'SIS_OAUTH_PROVIDERS';
