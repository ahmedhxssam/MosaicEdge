/**
 * Deterministic fuzzy string matching used by the entity resolver.
 * Combines token-set overlap (Jaccard) with per-token edit-distance alignment
 * so that both word-order differences and spelling variants are tolerated.
 */

import type { NormalizedName } from './normalize';

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

/** Normalized edit-distance similarity in [0,1]. */
export function editSimilarity(a: string, b: string): number {
  if (!a && !b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Similarity between two token sets: average of best per-token edit similarity
 * (in both directions) blended with Jaccard overlap. Returns 0..1.
 */
export function tokenSetSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 && tokensB.length === 0) return 1;
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const bestMatch = (from: string[], to: string[]): number => {
    let total = 0;
    for (const t of from) {
      let best = 0;
      for (const u of to) best = Math.max(best, editSimilarity(t, u));
      total += best;
    }
    return total / from.length;
  };

  const aligned = (bestMatch(tokensA, tokensB) + bestMatch(tokensB, tokensA)) / 2;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter++;
  const union = new Set([...tokensA, ...tokensB]).size;
  const jaccard = union === 0 ? 0 : inter / union;

  // Weight alignment slightly higher than raw Jaccard to reward near-matches.
  return Number((aligned * 0.6 + jaccard * 0.4).toFixed(4));
}

export function nameSimilarity(a: NormalizedName, b: NormalizedName): number {
  return tokenSetSimilarity(a.tokens, b.tokens);
}
