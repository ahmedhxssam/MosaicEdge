/**
 * Explainable, deterministic entity-resolution engine.
 *
 * No opaque ML: every merge is the product of inspectable signals
 * (normalized-name similarity, Arabic alias dictionary, shared coordinates,
 * shared context tags, time-window overlap). The output carries the reasons and
 * a confidence so an analyst can confirm, reject, or undo any merge.
 */

import type {
  EntityAlias,
  EntityMention,
  MergeReason,
  Report,
  ResolvedEntity,
  ReviewStatus,
} from '@/types';
import { normalizeName, type NormalizedName } from '@/lib/normalize';
import { nameSimilarity } from '@/lib/fuzzy';
import { distanceKm } from '@/lib/geo';

export const MERGE_THRESHOLD = 0.62;
const REVIEW_CONFIDENCE = 0.8;
const COORD_RADIUS_KM = 1.0;
const TIME_WINDOW_MIN = 120;

interface MentionCtx {
  mention: EntityMention;
  norm: NormalizedName;
  minutesBeforeT0: number;
}

interface PairSignal {
  score: number;
  reasons: MergeReason[];
  distanceKm?: number;
}

function pairScore(a: MentionCtx, b: MentionCtx): PairSignal {
  // Hard constraint: only merge mentions of the same entity type.
  if (a.mention.entityType !== b.mention.entityType) {
    return { score: 0, reasons: [] };
  }

  const reasons: MergeReason[] = [];

  const nameSim = nameSimilarity(a.norm, b.norm);
  reasons.push({
    kind: 'name-similarity',
    detail: `Normalized name match ${(nameSim * 100).toFixed(0)}% ("${a.norm.normalized}" ≈ "${b.norm.normalized}")`,
    weight: 0.5 * nameSim,
  });

  if (a.norm.usedDictionary || b.norm.usedDictionary) {
    reasons.push({
      kind: 'alias-dictionary',
      detail: 'Cross-script alias resolved via the Arabic alias dictionary',
      weight: 0.08,
    });
  }

  let coordSignal = 0;
  let dist: number | undefined;
  if (a.mention.coordinates && b.mention.coordinates) {
    dist = distanceKm(a.mention.coordinates, b.mention.coordinates);
    coordSignal = Math.max(0, 1 - dist / COORD_RADIUS_KM);
    if (coordSignal > 0) {
      reasons.push({
        kind: 'shared-coordinates',
        detail: `References within ${dist.toFixed(2)} km`,
        weight: 0.2 * coordSignal,
      });
    }
  }

  const tagsA = new Set(a.mention.contextTags);
  const tagsB = new Set(b.mention.contextTags);
  const shared = [...tagsA].filter((t) => tagsB.has(t));
  const union = new Set([...tagsA, ...tagsB]);
  const contextSignal = union.size === 0 ? 0 : shared.length / union.size;
  if (shared.length > 0) {
    reasons.push({
      kind: 'shared-context',
      detail: `Shared context tags: ${shared.join(', ')}`,
      weight: 0.15 * contextSignal,
    });
  }

  const dt = Math.abs(a.minutesBeforeT0 - b.minutesBeforeT0);
  const timeSignal = Math.max(0, 1 - dt / TIME_WINDOW_MIN);
  if (timeSignal > 0.3) {
    reasons.push({
      kind: 'time-overlap',
      detail: `Reported within a ${dt}-minute window`,
      weight: 0.15 * timeSignal,
    });
  }

  // Bonus when an alias-dictionary translit exactly matches the other normalized form.
  const dictBonus = (a.norm.usedDictionary || b.norm.usedDictionary) && nameSim > 0.95 ? 0.06 : 0;

  const score =
    0.5 * nameSim + 0.2 * coordSignal + 0.15 * contextSignal + 0.15 * timeSignal + dictBonus;

  return { score: Number(score.toFixed(4)), reasons, distanceKm: dist };
}

// Union-find
class DSU {
  parent: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }
  union(a: number, b: number) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[Math.max(ra, rb)] = Math.min(ra, rb);
  }
}

function pickCanonicalName(aliases: EntityAlias[]): string {
  const english = aliases.filter((a) => a.language === 'en');
  const pool = english.length > 0 ? english : aliases;
  return [...pool].sort((a, b) => b.reportIds.length - a.reportIds.length || a.surfaceForm.localeCompare(b.surfaceForm))[0]
    ?.surfaceForm ?? aliases[0]?.surfaceForm ?? 'Unknown entity';
}

export interface ResolutionResult {
  entities: ResolvedEntity[];
  /** mentionId → resolvedEntityId */
  mentionIndex: Map<string, string>;
}

export function resolveEntities(reports: Report[]): ResolutionResult {
  const minutesByReport = new Map(reports.map((r) => [r.id, r.minutesBeforeT0]));
  const ctxs: MentionCtx[] = reports
    .flatMap((r) => r.extractedEntities)
    .map((mention) => ({
      mention,
      norm: normalizeName(mention.surfaceForm, mention.language),
      minutesBeforeT0: minutesByReport.get(mention.reportId) ?? 0,
    }));

  const n = ctxs.length;
  const dsu = new DSU(n);
  // Track the linking signal between cluster members for confidence + reasons.
  const linkScores: number[] = [];
  const linkReasons: MergeReason[][] = [];

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const signal = pairScore(ctxs[i], ctxs[j]);
      if (signal.score >= MERGE_THRESHOLD) {
        dsu.union(i, j);
        linkScores.push(signal.score);
        linkReasons.push(signal.reasons);
      }
    }
  }

  // Group member indices by cluster root.
  const clusters = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = dsu.find(i);
    const arr = clusters.get(root) ?? [];
    arr.push(i);
    clusters.set(root, arr);
  }

  const entities: ResolvedEntity[] = [];
  const mentionIndex = new Map<string, string>();
  let clusterNum = 0;

  for (const [root, members] of clusters) {
    clusterNum += 1;
    const memberCtxs = members.map((m) => ctxs[m]);
    const memberMentions = memberCtxs.map((c) => c.mention);

    // Build aliases (grouped by surface form).
    const aliasMap = new Map<string, EntityAlias>();
    for (const c of memberCtxs) {
      const key = c.mention.surfaceForm;
      const existing = aliasMap.get(key);
      if (existing) {
        existing.reportIds.push(c.mention.reportId);
      } else {
        aliasMap.set(key, {
          surfaceForm: c.mention.surfaceForm,
          language: c.mention.language,
          normalized: c.norm.normalized,
          reportIds: [c.mention.reportId],
        });
      }
    }
    const aliases = [...aliasMap.values()];

    // Confidence: mean pairwise score among all member pairs (cohesion). Singletons = 1.
    let confidence = 1;
    if (memberCtxs.length > 1) {
      let sum = 0;
      let count = 0;
      for (let i = 0; i < memberCtxs.length; i++) {
        for (let j = i + 1; j < memberCtxs.length; j++) {
          sum += pairScore(memberCtxs[i], memberCtxs[j]).score;
          count += 1;
        }
      }
      confidence = count > 0 ? sum / count : 1;
    }

    // Aggregate merge reasons (dedup by kind, best detail).
    const reasonByKind = new Map<string, MergeReason>();
    if (memberCtxs.length > 1) {
      for (let i = 0; i < memberCtxs.length; i++) {
        for (let j = i + 1; j < memberCtxs.length; j++) {
          for (const r of pairScore(memberCtxs[i], memberCtxs[j]).reasons) {
            const cur = reasonByKind.get(r.kind);
            if (!cur || r.weight > cur.weight) reasonByKind.set(r.kind, r);
          }
        }
      }
    }
    const mergeReasons = [...reasonByKind.values()].sort((a, b) => b.weight - a.weight);

    const allTags = Array.from(new Set(memberMentions.flatMap((m) => m.contextTags)));
    const reportIds = Array.from(new Set(memberMentions.map((m) => m.reportId)));
    const coords = memberMentions.find((m) => m.coordinates)?.coordinates;
    const canonicalName = pickCanonicalName(aliases);

    const isMultiLanguage = new Set(memberMentions.map((m) => m.language)).size > 1;
    let reviewStatus: ReviewStatus = 'auto';
    if (memberCtxs.length > 1 && confidence < REVIEW_CONFIDENCE) reviewStatus = 'needs-review';

    const dominantCanonicalId = mode(memberMentions.map((m) => m.canonicalId));

    const entityId = `RE-${String(clusterNum).padStart(2, '0')}`;
    for (const m of memberMentions) mentionIndex.set(m.id, entityId);

    entities.push({
      id: entityId,
      canonicalName,
      entityType: memberMentions[0].entityType,
      aliases,
      mentionIds: memberMentions.map((m) => m.id),
      reportIds,
      coordinates: coords,
      contextTags: allTags,
      mergeConfidence: Number(confidence.toFixed(4)),
      mergeReasons,
      reviewStatus,
      riskLevel: 'low',
      dominantCanonicalId,
    });

    void root;
    void isMultiLanguage;
    void linkScores;
    void linkReasons;
  }

  // Stable ordering: multi-alias clusters first, then by name.
  entities.sort((a, b) => b.aliases.length - a.aliases.length || a.canonicalName.localeCompare(b.canonicalName));
  return { entities, mentionIndex };
}

function mode(arr: string[]): string {
  const counts = new Map<string, number>();
  let best = arr[0];
  let bestC = 0;
  for (const x of arr) {
    const c = (counts.get(x) ?? 0) + 1;
    counts.set(x, c);
    if (c > bestC) {
      bestC = c;
      best = x;
    }
  }
  return best;
}
