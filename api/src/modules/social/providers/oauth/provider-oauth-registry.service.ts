import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { IProviderOAuth, OAUTH_PROVIDERS } from './provider-oauth.interface';

/**
 * Registry of OAuth-capable providers keyed by provider code. Adding a provider
 * means implementing IProviderOAuth and appending it to the OAUTH_PROVIDERS
 * factory — this registry, the controller and the service stay unchanged.
 */
@Injectable()
export class ProviderOAuthRegistry {
  private readonly providers = new Map<string, IProviderOAuth>();

  constructor(@Inject(OAUTH_PROVIDERS) providers: IProviderOAuth[]) {
    for (const p of providers) this.providers.set(p.code.toUpperCase(), p);
  }

  get(code: string): IProviderOAuth {
    const provider = this.providers.get(code?.toUpperCase());
    if (!provider) {
      throw new BadRequestException(
        `OAuth is not implemented for provider "${code}". Available: ${this.supported().join(', ')}`,
      );
    }
    return provider;
  }

  has(code: string): boolean {
    return this.providers.has(code?.toUpperCase());
  }

  supported(): string[] {
    return [...this.providers.keys()];
  }
}
