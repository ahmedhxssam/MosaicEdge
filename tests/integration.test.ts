import { describe, it, expect } from 'vitest';
import {
  parseMentions,
  parseEvents,
  joinByEventId,
  summarizeImport,
  parseSrcLang,
  parseGdeltTime,
} from '@/services/gdeltImportService';
import { normalizeMention, normalizeJoined } from '@/services/gdeltNormalizationService';
import { buildCotXml, fromCotXml, alertToCot, cotTypeForEntity } from '@/services/cotService';
import { evaluateWikiann, extractSpans } from '@/services/wikiannService';
import { WIKIANN_SAMPLE } from '@/data/wikiannSample';
import { GDELT_MENTION_ROWS, GDELT_SNAPSHOT_META } from '@/data/gdeltSnapshot';
import type { PriorityAlert } from '@/types';

// A tiny synthetic GDELT mentions TSV (tab-delimited, 16 cols).
const MENTION_TSV = [
  ['111', '20260630174500', '20260630174500', '1', 'example.es', 'https://example.es/a', '2', '10', '-1', '20', '1', '90', '1500', '-3.2', 'srclc:spa;eng:GT-SPA 1.0', ''].join('\t'),
  ['222', '20260630174500', '20260630174500', '1', 'example.ae', 'https://example.ae/b', '1', '5', '-1', '8', '1', '80', '900', '1.1', 'srclc:ara;eng:GT-ARA 1.0', ''].join('\t'),
].join('\n');

describe('GDELT import adapter', () => {
  it('parses tab-delimited mentions and source language', () => {
    const rows = parseMentions(MENTION_TSV);
    expect(rows).toHaveLength(2);
    expect(rows[0].mentionSourceName).toBe('example.es');
    expect(rows[0].srcLang).toBe('spa');
    expect(rows[1].srcLang).toBe('ara');
    expect(rows[0].confidence).toBe(90);
    expect(parseSrcLang('srclc:fra;eng:GT-FRA 1.0')).toBe('fra');
  });

  it('parses GDELT time to ISO', () => {
    expect(parseGdeltTime('20260630174500')).toBe('2026-06-30T17:45:00.000Z');
  });

  it('summarizes a mentions-only import with honest notes', () => {
    const rows = parseMentions(MENTION_TSV);
    const summary = summarizeImport(rows, [], { capturedAt: '2026-06-30T17:45:00.000Z', sourceFiles: ['x.CSV'] });
    expect(summary.events).toBe(0);
    expect(summary.distinctLanguages).toBe(2);
    expect(summary.notes.join(' ')).toMatch(/Mentions-only/);
  });

  it('normalizes a mention without fabricating text or entities', () => {
    const rows = parseMentions(MENTION_TSV);
    const n = normalizeMention(rows[0], '2026-06-30T17:45:00.000Z');
    expect(n.sourceType).toBe('GDELT_OSINT');
    expect(n.language).toBe('es');
    expect(n.rawText).toBeUndefined();
    expect(n.extractedEntities).toHaveLength(0);
    expect(n.sourceAttribution.provenance).toBe('real-import');
    expect(n.integrityHash).toHaveLength(64);
  });

  it('enriches when an Event row is joined', () => {
    const events = parseEvents(
      Array.from({ length: 61 }, (_, i) => {
        if (i === 0) return '111';
        if (i === 6) return 'RELIEF AGENCY';
        if (i === 52) return 'La Guaira, Venezuela';
        if (i === 56) return '10.6';
        if (i === 57) return '-66.933';
        if (i === 60) return 'https://example.es/a';
        return '0';
      }).join('\t'),
    );
    const joined = joinByEventId(parseMentions(MENTION_TSV), events);
    const withEvent = joined.find((j) => j.globalEventId === '111')!;
    const n = normalizeJoined(withEvent, '2026-06-30T17:45:00.000Z');
    expect(n.coordinates).toEqual({ lat: 10.6, lon: -66.933 });
    expect(n.extractedEntities.some((e) => e.type === 'location')).toBe(true);
  });
});

describe('Cursor-on-Target adapter', () => {
  it('round-trips a CoT event and uses non-hostile civil markers', () => {
    expect(cotTypeForEntity('facility')).toMatch(/^a-n-/);
    const alert = {
      id: 'hospital-fuel', headline: 'Hospital Access and Generator Fuel', severity: 'critical', priority: 96, confidence: 91,
      entityLabels: ['Hospital Dr. Jose Maria Vargas'], recommendedVerification: 'Confirm route.',
    } as unknown as PriorityAlert;
    const { xml, event } = alertToCot(alert, { lat: 10.604, lng: -66.936 }, 'facility', '2026-06-30T14:30:00.000Z');
    expect(xml).toContain('<event version="2.0"');
    const parsed = fromCotXml(xml);
    expect(parsed.uid).toBe(event.uid);
    expect(parsed.lat).toBeCloseTo(10.604, 3);
    expect(parsed.type).not.toContain('a-h-'); // never hostile
    expect(buildCotXml(event)).toContain('SYNTHETIC // SIMULATED');
  });
});

describe('WikiANN evaluation (honest)', () => {
  it('extracts spans and computes a live cross-lingual metric', () => {
    const spans = extractSpans(WIKIANN_SAMPLE);
    expect(spans.length).toBeGreaterThan(0);
    const s = evaluateWikiann();
    expect(s.byLang.ar).toBeGreaterThan(0);
    // Dictionary-backed Arabic terms resolve exactly; fuzzy-only Spanish normalization is imperfect.
    // Arabic terms OUTSIDE the dictionary still fail to match — an honest, documented limitation.
    expect(s.cross.matchRateAr).toBeGreaterThan(0);
    expect(s.cross.matchRateEs).toBeGreaterThan(0);
    expect(s.cross.overall).toBeGreaterThanOrEqual(0);
  });
});

describe('Data provenance separation', () => {
  it('imported GDELT rows are real and labelled, kept out of the synthetic scenario', () => {
    expect(GDELT_MENTION_ROWS.length).toBeGreaterThan(20);
    expect(GDELT_SNAPSHOT_META.kind).toBe('GDELT 2.0 Translingual Mentions + Events');
    const n = normalizeMention(GDELT_MENTION_ROWS[0], GDELT_SNAPSHOT_META.capturedAt);
    expect(n.sourceAttribution.label).toMatch(/Imported GDELT/);
  });
});
