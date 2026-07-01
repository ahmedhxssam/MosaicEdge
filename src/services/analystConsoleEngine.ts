/**
 * Analyst Console — a guided, source-grounded query engine.
 *
 * This is deliberately NOT an open-ended chatbot. In local demo mode it matches
 * the analyst's question to an intent and answers from the CURRENT fusion state,
 * always returning clickable source citations. (An optional Bedrock provider can
 * back the same contract when credentials are present — see bedrockProvider.ts.)
 */

import type { DeltaBrief, FusionState, UserRole } from '@/types';
import { ageMinutes, isStale } from '@/lib/freshness';
import { redactedSourceName } from './roleService';

export interface ConsoleCitation {
  id: string;
  label: string;
  refType: 'report' | 'entity' | 'alert' | 'contradiction';
}

export interface ConsoleResponse {
  intent: string;
  answer: string;
  citations: ConsoleCitation[];
  grounded: boolean;
}

export const SUGGESTED_QUESTIONS = [
  'What changed in the last 30 minutes?',
  'Why is the hospital alert critical?',
  'Which route has conflicting reports?',
  'What claims need human verification?',
  'Show all evidence connected to Hospital Dr. Jose Maria Vargas.',
  'What information is missing before acting?',
  'Which sources are stale?',
];

interface AnswerParams {
  state: FusionState;
  query: string;
  role: UserRole;
  delta?: DeltaBrief;
}

export function answerQuery({ state, query, role, delta }: AnswerParams): ConsoleResponse {
  const q = query.toLowerCase();
  const reportById = new Map(state.reports.map((r) => [r.id, r]));
  const cite = (ids: string[]): ConsoleCitation[] =>
    ids
      .map((id) => reportById.get(id))
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .map((r) => ({
        id: r.id,
        label: `${r.id} · ${r.sourceType} · ${redactedSourceName(role, r)}`,
        refType: 'report' as const,
      }));

  // ── Intent: what changed ──────────────────────────────────────────────
  if (/(what.*chang|last \d+ min|since.*sync|delta)/.test(q)) {
    const entries = delta?.entries ?? [];
    const escalated = entries.filter((e) => e.kind === 'escalated' || e.kind === 'new-alert');
    const lines = escalated.slice(0, 4).map((e) => `• ${e.title} — ${e.detail}`);
    const answer =
      escalated.length > 0
        ? `Since the previous sync window, ${escalated.length} alert(s) moved:\n${lines.join('\n')}`
        : 'No material changes to alerts in the comparison window.';
    return {
      intent: 'what-changed',
      grounded: true,
      answer,
      citations: state.alerts.slice(0, 3).map((a) => ({ id: a.id, label: a.headline, refType: 'alert' })),
    };
  }

  // ── Intent: why hospital critical ─────────────────────────────────────
  if (/(why).*(hospital|fuel|vargas|critical)/.test(q) || /hospital.*critical/.test(q)) {
    const alert = state.alerts.find((a) => a.id === 'hospital-fuel') ?? state.alerts[0];
    const f = alert.scoreBreakdown.factors;
    const factorLine = f.map((x) => `${x.label} ${x.rawScore}`).join(' · ');
    const answer =
      `${alert.headline} is ${alert.severity.toUpperCase()} (priority ${alert.priority}/100, confidence ${alert.confidence}%). ` +
      `Drivers — ${factorLine}. ${alert.summary} Recommended: ${alert.recommendedVerification}`;
    return {
      intent: 'why-critical',
      grounded: true,
      answer,
      citations: cite(alert.supportingReportIds.slice(0, 5)),
    };
  }

  // ── Intent: which route has conflicting reports ───────────────────────
  if (/(route|ruta|road|highway|corridor|viaduct|shelter).*(conflict|contradict|disput)/.test(q) || /(conflict|contradict).*(route|road|highway|viaduct|shelter)/.test(q)) {
    const routeContra = state.contradictions.filter((c) =>
      /route|road|highway|guaira|viaduct|tacagua|shelter|polideportivo/i.test(c.entityLabel),
    );
    const lines = routeContra.map(
      (c) => `• ${c.entityLabel}: ${c.claims.length} competing claims → "${c.favoredValueText}" favored (${c.confidence}%).`,
    );
    return {
      intent: 'route-conflicts',
      grounded: true,
      answer: routeContra.length
        ? `Conflicting route/area reports:\n${lines.join('\n')}`
        : 'No active route conflicts detected.',
      citations: routeContra.map((c) => ({ id: c.id, label: `${c.entityLabel} — ${c.predicateLabel}`, refType: 'contradiction' })),
    };
  }

  // ── Intent: what needs verification ───────────────────────────────────
  if (/(verif|verify|confirm|check)/.test(q)) {
    const needs = state.contradictions.filter((c) => c.requiresVerification);
    const lines = needs.map((c) => `• ${c.entityLabel} — ${c.verificationAction}`);
    return {
      intent: 'verification',
      grounded: true,
      answer: `${needs.length} item(s) require human verification before action:\n${lines.join('\n')}`,
      citations: needs.map((c) => ({ id: c.id, label: `${c.entityLabel} — ${c.predicateLabel}`, refType: 'contradiction' })),
    };
  }

  // ── Intent: evidence connected to an entity ───────────────────────────
  const entityMatch = state.entities.find((e) =>
    e.aliases.some((a) => q.includes(a.surfaceForm.toLowerCase())) || q.includes(e.canonicalName.toLowerCase()),
  );
  if (/(evidence|connected|related|show|all)/.test(q) && entityMatch) {
    const reps = entityMatch.reportIds;
    const claims = state.claims.filter((c) => entityMatch.mentionIds.includes(c.subjectMentionId));
    const claimLines = claims.slice(0, 6).map((c) => `• ${c.valueText} (${c.reportId})`);
    return {
      intent: 'entity-evidence',
      grounded: true,
      answer:
        `${entityMatch.canonicalName} resolves ${entityMatch.aliases.length} alias(es) across ${reps.length} report(s) at ${(entityMatch.mergeConfidence * 100).toFixed(0)}% merge confidence. Claims:\n${claimLines.join('\n')}`,
      citations: cite(reps.slice(0, 8)),
    };
  }

  // ── Intent: missing information ───────────────────────────────────────
  if (/(missing|gap|don.?t know|unknown|before acting)/.test(q)) {
    const gaps = state.alerts.flatMap((a) => a.informationGaps.map((g) => `• ${a.headline}: ${g}`));
    return {
      intent: 'information-gaps',
      grounded: true,
      answer: `Open information gaps before action:\n${gaps.slice(0, 6).join('\n')}`,
      citations: state.alerts.slice(0, 3).map((a) => ({ id: a.id, label: a.headline, refType: 'alert' })),
    };
  }

  // ── Intent: stale sources ─────────────────────────────────────────────
  if (/(stale|outdated|old)/.test(q)) {
    const stale = state.reports.filter((r) => isStale(ageMinutes(r.minutesBeforeT0, state.asOfMinutesBeforeT0)));
    const lines = stale
      .sort((a, b) => b.minutesBeforeT0 - a.minutesBeforeT0)
      .map((r) => `• ${r.id} (${r.sourceType}, ${redactedSourceName(role, r)}) — ${ageMinutes(r.minutesBeforeT0, state.asOfMinutesBeforeT0)} min old`);
    return {
      intent: 'stale-sources',
      grounded: true,
      answer: stale.length ? `Stale reports (older than the freshness threshold):\n${lines.join('\n')}` : 'No stale reports at the current cursor.',
      citations: cite(stale.map((r) => r.id).slice(0, 8)),
    };
  }

  // ── Fallback: situation overview ──────────────────────────────────────
  const top = state.alerts.slice(0, 3);
  const lines = top.map((a) => `• ${a.severity.toUpperCase()} ${a.priority} — ${a.headline} (conf ${a.confidence}%).`);
  return {
    intent: 'overview',
    grounded: true,
    answer:
      `Current picture — ${state.alerts.length} alerts, ${state.contradictions.length} truth tensions, ${state.entities.length} resolved entities.\n${lines.join('\n')}\nTry one of the suggested questions for source-grounded detail.`,
    citations: top.map((a) => ({ id: a.id, label: a.headline, refType: 'alert' })),
  };
}
