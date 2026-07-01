/**
 * "What Changed?" delta engine — diffs two fusion snapshots (e.g. last sync vs
 * now) into an analyst-facing change brief. This is what makes disconnected
 * fusion legible: on reconnect, the analyst sees exactly what moved and why.
 */

import type { Correction, DeltaBrief, DeltaEntry, FusionState, SyncEvent } from '@/types';
import { SEV_RANK } from './localFusionEngine';
import { ageMinutes, isStale } from '@/lib/freshness';

export interface DeltaExtras {
  syncArrivals?: SyncEvent[];
  analystDecisions?: Correction[];
}

export function computeDelta(prev: FusionState, curr: FusionState, extras: DeltaExtras = {}): DeltaBrief {
  const entries: DeltaEntry[] = [];
  const prevAlerts = new Map(prev.alerts.map((a) => [a.id, a]));
  const prevContra = new Set(prev.contradictions.map((c) => c.id));
  const prevEntityAlias = new Map(prev.entities.map((e) => [e.dominantCanonicalId, e.aliases.length]));

  // Alerts
  for (const a of curr.alerts) {
    const p = prevAlerts.get(a.id);
    if (!p) {
      entries.push({
        kind: 'new-alert',
        title: `New alert: ${a.headline}`,
        detail: `${a.severity.toUpperCase()} · priority ${a.priority} · confidence ${a.confidence}%.`,
        severity: a.severity,
        refType: 'alert',
        refId: a.id,
      });
      continue;
    }
    const dP = a.priority - p.priority;
    const sevUp = SEV_RANK[a.severity] > SEV_RANK[p.severity];
    if (dP >= 3 || sevUp) {
      entries.push({
        kind: 'escalated',
        title: `Escalated: ${a.headline}`,
        detail: a.whyChanged ?? `Priority ${p.priority} → ${a.priority}, confidence ${p.confidence}% → ${a.confidence}%.`,
        severity: a.severity,
        refType: 'alert',
        refId: a.id,
      });
    } else if (dP <= -3) {
      entries.push({
        kind: 'de-escalated',
        title: `De-escalated: ${a.headline}`,
        detail: `Priority ${p.priority} → ${a.priority} as the picture clarified.`,
        severity: a.severity,
        refType: 'alert',
        refId: a.id,
      });
    }
  }

  // New contradictions
  for (const c of curr.contradictions) {
    if (!prevContra.has(c.id)) {
      entries.push({
        kind: 'new-contradiction',
        title: `New contradiction: ${c.entityLabel} — ${c.predicateLabel}`,
        detail: `${c.favoredValueText} favored at ${c.confidence}% confidence. ${c.verificationAction}`,
        severity: c.severity,
        refType: 'contradiction',
        refId: c.id,
      });
    }
  }

  // New / strengthened entity links
  for (const e of curr.entities) {
    const prevCount = prevEntityAlias.get(e.dominantCanonicalId) ?? 0;
    if (e.aliases.length > prevCount && e.aliases.length > 1) {
      entries.push({
        kind: 'new-entity-link',
        title: `Entity link strengthened: ${e.canonicalName}`,
        detail: `Now ${e.aliases.length} resolved aliases across ${new Set(e.aliases.map((a) => a.language)).size} language(s) at ${(e.mergeConfidence * 100).toFixed(0)}% confidence.`,
        refType: 'entity',
        refId: e.id,
      });
    }
  }

  // Stale reports (contested + aged out)
  const contested = new Set<string>();
  for (const c of curr.contradictions) for (const cc of c.claims) if (cc.stance === 'contested') contested.add(cc.reportId);
  for (const r of curr.reports) {
    const age = ageMinutes(r.minutesBeforeT0, curr.asOfMinutesBeforeT0);
    if (contested.has(r.id) && isStale(age)) {
      entries.push({
        kind: 'stale-report',
        title: `Report became stale: ${r.id}`,
        detail: `${r.sourceName} (${r.sourceType}) — ${age} min old and superseded by fresher, corroborated reporting.`,
        refType: 'report',
        refId: r.id,
      });
    }
  }

  // Sync arrivals
  for (const s of extras.syncArrivals ?? []) {
    entries.push({
      kind: 'sync-arrival',
      title: `Synced: ${s.label}`,
      detail: `Stored offline at ${s.createdAt.slice(11, 16)}, forwarded on reconnect. Original timestamp preserved.`,
      refType: 'report',
      refId: s.objectId,
    });
  }

  // Analyst decisions
  for (const d of extras.analystDecisions ?? []) {
    entries.push({
      kind: 'analyst-decision',
      title: `Analyst decision: ${decisionLabel(d)}`,
      detail: `${d.targetLabel}${d.note ? ` — "${d.note}"` : ''} (${d.actor}).`,
    });
  }

  // Suggested verifications
  for (const c of curr.contradictions.filter((x) => x.requiresVerification).slice(0, 4)) {
    entries.push({
      kind: 'suggested-verification',
      title: `Verify: ${c.entityLabel} — ${c.predicateLabel}`,
      detail: c.verificationAction,
      severity: c.severity,
      refType: 'contradiction',
      refId: c.id,
    });
  }

  return {
    fromMinutesBeforeT0: prev.asOfMinutesBeforeT0,
    toMinutesBeforeT0: curr.asOfMinutesBeforeT0,
    entries,
  };
}

function decisionLabel(d: Correction): string {
  switch (d.type) {
    case 'confirm-merge': return 'Confirmed entity merge';
    case 'reject-merge': return 'Rejected entity merge';
    case 'mark-outdated': return 'Marked report outdated';
    case 'flag-verification': return 'Flagged for verification';
    case 'adjust-reliability': return 'Adjusted source reliability';
    case 'analyst-note': return 'Added analyst note';
    default: return d.type;
  }
}

export const DELTA_KIND_META: Record<DeltaEntry['kind'], { label: string; tone: string }> = {
  'new-alert': { label: 'New Alerts', tone: 'text-critical' },
  escalated: { label: 'Escalated Alerts', tone: 'text-high' },
  'de-escalated': { label: 'De-escalated Alerts', tone: 'text-verified' },
  'new-entity-link': { label: 'New Entity Links', tone: 'text-accent' },
  'new-contradiction': { label: 'New Contradictions', tone: 'text-contradiction' },
  'stale-report': { label: 'Stale Reports', tone: 'text-low' },
  'sync-arrival': { label: 'Sync Arrivals', tone: 'text-syncing' },
  'analyst-decision': { label: 'Analyst Decisions', tone: 'text-slate-300' },
  'suggested-verification': { label: 'Suggested Verification Tasks', tone: 'text-medium' },
};
