import { Injectable, NotFoundException } from '@nestjs/common';
import { SocialProvider } from './social-provider.interface';
import { FacebookProvider } from './facebook.provider';
import { InstagramProvider } from './instagram.provider';
import { LinkedinProvider } from './linkedin.provider';
import { XProvider } from './x.provider';
import { TikTokProvider } from './tiktok.provider';
import { WhatsAppStatusProvider } from './whatsapp-status.provider';

@Injectable()
export class ProviderRegistry {
  private readonly providers = new Map<string, SocialProvider>();

  constructor(
    private readonly facebook: FacebookProvider,
    private readonly instagram: InstagramProvider,
    private readonly linkedin: LinkedinProvider,
    private readonly x: XProvider,
    private readonly tiktok: TikTokProvider,
    private readonly whatsappStatus: WhatsAppStatusProvider,
  ) {
    this.providers.set('FACEBOOK', this.facebook);
    this.providers.set('INSTAGRAM', this.instagram);
    this.providers.set('LINKEDIN', this.linkedin);
    this.providers.set('X', this.x);
    this.providers.set('TIKTOK', this.tiktok);
    this.providers.set('WHATSAPP_STATUS', this.whatsappStatus);
  }

  getProvider(platform: string): SocialProvider {
    const provider = this.providers.get(platform.toUpperCase());
    if (!provider) {
      throw new NotFoundException(`Social provider for platform '${platform}' not found`);
    }
    return provider;
  }
}
