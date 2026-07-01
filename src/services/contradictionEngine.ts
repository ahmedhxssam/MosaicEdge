/**
 * Contradiction ("Truth Tension") engine.
 *
 * Groups claims by resolved entity + predicate, surfaces competing values, and
 * selects a favored interpretation from an explainable weighting of source
 * reliability, freshness and corroboration. Conflicts are never hidden — the
 * losing claims are kept and shown alongside the rationale.
 */

import type {
  Claim,
  CompetingClaim,
  Contradiction,
  ConflictType,
  Report,
  ResolvedEntity,
  Severity,
} from '@/types';
import { ageMinutes, freshnessScore, isStale } from '@/lib/freshness';
import { predicateLabel, THREAD_BY_ID } from '@/data/scenario';

export interface ContradictionContext {
  claims: Claim[];
  mentionIndex: Map<string, string>;
  entityById: Map<string, ResolvedEntity>;
  reportById: Map<string, Report>;
  asOf: number;
}

const NON_CONFLICTING_PREDICATES = new Set(['contextNote', 'fuelUrgent', 'fuelShortage']);

function verificationActionFor(predicate: string, entityLabel: string): string {
  switch (predicate) {
    case 'status':
      if (/viaduct|tacagua|bridge/i.test(entityLabel))
        return `Dispatch an engineering spot-check to confirm ${entityLabel} status before routing any convoy.`;
      if (/route|ruta|road|highway|guaira|طريق/i.test(entityLabel))
        return `Request updated road imagery for ${entityLabel} before relying on it as a corridor.`;
      if (/shelter|refugio|polideportivo/i.test(entityLabel))
        return `Confirm current ${entityLabel} intake rules and sanitation status before redirecting displaced families.`;
      return `Confirm current ${entityLabel} access with a field team before directing movement.`;
    case 'fuelHoursRemaining':
      return `Confirm current generator fuel level directly with ${entityLabel} operations.`;
    case 'evacuationComplete':
      return `Verify patient/evacuation status with the ${entityLabel} liaison before acting on any "complete" claim.`;
    default:
      return `Task a verification check for ${entityLabel} (${predicateLabel(predicate)}).`;
  }
}

export function detectContradictions(ctx: ContradictionContext): Contradiction[] {
  const { claims, mentionIndex, entityById, reportById, asOf } = ctx;

  // Group claims by entity + predicate.
  const groups = new Map<string, Claim[]>();
  for (const c of claims) {
    if (NON_CONFLICTING_PREDICATES.has(c.predicate)) continue;
    const entityId = mentionIndex.get(c.subjectMentionId) ?? `canon:${c.subjectCanonicalId}`;
    const key = `${entityId}::${c.predicate}`;
    const arr = groups.get(key) ?? [];
    arr.push(c);
    groups.set(key, arr);
  }

  const contradictions: Contradiction[] = [];

  for (const [key, groupClaims] of groups) {
    const [entityId, predicate] = key.split('::');
    const distinctValues = new Set(groupClaims.map((c) => String(c.value)));
    if (distinctValues.size < 2) continue; // no conflict

    // Aggregate support weight per value.
    const valueAgg = new Map<string, { weight: number; sources: Set<string>; relSum: number; count: number; minAge: number }>();
    for (const c of groupClaims) {
      const report = reportById.get(c.reportId);
      const age = ageMinutes(report?.minutesBeforeT0 ?? 0, asOf);
      const fresh = freshnessScore(age) / 100;
      const v = String(c.value);
      const cur = valueAgg.get(v) ?? { weight: 0, sources: new Set<string>(), relSum: 0, count: 0, minAge: Infinity };
      cur.weight += c.sourceReliability * fresh;
      cur.sources.add(c.reportId);
      cur.relSum += c.sourceReliability;
      cur.count += 1;
      cur.minAge = Math.min(cur.minAge, age);
      valueAgg.set(v, cur);
    }

    const ranked = [...valueAgg.entries()].sort((a, b) => b[1].weight - a[1].weight);
    const [favoredValue, favoredAgg] = ranked[0];
    const runnerUp = ranked[1]?.[1];

    const share = runnerUp ? favoredAgg.weight / (favoredAgg.weight + runnerUp.weight) : 1;
    const corrBoost = Math.min(1, favoredAgg.sources.size / 4);
    const avgRel = favoredAgg.relSum / favoredAgg.count;
    const freshNorm = freshnessScore(favoredAgg.minAge) / 100;
    const confidence = Math.min(
      99,
      Math.round(100 * (0.45 * share + 0.25 * corrBoost + 0.15 * avgRel + 0.15 * freshNorm)),
    );

    // Build competing-claim rows.
    const competing: CompetingClaim[] = groupClaims
      .map((c) => {
        const report = reportById.get(c.reportId);
        const age = ageMinutes(report?.minutesBeforeT0 ?? 0, asOf);
        return {
          claimId: c.id,
          reportId: c.reportId,
          sourceName: report?.sourceName ?? c.reportId,
          sourceType: report?.sourceType ?? 'OSINT',
          valueText: c.valueText,
          reliability: c.sourceReliability,
          freshnessMinutes: age,
          corroboration: valueAgg.get(String(c.value))?.sources.size ?? 1,
          stance: (String(c.value) === favoredValue ? 'favored' : 'contested') as 'favored' | 'contested',
        };
      })
      .sort((a, b) => Number(b.stance === 'favored') - Number(a.stance === 'favored') || a.freshnessMinutes - b.freshnessMinutes);

    const favoredClaim = competing.find((c) => c.stance === 'favored')!;
    const contestedClaims = competing.filter((c) => c.stance === 'contested');
    const oldestContested = contestedClaims.sort((a, b) => b.freshnessMinutes - a.freshnessMinutes)[0];

    // Determine conflict type.
    const numeric = groupClaims.every((c) => typeof c.value === 'number');
    let conflictType: ConflictType;
    if (numeric) conflictType = 'numeric-discrepancy';
    else if (oldestContested && isStale(oldestContested.freshnessMinutes) && favoredAgg.minAge < oldestContested.freshnessMinutes - 20)
      conflictType = 'stale-superseded';
    else if (favoredAgg.sources.size <= 1) conflictType = 'low-corroboration';
    else conflictType = 'direct';

    const entity = entityById.get(entityId);
    const entityLabel = entity?.canonicalName ?? groupClaims[0].subjectLabel;
    const topicId = groupClaims.find((c) => THREAD_BY_ID[c.topicId])?.topicId ?? groupClaims[0].topicId;
    const topicBase = Math.max(...groupClaims.map((c) => THREAD_BY_ID[c.topicId]?.civilianSafetyBase ?? 60));
    const severity: Severity = topicBase >= 85 ? 'high' : 'medium';

    const hasHighRel = [...favoredAgg.sources].some((rid) => (reportById.get(rid)?.reliabilityScore ?? 0) >= 0.85);
    const ageGap = oldestContested ? oldestContested.freshnessMinutes - favoredAgg.minAge : 0;

    const rationale = buildRationale({
      entityLabel,
      favoredValueText: favoredClaim.valueText,
      favoredSources: favoredAgg.sources.size,
      hasHighRel,
      favoredMinAge: favoredAgg.minAge,
      contested: oldestContested,
      ageGap,
      conflictType,
    });

    const mostRecent = groupClaims
      .map((c) => ({ c, age: ageMinutes(reportById.get(c.reportId)?.minutesBeforeT0 ?? 0, asOf) }))
      .sort((a, b) => a.age - b.age)[0];

    contradictions.push({
      id: `TT-${entityId}-${predicate}`,
      entityId,
      entityLabel,
      predicate,
      predicateLabel: predicateLabel(predicate),
      conflictType,
      severity,
      claims: competing,
      favoredClaimId: favoredClaim.claimId,
      favoredValueText: favoredClaim.valueText,
      rationale,
      requiresVerification: true,
      verificationAction: verificationActionFor(predicate, entityLabel),
      sourceCount: favoredAgg.sources.size + contestedClaims.length,
      mostRecentEvidence: mostRecent.c.timestamp,
      confidence,
      topicId,
    });
  }

  // Order: severity then confidence-gap interest.
  const sevRank: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  contradictions.sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || b.confidence - a.confidence);
  return contradictions;
}

function buildRationale(p: {
  entityLabel: string;
  favoredValueText: string;
  favoredSources: number;
  hasHighRel: boolean;
  favoredMinAge: number;
  contested?: CompetingClaim;
  ageGap: number;
  conflictType: ConflictType;
}): string {
  const parts: string[] = [];
  const sourceWord = p.favoredSources === 1 ? 'source' : 'independent sources';
  parts.push(
    `"${p.favoredValueText}" is currently favored: ${p.favoredSources} ${sourceWord}` +
      `${p.hasHighRel ? ', including a high-reliability observation,' : ''} support it (most recent ${p.favoredMinAge} min ago).`,
  );
  if (p.contested) {
    if (p.conflictType === 'numeric-discrepancy') {
      parts.push(
        `The competing figure ("${p.contested.valueText}") is ${p.contested.freshnessMinutes} min old from a ${reliabilityWord(p.contested.reliability)} source and is superseded by fresher reporting.`,
      );
    } else {
      parts.push(
        `The competing claim ("${p.contested.valueText}") is ${Math.max(0, p.ageGap)} min older, from a ${reliabilityWord(p.contested.reliability)} source, and lacks corroboration.`,
      );
    }
  }
  return parts.join(' ');
}

function reliabilityWord(r: number): string {
  if (r >= 0.85) return 'high-reliability';
  if (r >= 0.6) return 'medium-reliability';
  if (r >= 0.38) return 'low-reliability';
  return 'very-low-reliability';
}
