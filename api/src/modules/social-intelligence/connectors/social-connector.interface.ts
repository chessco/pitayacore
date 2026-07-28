import { NormalizedContent, SocialSource } from '../dto/normalized-content';

/**
 * Runtime context handed to a connector for a single collection run.
 * Credentials are already decrypted by the collector before this is built,
 * so connectors never deal with encryption.
 */
export interface SocialConnectorContext {
  tenantId: string;
  /** Decrypted access token / API key for the provider. */
  accessToken: string;
  /** External page / account / channel id to collect from. */
  externalAccountId: string;
  /** Free-form provider options persisted on the connector account. */
  options?: Record<string, any>;
}

export interface CollectOptions {
  /** Only fetch content published after this instant, when the provider supports it. */
  since?: Date;
  /** Soft cap on the number of items to return. */
  limit?: number;
}

/**
 * Generic connector contract. Adding a new social network to SIS means writing
 * a new class that implements this interface and registering it with the
 * connector registry — no changes to the collector, pipeline, or core.
 * (Open/Closed Principle.)
 */
export interface ISocialConnector {
  /** The source this connector handles. */
  readonly source: SocialSource;

  /** Validate the credentials/context without collecting. Returns true if usable. */
  verify(context: SocialConnectorContext): Promise<boolean>;

  /** Collect and return normalized content. Must be side-effect free (no persistence). */
  collect(
    context: SocialConnectorContext,
    options?: CollectOptions,
  ): Promise<NormalizedContent[]>;
}

/** DI token for the array of registered connectors. */
export const SOCIAL_CONNECTORS = 'SIS_SOCIAL_CONNECTORS';
