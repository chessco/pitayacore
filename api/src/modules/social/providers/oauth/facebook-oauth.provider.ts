import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  IProviderOAuth,
  OAuthAuthorizeResult,
  OAuthFlowContext,
  OAuthTokens,
  OAuthVerifyResult,
  ProviderAccount,
} from './provider-oauth.interface';
import { errMessage } from '../../util/errors';

const DEFAULT_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_read_user_content',
];

interface FbTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: { message?: string };
}
interface FbAccount {
  id: string;
  name?: string;
  access_token?: string;
  category?: string;
  followers_count?: number;
  tasks?: string[];
  picture?: { data?: { url?: string } };
}
interface FbDebugToken {
  data?: {
    is_valid?: boolean;
    scopes?: string[];
    expires_at?: number;
    error?: { message?: string };
  };
}

/**
 * Facebook implementation of the generic OAuth engine.
 * Uses the official Graph API; App id/secret come from config.
 */
@Injectable()
export class FacebookOAuthProvider implements IProviderOAuth {
  readonly code = 'FACEBOOK';
  private readonly logger = new Logger(FacebookOAuthProvider.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private get version(): string {
    return this.config.get<string>('FACEBOOK_GRAPH_VERSION') || 'v21.0';
  }
  private get graph(): string {
    return `https://graph.facebook.com/${this.version}`;
  }
  private get appId(): string {
    const id = this.config.get<string>('FACEBOOK_APP_ID');
    if (!id) throw new BadRequestException('FACEBOOK_APP_ID is not configured');
    return id;
  }
  private get appSecret(): string {
    const s = this.config.get<string>('FACEBOOK_APP_SECRET');
    if (!s)
      throw new BadRequestException('FACEBOOK_APP_SECRET is not configured');
    return s;
  }
  private get scopes(): string[] {
    const raw = this.config.get<string>('FACEBOOK_OAUTH_SCOPES');
    return raw
      ? raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : DEFAULT_SCOPES;
  }

  authorize(context: OAuthFlowContext): OAuthAuthorizeResult {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: context.redirectUri,
      state: context.state,
      response_type: 'code',
      scope: this.scopes.join(','),
    });
    return {
      url: `https://www.facebook.com/${this.version}/dialog/oauth?${params.toString()}`,
      state: context.state,
    };
  }

  async exchangeCode(
    code: string,
    context: OAuthFlowContext,
  ): Promise<OAuthTokens> {
    // 1) code -> short-lived user token
    const shortLived = await firstValueFrom(
      this.http.get<FbTokenResponse>(`${this.graph}/oauth/access_token`, {
        params: {
          client_id: this.appId,
          client_secret: this.appSecret,
          redirect_uri: context.redirectUri,
          code,
        },
      }),
    );
    const shortToken = shortLived.data?.access_token;
    if (!shortToken) {
      throw new BadRequestException(
        `Facebook code exchange failed: ${shortLived.data?.error?.message ?? 'no token'}`,
      );
    }

    // 2) short-lived -> long-lived user token
    const longLived = await firstValueFrom(
      this.http.get<FbTokenResponse>(`${this.graph}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: this.appId,
          client_secret: this.appSecret,
          fb_exchange_token: shortToken,
        },
      }),
    );
    const longToken = longLived.data?.access_token ?? shortToken;
    const expiresIn = longLived.data?.expires_in;
    return {
      accessToken: longToken,
      expiresAt: expiresIn
        ? new Date(Date.now() + expiresIn * 1000)
        : undefined,
      scopes: this.scopes,
    };
  }

  async listAccounts(userAccessToken: string): Promise<ProviderAccount[]> {
    const res = await firstValueFrom(
      this.http.get<{ data?: FbAccount[] }>(`${this.graph}/me/accounts`, {
        params: {
          fields: 'id,name,access_token,category,followers_count,tasks,picture',
          access_token: userAccessToken,
          limit: 100,
        },
      }),
    );
    const accounts = res.data?.data ?? [];
    return accounts
      .filter((a) => a.access_token)
      .map((a) => ({
        id: a.id,
        name: a.name || a.id,
        accessToken: a.access_token,
        category: a.category,
        followers: a.followers_count,
        permissions: a.tasks,
        pictureUrl: a.picture?.data?.url,
      }));
  }

  // Facebook page tokens are long-lived; there is no refresh_token grant.
  // Re-verify and return as-is (supportsRefreshToken = false).
  async refreshToken(currentToken: string): Promise<OAuthTokens> {
    const check = await this.verify(currentToken);
    if (!check.valid) {
      throw new BadRequestException(
        'Facebook token is no longer valid; re-authorization required.',
      );
    }
    return {
      accessToken: currentToken,
      expiresAt: check.expiresAt,
      scopes: check.scopes,
    };
  }

  async verify(
    accessToken: string,
    externalAccountId?: string,
  ): Promise<OAuthVerifyResult> {
    try {
      const debug = await firstValueFrom(
        this.http.get<FbDebugToken>(`${this.graph}/debug_token`, {
          params: {
            input_token: accessToken,
            access_token: `${this.appId}|${this.appSecret}`,
          },
        }),
      );
      const data = debug.data?.data;
      const valid = Boolean(data?.is_valid);
      if (valid && externalAccountId) {
        await firstValueFrom(
          this.http.get(
            `${this.graph}/${encodeURIComponent(externalAccountId)}`,
            { params: { fields: 'id', access_token: accessToken } },
          ),
        );
      }
      return {
        valid,
        scopes: data?.scopes,
        expiresAt: data?.expires_at
          ? new Date(data.expires_at * 1000)
          : undefined,
        reason: valid ? undefined : data?.error?.message,
      };
    } catch (error) {
      return { valid: false, reason: errMessage(error) };
    }
  }

  async disconnect(accessToken: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete(`${this.graph}/me/permissions`, {
          params: { access_token: accessToken },
        }),
      );
    } catch (error) {
      this.logger.warn(
        `Facebook disconnect best-effort failed: ${errMessage(error)}`,
      );
    }
  }

  async getPermissions(accessToken: string): Promise<string[]> {
    const result = await this.verify(accessToken);
    return result.scopes ?? [];
  }
}
