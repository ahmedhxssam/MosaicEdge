/**
 * Explainable intelligence-brief generator. Produces a fully source-attributed
 * product (headline, urgency, confidence, supporting & contradicting sources,
 * entities, timeline, recommended verification, risks/limitations, citations)
 * and a Markdown rendering for export / print.
 */

import type { FusionState, IntelligenceBrief, Report, UserRole } from '@/types';
import { OPERATION } from '@/data/scenario';
import { formatDateTime } from '@/lib/format';
import { redactedSourceName } from './roleService';

function reportMeta(report: Report, role: UserRole) {
  return {
    reportId: report.id,
    sourceName: redactedSourceName(role, report),
    sourceType: report.sourceType,
    reliability: report.reliabilityScore,
    timestamp: report.timestamp,
  };
}

export function generateBrief(state: FusionState, role: UserRole, focusAlertId?: string): IntelligenceBrief {
  const alert = (focusAlertId && state.alerts.find((a) => a.id === focusAlertId)) || state.alerts[0];
  const reportById = new Map(state.reports.map((r) => [r.id, r]));

  const supporting = alert.supportingReportIds
    .map((id) => reportById.get(id))
    .filter((r): r is Report => Boolean(r))
    .sort((a, b) => a.minutesBeforeT0 - b.minutesBeforeT0)
    .slice(0, 8)
    .map((r) => reportMeta(r, role));

  const contradicting = alert.conflictingReportIds
    .map((id) => reportById.get(id))
    .filter((r): r is Report => Boolean(r))
    .map((r) => reportMeta(r, role));

  const keyEntities = alert.entityIds
    .map((id) => state.entities.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => Boolean(e))
    .map((e) => ({ id: e.id, name: e.canonicalName, type: e.entityType }));

  const relevantReports = [...new Set([...alert.supportingReportIds, ...alert.conflictingReportIds])]
    .map((id) => reportById.get(id))
    .filter((r): r is Report => Boolean(r))
    .sort((a, b) => b.minutesBeforeT0 - a.minutesBeforeT0);

  const timeline = relevantReports.map((r) => ({
    timestamp: r.timestamp,
    label: `${r.sourceType} · ${redactedSourceName(role, r)}: ${r.extractedClaims[0]?.valueText ?? r.location}`,
  }));

  const relevantContradictions = state.contradictions.filter((c) => alert.contradictionIds.includes(c.id));

  const recommendedVerification = [
    alert.recommendedVerification,
    ...relevantContradictions.map((c) => c.verificationAction),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  const risksAndLimitations = [
    ...alert.informationGaps,
    ...(contradicting.length > 0
      ? [`${contradicting.length} contradicting source(s) remain unresolved — see Truth Tensions.`]
      : []),
    'Assessment is built from synthetic demo data and must be field-verified before action.',
    'Low-confidence and uncorroborated claims are excluded from creating critical alerts on their own.',
  ];

  const citations = relevantReports.map((r) => ({
    id: r.id,
    label: `${r.id} · ${r.sourceType} · ${redactedSourceName(role, r)} · ${formatDateTime(r.timestamp)}`,
  }));

  const bottomLine = buildBottomLine(state, alert.id);

  return {
    id: `BRIEF-${alert.id}-${state.generatedAt.slice(11, 16).replace(':', '')}`,
    generatedAt: state.generatedAt,
    operation: OPERATION.name,
    classification: OPERATION.classification,
    headline: alert.headline,
    urgency: alert.severity,
    confidence: alert.confidence,
    bottomLine,
    supportingSources: supporting,
    contradictingSources: contradicting,
    keyEntities,
    timeline,
    recommendedVerification,
    risksAndLimitations,
    citations,
    preparedBy: role,
  };
}

function buildBottomLine(state: FusionState, alertId: string): string {
  const alert = state.alerts.find((a) => a.id === alertId)!;
  const contra = state.contradictions.filter((c) => alert.contradictionIds.includes(c.id));
  const parts = [`${alert.summary}`];
  if (contra.length) {
    const top = contra[0];
    parts.push(`${top.entityLabel}: "${top.favoredValueText}" is favored at ${top.confidence}% confidence.`);
  }
  parts.push(`Recommended next step: ${alert.recommendedVerification}`);
  return parts.join(' ');
}

export function generateBriefMarkdown(brief: IntelligenceBrief): string {
  const lines: string[] = [];
  lines.push(`# Intelligence Brief — ${brief.headline}`);
  lines.push('');
  lines.push(`> **${brief.classification}**`);
  lines.push('');
  lines.push(`- **Operation:** ${brief.operation}`);
  lines.push(`- **Generated:** ${formatDateTime(brief.generatedAt)}`);
  lines.push(`- **Prepared for:** ${brief.preparedBy}`);
  lines.push(`- **Operational urgency:** ${brief.urgency.toUpperCase()}`);
  lines.push(`- **Confidence:** ${brief.confidence}%`);
  lines.push('');
  lines.push('## Bottom line');
  lines.push(brief.bottomLine);
  lines.push('');
  lines.push('## Key entities');
  for (const e of brief.keyEntities) lines.push(`- **${e.name}** (${e.type})`);
  lines.push('');
  lines.push('## Supporting sources');
  for (const s of brief.supportingSources)
    lines.push(`- \`${s.reportId}\` — ${s.sourceType} · ${s.sourceName} · reliability ${(s.reliability * 100).toFixed(0)}% · ${formatDateTime(s.timestamp)}`);
  if (brief.contradictingSources.length) {
    lines.push('');
    lines.push('## Contradicting sources');
    for (const s of brief.contradictingSources)
      lines.push(`- \`${s.reportId}\` — ${s.sourceType} · ${s.sourceName} · reliability ${(s.reliability * 100).toFixed(0)}% · ${formatDateTime(s.timestamp)}`);
  }
  lines.push('');
  lines.push('## Timeline');
  for (const t of brief.timeline) lines.push(`- ${formatDateTime(t.timestamp)} — ${t.label}`);
  lines.push('');
  lines.push('## Recommended verification');
  for (const v of brief.recommendedVerification) lines.push(`- [ ] ${v}`);
  lines.push('');
  lines.push('## Risks & limitations');
  for (const r of brief.risksAndLimitations) lines.push(`- ${r}`);
  lines.push('');
  lines.push('## Source citations');
  for (const c of brief.citations) lines.push(`- ${c.label}`);
  lines.push('');
  lines.push('---');
  lines.push('_Generated locally by Mosaic Edge · provenance-first fusion · synthetic demo data._');
  return lines.join('\n');
}
