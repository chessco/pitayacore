import { Injectable } from '@nestjs/common';
import { NormalizedContent } from '../../dto/normalized-content';

/**
 * Final sanitization pass over connector output before persistence. Connectors
 * are responsible for mapping to NormalizedContent; the normalizer guarantees
 * invariants the rest of the pipeline relies on (valid id, trimmed content,
 * de-duplicated within a single batch).
 */
@Injectable()
export class NormalizerService {
  normalize(items: NormalizedContent[]): NormalizedContent[] {
    const seen = new Set<string>();
    const result: NormalizedContent[] = [];

    for (const item of items) {
      if (!item?.externalId) continue;
      const key = `${item.source}:${item.externalId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      result.push({
        ...item,
        content: (item.content || '').trim(),
      });
    }
    return result;
  }
}
