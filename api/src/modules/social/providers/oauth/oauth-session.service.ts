import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ProviderAccount } from './provider-oauth.interface';

interface OAuthSession {
  id: string;
  tenantId: string;
  provider: string;
  /** Long-lived USER token — held only transiently, never sent to the client. */
  userToken: string;
  accounts?: ProviderAccount[];
  createdAt: number;
}

const TTL_MS = 10 * 60 * 1000; // sessions live 10 minutes

/**
 * Transient, in-memory vault for the long-lived user token retrieved during
 * OAuth, kept only while the user picks which pages/accounts to connect. This
 * avoids ever exposing raw provider secrets in redirect URLs. Sessions expire
 * automatically and are deleted once selection is confirmed.
 */
@Injectable()
export class OAuthSessionService {
  private readonly logger = new Logger(OAuthSessionService.name);
  private readonly sessions = new Map<string, OAuthSession>();

  create(data: {
    tenantId: string;
    provider: string;
    userToken: string;
    accounts?: ProviderAccount[];
  }): string {
    this.sweep();
    const id = randomUUID();
    this.sessions.set(id, { id, createdAt: Date.now(), ...data });
    return id;
  }

  get(id: string): OAuthSession {
    this.sweep();
    const session = this.sessions.get(id);
    if (!session) {
      throw new NotFoundException('OAuth session not found or expired.');
    }
    return session;
  }

  consume(id: string): OAuthSession {
    const session = this.get(id);
    this.sessions.delete(id);
    return session;
  }

  private sweep(): void {
    const now = Date.now();
    for (const [id, s] of this.sessions) {
      if (now - s.createdAt > TTL_MS) {
        this.sessions.delete(id);
        this.logger.debug(`Expired OAuth session ${id}`);
      }
    }
  }
}
