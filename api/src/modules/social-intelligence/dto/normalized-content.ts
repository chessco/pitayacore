/**
 * Social Intelligence Suite (SIS) — canonical normalized content model.
 *
 * Every connector maps its provider-specific payload into this shape so the
 * rest of the pipeline (AI analysis, alerts, analytics) never depends on the
 * format of any particular social network.
 */

/** Supported / planned content sources. Only FACEBOOK is implemented in the MVP. */
export enum SocialSource {
  FACEBOOK = 'FACEBOOK',
  INSTAGRAM = 'INSTAGRAM',
  X = 'X',
  TIKTOK = 'TIKTOK',
  YOUTUBE = 'YOUTUBE',
  RSS = 'RSS',
  GOOGLE_NEWS = 'GOOGLE_NEWS',
  WHATSAPP_BUSINESS = 'WHATSAPP_BUSINESS',
  WEBSITE = 'WEBSITE',
  BLOG = 'BLOG',
}

/** Kind of normalized item. */
export enum SocialContentType {
  POST = 'POST',
  COMMENT = 'COMMENT',
  REACTION = 'REACTION',
  ARTICLE = 'ARTICLE',
  MENTION = 'MENTION',
  VIDEO = 'VIDEO',
  STORY = 'STORY',
}

export interface NormalizedAuthor {
  id?: string;
  name?: string;
  handle?: string;
  url?: string;
}

export interface NormalizedMedia {
  type: 'image' | 'video' | 'link';
  url: string;
  thumbnailUrl?: string;
}

/**
 * The single format every piece of collected content is converted to.
 * Mirrors the conceptual model in the SIS brief:
 * Source, Type, Author, PublishedAt, Content, Media, URL, Metadata.
 */
export interface NormalizedContent {
  source: SocialSource;
  type: SocialContentType;
  /** Stable id from the provider — used for idempotent upserts. */
  externalId: string;
  author?: NormalizedAuthor;
  publishedAt?: Date;
  content: string;
  media?: NormalizedMedia[];
  url?: string;
  /** Provider-specific extras kept verbatim (reactions counts, metrics, parent ids…). */
  metadata?: Record<string, any>;
}
