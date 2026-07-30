import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  ISocialConnector,
  SOCIAL_CONNECTORS,
} from './social-connector.interface';

/**
 * Registry of available connectors, keyed by source. Adding a new social
 * network means implementing ISocialConnector and adding it to the
 * SOCIAL_CONNECTORS provider factory — nothing here changes. (Open/Closed.)
 */
@Injectable()
export class ConnectorRegistry {
  private readonly connectors = new Map<string, ISocialConnector>();

  constructor(@Inject(SOCIAL_CONNECTORS) connectors: ISocialConnector[]) {
    for (const connector of connectors) {
      this.connectors.set(connector.source, connector);
    }
  }

  get(source: string): ISocialConnector {
    const connector = this.connectors.get(source);
    if (!connector) {
      throw new BadRequestException(
        `No social connector is registered for source "${source}". Supported: ${this.supported().join(', ')}`,
      );
    }
    return connector;
  }

  supported(): string[] {
    return [...this.connectors.keys()];
  }
}
