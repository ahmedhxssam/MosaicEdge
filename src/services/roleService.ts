/**
 * Role-aware data segregation.
 *
 *  - Field Analyst : full report content + source metadata + entity context
 *  - Operations Lead: summarized products; sensitive HUMINT specifics redacted
 *  - Auditor       : full provenance, ledger, sync receipts, merge decisions
 */

import type { Report, SourceType, UserRole } from '@/types';

export const ROLE_META: Record<UserRole, { label: string; short: string; description: string }> = {
  'field-analyst': {
    label: 'Field Analyst',
    short: 'Analyst',
    description: 'Full source content, metadata and entity context.',
  },
  'operations-lead': {
    label: 'Operations Lead',
    short: 'Ops Lead',
    description: 'Summarized intelligence products; sensitive HUMINT specifics redacted.',
  },
  auditor: {
    label: 'Auditor',
    short: 'Auditor',
    description: 'Full provenance, activity log, hashes, merge decisions and sync receipts.',
  },
};

/** Source types whose specifics are sensitive and redacted for Operations Lead. */
const SENSITIVE_FOR_OPS: SourceType[] = ['HUMINT', 'SIGINT'];

export function canSeeRawNarrative(role: UserRole, sourceType: SourceType): boolean {
  if (role === 'operations-lead' && SENSITIVE_FOR_OPS.includes(sourceType)) return false;
  return true;
}

export function canSeeAuditDetail(role: UserRole): boolean {
  return role === 'auditor' || role === 'field-analyst';
}

export function redactedSourceName(role: UserRole, report: Pick<Report, 'sourceName' | 'sourceType'>): string {
  if (role === 'operations-lead' && SENSITIVE_FOR_OPS.includes(report.sourceType)) {
    return `${report.sourceType} source — redacted`;
  }
  return report.sourceName;
}

export function redactNarrative(role: UserRole, report: Pick<Report, 'rawText' | 'translatedText' | 'sourceType'>): string {
  if (!canSeeRawNarrative(role, report.sourceType)) {
    return `[${report.sourceType} narrative redacted for ${ROLE_META[role].label} — source protection]`;
  }
  return report.translatedText ?? report.rawText;
}

export function redactionNotice(role: UserRole): string | null {
  if (role === 'operations-lead') {
    return 'HUMINT/SIGINT source narratives are redacted in Operations Lead mode to preserve source protection. Conclusions, confidence and provenance counts remain visible.';
  }
  return null;
}
