/**
 * Local Fusion Engine — the offline-first heart of Mosaic Edge.
 *
 * A single pure function turns a set of reports into a fully provenance-linked
 * picture: resolved entities → contradictions → priority alerts → evidence
 * graph, computed *as of* a chosen point on the scenario clock. Because it is
 * pure and deterministic, the same engine powers the live view, Timeline Replay
 * and the "What Changed?" delta — and it runs entirely on the edge node with no
 * network dependency.
 */

import type {
  Claim,
  Contradiction,
  FusionState,
  PriorityAlert,
  Report,
  ResolvedEntity,
  Severity,
} from '@/types';
import { existsAt } from '@/lib/freshness';
import { T0_MS } from '@/data/scenario';
import { resolveEntities } from './entityResolutionEngine';
import { detectContradictions } from './contradictionEngine';
import { computeAlerts } from './priorityScoringEngine';
import { buildGraph } from './graphBuilder';

const SEV_RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const SEV_BY_RANK: Severity[] = ['low', 'medium', 'high', 'critical'];
const WHY_CHANGED_DELTA = 30;

interface PipelineOutput {
  reports: Report[];
  claims: Claim[];
  entities: ResolvedEntity[];
  contradictions: Contradiction[];
  alerts: PriorityAlert[];
  mentionIndex: Map<string, string>;
}

export interface FuseOptions {
  /** reportId → overridden reliability score (from analyst adjustments). */
  reliabilityOverrides?: Record<string, number>;
  /** reportIds excluded from the active picture (marked outdated). */
  excludedReportIds?: string[];
  /** canonicalId → analyst merge decision. */
  reviewDecisions?: Record<string, 'confirmed' | 'rejected'>;
}

function applyOverrides(reports: Report[], opts: FuseOptions): Report[] {
  const overrides = opts.reliabilityOverrides ?? {};
  const excluded = new Set(opts.excludedReportIds ?? []);
  return reports
    .filter((r) => !excluded.has(r.id))
    .map((r) => {
      if (!(r.id in overrides)) return r;
      const rel = Math.max(0, Math.min(1, overrides[r.id]));
      return {
        ...r,
        reliabilityScore: rel,
        extractedClaims: r.extractedClaims.map((c) => ({ ...c, sourceReliability: rel })),
      };
    });
}

function runPipeline(allReports: Report[], asOf: number, opts: FuseOptions = {}): PipelineOutput {
  const reports = applyOverrides(allReports.filter((r) => existsAt(r.minutesBeforeT0, asOf)), opts);
  const claims = reports.flatMap((r) => r.extractedClaims);

  const { entities, mentionIndex } = resolveEntities(reports);
  const entityById = new Map(entities.map((e) => [e.id, e]));
  const reportById = new Map(reports.map((r) => [r.id, r]));

  const contradictions = detectContradictions({ claims, mentionIndex, entityById, reportById, asOf });
  const alerts = computeAlerts({ reports, claims, entities, contradictions, asOf });

  // Upgrade entity risk levels from alerts + contradictions.
  const canonRisk = new Map<string, Severity>();
  for (const a of alerts) {
    for (const eid of a.entityIds) {
      const cur = canonRisk.get(eid);
      if (!cur || SEV_RANK[a.severity] > SEV_RANK[cur]) canonRisk.set(eid, a.severity);
    }
  }
  for (const c of contradictions) {
    const cur = canonRisk.get(c.entityId);
    if (!cur || SEV_RANK['medium'] > SEV_RANK[cur]) canonRisk.set(c.entityId, cur ?? 'medium');
  }
  for (const e of entities) {
    const r = canonRisk.get(e.id);
    if (r) e.riskLevel = r;
    // Apply analyst merge decisions.
    const decision = opts.reviewDecisions?.[e.dominantCanonicalId];
    if (decision === 'confirmed') e.reviewStatus = 'confirmed';
    else if (decision === 'rejected') e.reviewStatus = 'rejected';
  }

  return { reports, claims, entities, contradictions, alerts, mentionIndex };
}

function attachWhyChanged(current: PriorityAlert[], previous: PriorityAlert[]): void {
  const prevById = new Map(previous.map((a) => [a.id, a]));
  for (const a of current) {
    const prev = prevById.get(a.id);
    if (!prev) {
      a.whyChanged = `New alert since the previous sync window.`;
      continue;
    }
    const dP = a.priority - prev.priority;
    const dC = a.confidence - prev.confidence;
    if (Math.abs(dP) < 1 && Math.abs(dC) < 1) continue;
    const bits: string[] = [];
    if (Math.abs(dC) >= 1) {
      bits.push(`confidence ${dC >= 0 ? 'rose' : 'fell'} from ${prev.confidence}% to ${a.confidence}%`);
    }
    if (Math.abs(dP) >= 1) {
      bits.push(`priority ${dP >= 0 ? 'rose' : 'fell'} from ${prev.priority} to ${a.priority}`);
    }
    a.whyChanged = capitalize(bits.join(' and ')) + ' as newer corroborating reports arrived.';
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Run the full fusion pipeline as of `asOf` minutes before T0 (0 = now).
 * `whyChanged` is computed against a snapshot 30 minutes earlier.
 */
export function fuse(allReports: Report[], asOf = 0, opts: FuseOptions = {}): FusionState {
  const out = runPipeline(allReports, asOf, opts);

  // "Why changed" vs a 30-minute-earlier snapshot, when one exists.
  const prevAsOf = asOf + WHY_CHANGED_DELTA;
  const hasPrev = allReports.some((r) => existsAt(r.minutesBeforeT0, prevAsOf));
  if (hasPrev) {
    const prev = runPipeline(allReports, prevAsOf, opts);
    attachWhyChanged(out.alerts, prev.alerts);
  }

  const graph = buildGraph({
    entities: out.entities,
    reports: out.reports,
    contradictions: out.contradictions,
    mentionIndex: out.mentionIndex,
  });

  return {
    asOfMinutesBeforeT0: asOf,
    reports: out.reports,
    claims: out.claims,
    entities: out.entities,
    contradictions: out.contradictions,
    alerts: out.alerts,
    graph,
    generatedAt: new Date(T0_MS - asOf * 60_000).toISOString(),
  };
}

export { SEV_RANK, SEV_BY_RANK };
export type { PipelineOutput };
