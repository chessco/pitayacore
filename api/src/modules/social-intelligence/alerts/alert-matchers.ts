/**
 * Pure, side-effect-free rule matchers. Kept separate from the DB-coupled
 * engine so the alerting logic is unit-testable in isolation.
 */

export type AlertRuleType =
  | 'MENTION_SPIKE'
  | 'NEGATIVE_SENTIMENT'
  | 'EMERGING_TOPIC'
  | 'COMMENT_VOLUME'
  | 'CRITICAL_KEYWORDS';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/** Default severity per rule type; a rule's `params.severity` overrides this. */
export const DEFAULT_SEVERITY: Record<AlertRuleType, Severity> = {
  CRITICAL_KEYWORDS: 'HIGH',
  NEGATIVE_SENTIMENT: 'MEDIUM',
  COMMENT_VOLUME: 'MEDIUM',
  MENTION_SPIKE: 'HIGH',
  EMERGING_TOPIC: 'MEDIUM',
};

/** Case-insensitive: return the configured keywords found in the text. */
export function matchKeywords(text: string, keywords: string[]): string[] {
  if (!text || !keywords?.length) return [];
  const haystack = text.toLowerCase();
  return keywords.filter(
    (kw) => kw && haystack.includes(kw.toLowerCase().trim()),
  );
}

/**
 * True when the item counts as negative. Fires on an explicit NEGATIVE
 * sentiment, or when a numeric score is at/below the threshold (default -0.3).
 */
export function matchNegativeSentiment(
  sentiment: string | null | undefined,
  score: number | null | undefined,
  scoreThreshold = -0.3,
): boolean {
  if (sentiment === 'NEGATIVE') return true;
  if (typeof score === 'number') return score <= scoreThreshold;
  return false;
}

/** True when a post's public comment count reaches the threshold. */
export function matchCommentVolume(
  commentCount: number | null | undefined,
  threshold: number,
): boolean {
  if (typeof commentCount !== 'number' || threshold <= 0) return false;
  return commentCount >= threshold;
}

/**
 * Count how many times each topic appears across a set of topic-lists, and
 * return those meeting the threshold, sorted by count desc.
 */
export function findEmergingTopics(
  topicLists: string[][],
  threshold: number,
): Array<{ topic: string; count: number }> {
  const counts = new Map<string, number>();
  for (const list of topicLists) {
    for (const topic of list ?? []) {
      if (!topic) continue;
      counts.set(topic, (counts.get(topic) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= threshold && threshold > 0)
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count);
}
