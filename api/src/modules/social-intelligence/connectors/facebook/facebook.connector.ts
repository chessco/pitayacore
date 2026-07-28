import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  CollectOptions,
  ISocialConnector,
  SocialConnectorContext,
} from '../social-connector.interface';
import {
  NormalizedContent,
  NormalizedMedia,
  SocialContentType,
  SocialSource,
} from '../../dto/normalized-content';
import { errMessage } from '../../util/errors';

// Minimal shapes of the Facebook Graph API responses we consume.
interface FbFrom {
  id?: string;
  name?: string;
}
interface FbAttachment {
  media_type?: string;
  url?: string;
  unshimmed_url?: string;
  media?: { image?: { src?: string } };
}
interface FbComment {
  id: string;
  message?: string;
  created_time?: string;
  from?: FbFrom;
  like_count?: number;
}
interface FbPost {
  id: string;
  message?: string;
  story?: string;
  created_time?: string;
  permalink_url?: string;
  from?: FbFrom;
  shares?: { count?: number };
  attachments?: { data?: FbAttachment[] };
  reactions?: { summary?: { total_count?: number } };
  comments?: { summary?: { total_count?: number }; data?: FbComment[] };
}
interface FbListResponse<T> {
  data?: T[];
}

/**
 * Facebook Graph API connector.
 *
 * Reads ONLY public data from pages the client administers, using the official
 * Graph API with a Page access token. Never accesses private data and never
 * uses any mechanism outside Meta's official policies.
 *
 * Collects, per page: posts, their public reaction/comment summaries and
 * per-post public metrics, plus recent comments as separate normalized items.
 */
@Injectable()
export class FacebookConnector implements ISocialConnector {
  readonly source = SocialSource.FACEBOOK;
  private readonly logger = new Logger(FacebookConnector.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private get graphVersion(): string {
    return this.config.get<string>('FACEBOOK_GRAPH_VERSION') || 'v21.0';
  }

  private get baseUrl(): string {
    return `https://graph.facebook.com/${this.graphVersion}`;
  }

  async verify(context: SocialConnectorContext): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/${encodeURIComponent(context.externalAccountId)}`;
      const res = await firstValueFrom(
        this.http.get<{ id?: string; name?: string }>(url, {
          params: { fields: 'id,name', access_token: context.accessToken },
        }),
      );
      return Boolean(res.data?.id);
    } catch (error) {
      this.logger.warn(
        `Facebook verify failed for ${context.externalAccountId}: ${errMessage(error)}`,
      );
      return false;
    }
  }

  async collect(
    context: SocialConnectorContext,
    options?: CollectOptions,
  ): Promise<NormalizedContent[]> {
    const limit = options?.limit ?? 25;
    const postFields = [
      'id',
      'message',
      'story',
      'created_time',
      'permalink_url',
      'from{id,name}',
      'shares',
      'attachments{media_type,url,media,unshimmed_url}',
      'reactions.summary(true).limit(0)',
      'comments.summary(true).limit(25){id,message,created_time,from{id,name},like_count}',
    ].join(',');

    const url = `${this.baseUrl}/${encodeURIComponent(context.externalAccountId)}/posts`;
    const params: Record<string, string | number> = {
      fields: postFields,
      limit,
      access_token: context.accessToken,
    };
    if (options?.since) {
      params.since = Math.floor(options.since.getTime() / 1000);
    }

    const res = await firstValueFrom(
      this.http.get<FbListResponse<FbPost>>(url, { params }),
    );
    const posts: FbPost[] = res.data?.data ?? [];

    const items: NormalizedContent[] = [];
    for (const post of posts) {
      items.push(this.mapPost(post, context.externalAccountId));
      const comments: FbComment[] = post.comments?.data ?? [];
      for (const comment of comments) {
        items.push(this.mapComment(comment, post.id));
      }
    }
    return items;
  }

  private mapPost(post: FbPost, pageId: string): NormalizedContent {
    const media: NormalizedMedia[] = [];
    const attachments: FbAttachment[] = post.attachments?.data ?? [];
    for (const att of attachments) {
      const src = att.media?.image?.src || att.url || att.unshimmed_url;
      if (src) {
        media.push({
          type: att.media_type === 'video' ? 'video' : 'image',
          url: src,
        });
      }
    }

    return {
      source: SocialSource.FACEBOOK,
      type: SocialContentType.POST,
      externalId: post.id,
      author: post.from
        ? { id: post.from.id, name: post.from.name }
        : undefined,
      publishedAt: post.created_time ? new Date(post.created_time) : undefined,
      content: post.message || post.story || '',
      media: media.length ? media : undefined,
      url: post.permalink_url,
      metadata: {
        pageId,
        reactions: post.reactions?.summary?.total_count ?? 0,
        comments: post.comments?.summary?.total_count ?? 0,
        shares: post.shares?.count ?? 0,
      },
    };
  }

  private mapComment(
    comment: FbComment,
    parentPostId: string,
  ): NormalizedContent {
    return {
      source: SocialSource.FACEBOOK,
      type: SocialContentType.COMMENT,
      externalId: comment.id,
      author: comment.from
        ? { id: comment.from.id, name: comment.from.name }
        : undefined,
      publishedAt: comment.created_time
        ? new Date(comment.created_time)
        : undefined,
      content: comment.message || '',
      metadata: {
        parentPostId,
        likeCount: comment.like_count ?? 0,
      },
    };
  }
}
