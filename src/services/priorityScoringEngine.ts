/**
 * Transparent priority scoring (0–100). The score is a fixed, inspectable
 * weighted sum — never an opaque model output:
 *
 *   35% Civilian Safety Impact
 *   20% Immediacy
 *   20% Corroboration
 *   15% Source Confidence
 *   10% Information Freshness
 *
 * Every alert exposes its full factor breakdown so an analyst can audit the rank.
 */

import type {
  Claim,
  Contradiction,
  PriorityAlert,
  Report,
  ResolvedEntity,
  ScoreBreakdown,
  ScoreFactor,
} from '@/types';
import { ageMinutes, freshnessScore } from '@/lib/freshness';
import { severityFromScore } from '@/lib/format';
import { THREAD_BY_ID } from '@/data/scenario';

export const SCORE_WEIGHTS = {
  civilianSafety: 0.35,
  immediacy: 0.2,
  corroboration: 0.2,
  sourceConfidence: 0.15,
  freshness: 0.1,
} as const;

interface RiskDef {
  id: string;
  title: string;
  entityCanonicalIds: string[];
  threadId: string;
  civilianSafetyBase: number;
  immediacyBase: number;
  recommendedVerification: string;
  informationGaps: string[];
  summary: string;
}

export const RISK_CATALOG: RiskDef[] = [
  {
    id: 'hospital-fuel',
    title: 'Hospital Access and Generator Fuel',
    entityCanonicalIds: ['ENT-HOSP', 'ENT-HIGHWAY', 'ENT-VIADUCT'],
    threadId: 'hospital-fuel',
    civilianSafetyBase: 98,
    immediacyBase: 96,
    recommendedVerification: 'Confirm a viable light-vehicle resupply lane from the port before dispatching hospital fuel.',
    informationGaps: [
      'No confirmed ETA for a hospital fuel resupply convoy.',
      'Tacagua Viaduct engineering clearance is not yet verified.',
    ],
    summary: 'Generator fuel is depleting while the primary coastal access corridor is closed near the viaduct.',
  },
  {
    id: 'evacuation-route',
    title: 'Shelter Water and Sanitation Risk',
    entityCanonicalIds: ['ENT-SHELTER', 'ENT-WATER', 'ENT-LA-GUAIRA'],
    threadId: 'evacuation-route',
    civilianSafetyBase: 88,
    immediacyBase: 84,
    recommendedVerification: 'Confirm shelter intake rules and redirect water queues away from unsafe sanitation conditions.',
    informationGaps: ['Civilian volume at the Catia La Mar water point is unquantified.'],
    summary: 'Displaced families are moving toward unsafe water queues while shelter intake is restricted to priority cases.',
  },
  {
    id: 'viaduct-closure',
    title: 'Tacagua Viaduct Closure Confirmed',
    entityCanonicalIds: ['ENT-VIADUCT'],
    threadId: 'hospital-fuel',
    civilianSafetyBase: 80,
    immediacyBase: 78,
    recommendedVerification: 'Maintain engineering confirmation of Tacagua Viaduct status; do not route convoys across it.',
    informationGaps: ['Repair and clearance ETA is unknown.'],
    summary: 'Multiple sources confirm the Tacagua Viaduct approach is impassable to vehicles.',
  },
  {
    id: 'highway-status',
    title: 'Caracas-La Guaira Highway Obstruction',
    entityCanonicalIds: ['ENT-HIGHWAY'],
    threadId: 'hospital-fuel',
    civilianSafetyBase: 72,
    immediacyBase: 70,
    recommendedVerification: 'Request updated highway imagery before relying on it as a resupply corridor.',
    informationGaps: ['No confirmed detour load rating for heavy vehicles.'],
    summary: 'The coastal highway is obstructed near the viaduct; stale reports claiming reopening are contested.',
  },
  {
    id: 'misinformation',
    title: 'Unverified "Hospital Evacuated" Claim',
    entityCanonicalIds: ['ENT-HOSP'],
    threadId: 'misinformation',
    civilianSafetyBase: 74,
    immediacyBase: 76,
    recommendedVerification: 'Verify patient status with the hospital liaison before acting on any "evacuation complete" claim.',
    informationGaps: ['Origin of the social claim is unverified.'],
    summary: 'A public post claims the hospital evacuation is complete; hospital and imagery reporting contradict it.',
  },
  {
    id: 'logistics-depot',
    title: 'Port Aid Staging Access',
    entityCanonicalIds: ['ENT-PORT'],
    threadId: 'logistics-depot',
    civilianSafetyBase: 70,
    immediacyBase: 64,
    recommendedVerification: 'Confirm the secondary port lane is viable for loaded light vehicles.',
    informationGaps: ['Secondary lane weight tolerance is unconfirmed.'],
    summary: 'The port staging area reports supplies available; a secondary lane may support light-vehicle dispatch.',
  },
  {
    id: 'comms-gap',
    title: 'USAR Team 4 - Communications Gap',
    entityCanonicalIds: ['ENT-USAR4'],
    threadId: 'comms-gap',
    civilianSafetyBase: 64,
    immediacyBase: 58,
    recommendedVerification: 'Task a verification check on USAR Team 4 - treat as a comms gap, not a confirmed incident.',
    informationGaps: ['No position update since last contact.', 'Cannot distinguish a comms outage from an incident.'],
    summary: 'USAR Team 4 has gone silent near collapsed housing. No new information does not equal confirmed incident.',
  },
];

export interface ScoringContext {
  reports: Report[];
  claims: Claim[];
  entities: ResolvedEntity[];
  contradictions: Contradiction[];
  asOf: number;
}

function reliabilityFreshest(reports: Report[], n: number): number {
  const freshest = [...reports].sort((a, b) => a.minutesBeforeT0 - b.minutesBeforeT0).slice(0, n);
  if (freshest.length === 0) return 0;
  return freshest.reduce((s, r) => s + r.reliabilityScore, 0) / freshest.length;
}

function factor(
  key: ScoreFactor['key'],
  label: string,
  rawScore: number,
  explanation: string,
): ScoreFactor {
  const weight = SCORE_WEIGHTS[key];
  const clamped = Math.max(0, Math.min(100, Math.round(rawScore)));
  return { key, label, weight, rawScore: clamped, weighted: Number((clamped * weight).toFixed(2)), explanation };
}

export function computeAlerts(ctx: ScoringContext): PriorityAlert[] {
  const { reports, contradictions, entities, asOf } = ctx;
  const canonToEntity = new Map<string, ResolvedEntity>();
  for (const e of entities) {
    if (!canonToEntity.has(e.dominantCanonicalId)) canonToEntity.set(e.dominantCanonicalId, e);
  }

  const alerts: PriorityAlert[] = [];

  for (const def of RISK_CATALOG) {
    const entitySet = new Set(def.entityCanonicalIds);
    const relevantReports = reports.filter((r) =>
      r.extractedEntities.some((m) => entitySet.has(m.canonicalId)),
    );
    if (relevantReports.length === 0) continue;

    const relevantContradictions = contradictions.filter((c) => {
      const e = entities.find((x) => x.id === c.entityId);
      return e ? entitySet.has(e.dominantCanonicalId) : false;
    });

    const minAge = Math.min(...relevantReports.map((r) => ageMinutes(r.minutesBeforeT0, asOf)));
    const freshness = freshnessScore(minAge);
    const corroborationRaw = Math.min(100, (relevantReports.length / 5) * 100);
    const sourceConfidenceRaw = 100 * reliabilityFreshest(relevantReports, 5);
    const immediacyRaw = 0.6 * freshness + 0.4 * def.immediacyBase;

    const factors: ScoreFactor[] = [
      factor('civilianSafety', 'Civilian Safety Impact', def.civilianSafetyBase,
        `Scenario-defined civilian-safety weight for ${def.title.toLowerCase()}.`),
      factor('immediacy', 'Immediacy', immediacyRaw,
        `Blends urgency with recency of the freshest relevant report (${minAge} min old).`),
      factor('corroboration', 'Corroboration', corroborationRaw,
        `${relevantReports.length} relevant reports reference the involved entities.`),
      factor('sourceConfidence', 'Source Confidence', sourceConfidenceRaw,
        `Mean reliability of the ${Math.min(5, relevantReports.length)} freshest contributing sources.`),
      factor('freshness', 'Information Freshness', freshness,
        `Exponential decay from the most recent supporting report (${minAge} min old).`),
    ];

    const total = Math.round(factors.reduce((s, f) => s + f.weighted, 0));
    const breakdown: ScoreBreakdown = { total, factors };
    const severity = severityFromScore(total);

    // Confidence: blend source confidence, corroboration and contradiction confidence.
    const contraConf = relevantContradictions.length
      ? relevantContradictions.reduce((s, c) => s + c.confidence, 0) / relevantContradictions.length
      : 85;
    const confidence = Math.round(0.4 * sourceConfidenceRaw + 0.3 * corroborationRaw + 0.3 * contraConf);

    // Supporting vs conflicting reports.
    const conflictingReportIds = new Set<string>();
    for (const c of relevantContradictions) {
      for (const cc of c.claims) if (cc.stance === 'contested') conflictingReportIds.add(cc.reportId);
    }
    const supportingReportIds = relevantReports
      .map((r) => r.id)
      .filter((id) => !conflictingReportIds.has(id));

    const involvedEntities = def.entityCanonicalIds
      .map((cid) => canonToEntity.get(cid))
      .filter((e): e is ResolvedEntity => Boolean(e));

    const thread = THREAD_BY_ID[def.threadId];

    alerts.push({
      id: def.id,
      topicId: def.threadId,
      headline: def.title,
      summary: def.summary,
      severity,
      priority: total,
      scoreBreakdown: breakdown,
      confidence: Math.min(99, confidence),
      entityIds: involvedEntities.map((e) => e.id),
      entityLabels: involvedEntities.map((e) => e.canonicalName),
      supportingReportIds,
      conflictingReportIds: [...conflictingReportIds],
      contradictionIds: relevantContradictions.map((c) => c.id),
      recommendedVerification: def.recommendedVerification,
      lastUpdated: relevantReports.sort((a, b) => a.minutesBeforeT0 - b.minutesBeforeT0)[0].timestamp,
      requiresHumanReview: relevantContradictions.some((c) => c.requiresVerification),
      riskPath: thread?.riskPath,
      informationGaps: def.informationGaps,
    });
  }

  alerts.sort((a, b) => b.priority - a.priority);
  return alerts;
}
