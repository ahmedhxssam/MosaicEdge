/**
 * Transforms raw GDELT rows into the Mosaic Edge NormalizedReport schema.
 *
 * Honesty constraints enforced here:
 *  - No article text is fabricated. rawText stays undefined for mentions-only
 *    rows; the UI renders an explicit "unavailable" placeholder.
 *  - No entities/claims are invented from metadata (extraction would require the
 *    article body we do not have), so those arrays stay empty for mentions-only.
 *  - Every record is tagged provenance: "real-import".
 */

import type { NormalizedReport, EntityRef } from '@/types/integration';
import { sha256 } from '@/lib/sha256';
import { freshnessScore } from '@/lib/freshness';
import {
  type GdeltMentionRow,
  type GdeltEventRow,
  type JoinedGdelt,
  ISO_TO_MOSAIC,
  langName,
  parseGdeltTime,
} from './gdeltImportService';

export const GDELT_TEXT_UNAVAILABLE = 'Source text unavailable in local GDELT metadata snapshot.';

function attribution(reference: string, capturedAt: string, hasEvent: boolean): NormalizedReport['sourceAttribution'] {
  return {
    label: 'Imported GDELT 2.0 Translingual Snapshot',
    provenance: 'real-import',
    dataset: 'GDELT 2.0 Translingual Mentions',
    sourceSystem: 'GDELT Project',
    reference,
    capturedAt,
    notes: hasEvent ? undefined : 'Mentions-only metadata; no article text or Event fields.',
  };
}

function ageMinutes(fromIso: string, toIso: string): number {
  const a = Date.parse(fromIso);
  const b = Date.parse(toIso);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((b - a) / 60000));
}

/** Normalize a single GDELT mention (mentions-only path). */
export function normalizeMention(row: GdeltMentionRow, capturedAt: string): NormalizedReport {
  const timestamp = parseGdeltTime(row.mentionTimeDate);
  const language = ISO_TO_MOSAIC[row.srcLang] ?? row.srcLang;
  // GDELT extraction "Confidence" is 10–100; treat as a reliability proxy.
  const reliabilityScore = Math.max(0.1, Math.min(1, row.confidence / 100));
  const fresh = freshnessScore(ageMinutes(timestamp, capturedAt));
  const id = `GDELT-${row.globalEventId}-${row.sentenceId}`;
  const integrityHash = sha256(`${id}|${row.mentionIdentifier}|${row.mentionTimeDate}`);

  return {
    id,
    sourceType: 'GDELT_OSINT',
    sourceSystem: 'GDELT 2.0 Translingual',
    sourceReference: row.mentionIdentifier,
    language,
    timestamp,
    receivedAt: capturedAt,
    location: undefined,
    coordinates: undefined,
    rawText: undefined, // never fabricated
    translatedText: undefined,
    extractedEntities: [],
    extractedClaims: [],
    reliabilityScore: Number(reliabilityScore.toFixed(2)),
    freshnessScore: fresh,
    confidence: row.confidence,
    tone: Number(row.mentionDocTone.toFixed(2)),
    integrityHash,
    syncStatus: 'SYNCED',
    sourceAttribution: attribution(row.mentionIdentifier, capturedAt, false),
  };
}

/** Richer normalization when an Event row is joined (actors/geo/CAMEO available). */
export function normalizeJoined(j: JoinedGdelt, capturedAt: string): NormalizedReport {
  const primary = j.mentions[0];
  const base = normalizeMention(primary, capturedAt);
  const ev = j.event;
  if (!ev) return base;

  const entities: EntityRef[] = [];
  if (ev.actor1Name) entities.push({ surfaceForm: titleCase(ev.actor1Name), type: 'actor' });
  if (ev.actor2Name) entities.push({ surfaceForm: titleCase(ev.actor2Name), type: 'actor' });
  if (ev.actionGeoFullName) entities.push({ surfaceForm: ev.actionGeoFullName, type: 'location' });

  return {
    ...base,
    location: ev.actionGeoFullName || base.location,
    coordinates:
      ev.actionGeoLat != null && ev.actionGeoLong != null
        ? { lat: ev.actionGeoLat, lon: ev.actionGeoLong }
        : base.coordinates,
    extractedEntities: entities,
    tone: Number(ev.avgTone.toFixed(2)),
    reliabilityScore: Number(Math.max(base.reliabilityScore, Math.min(1, ev.numSources / 20)).toFixed(2)),
    sourceReference: ev.sourceUrl || base.sourceReference,
    sourceAttribution: { ...base.sourceAttribution, notes: undefined },
    integrityHash: sha256(`${base.id}|${ev.globalEventId}|${ev.dateAdded}`),
  };
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Human label for a GDELT QuadClass (per the codebook). */
export const QUAD_CLASS_LABEL: Record<number, string> = {
  1: 'Verbal Cooperation',
  2: 'Material Cooperation',
  3: 'Verbal Conflict',
  4: 'Material Conflict',
};

export function languageDisplay(iso: string): string {
  return langName(iso);
}
