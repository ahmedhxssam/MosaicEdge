/**
 * WikiANN evaluation harness.
 *
 * Uses WikiANN strictly as an *evaluation* dataset (no training). It extracts
 * NER spans and runs the same deterministic multilingual normalizer the entity
 * resolver uses, then reports a real, live cross-lingual normalization match
 * rate. The metric is honest: Latin-script (en↔es) variants fare well; Arabic
 * cross-script matching depends on dictionary coverage, which the result
 * surfaces as a limitation rather than hiding.
 */

import { normalizeName } from '@/lib/normalize';
import { tokenSetSimilarity } from '@/lib/fuzzy';
import { WIKIANN_SAMPLE, WIKIANN_ALIGNED, WIKIANN_META, type WikiannRow } from '@/data/wikiannSample';

export interface NerSpan {
  text: string;
  type: string;
  lang: string;
}

/** Group BIO tags into entity spans. */
export function extractSpans(rows: WikiannRow[]): NerSpan[] {
  const spans: NerSpan[] = [];
  for (const row of rows) {
    let cur: { tokens: string[]; type: string } | null = null;
    const flush = () => {
      if (cur) spans.push({ text: cur.tokens.join(' '), type: cur.type, lang: row.lang });
      cur = null;
    };
    row.nerTags.forEach((tag, i) => {
      const tok = row.tokens[i];
      if (tag.startsWith('B-')) {
        flush();
        cur = { tokens: [tok], type: tag.slice(2) };
      } else if (tag.startsWith('I-') && cur) {
        cur.tokens.push(tok);
      } else {
        flush();
      }
    });
    flush();
  }
  return spans;
}

const MATCH_THRESHOLD = 0.45;

export interface CrossLingualResult {
  type: string;
  en: string;
  variant: string;
  variantLang: 'ar' | 'es';
  similarity: number;
  matched: boolean;
  viaDictionary: boolean;
}

/** Live cross-lingual normalization evaluation over the gold aligned entities. */
export function evaluateCrossLingual(): {
  results: CrossLingualResult[];
  matchRateEs: number;
  matchRateAr: number;
  overall: number;
} {
  const results: CrossLingualResult[] = [];
  for (const g of WIKIANN_ALIGNED) {
    const en = normalizeName(g.en, 'en');
    for (const [lang, variant] of [['es', g.es], ['ar', g.ar]] as const) {
      const nv = normalizeName(variant, lang);
      const sim = tokenSetSimilarity(en.tokens, nv.tokens);
      results.push({
        type: g.type,
        en: g.en,
        variant,
        variantLang: lang,
        similarity: Number(sim.toFixed(2)),
        matched: sim >= MATCH_THRESHOLD,
        viaDictionary: nv.usedDictionary,
      });
    }
  }
  const es = results.filter((r) => r.variantLang === 'es');
  const ar = results.filter((r) => r.variantLang === 'ar');
  const rate = (arr: CrossLingualResult[]) => (arr.length ? arr.filter((r) => r.matched).length / arr.length : 0);
  return {
    results,
    matchRateEs: Number((rate(es) * 100).toFixed(0)),
    matchRateAr: Number((rate(ar) * 100).toFixed(0)),
    overall: Number((rate(results) * 100).toFixed(0)),
  };
}

export interface WikiannSummary {
  /** Total real rows across the full en/ar/es parquet files (not just the embedded sample). */
  rows: number;
  /** Total real entity spans across the full 30,000-row corpus. */
  spans: number;
  byType: Record<string, number>;
  byLang: Record<string, number>;
  /** Rows/spans actually embedded client-side and re-parsed live by extractSpans(). */
  sampleRows: number;
  sampleSpans: number;
  cross: ReturnType<typeof evaluateCrossLingual>;
}

let DECODED: WikiannRow[] | null = null;
/** Wire in additional real decoded parquet rows at runtime (e.g. from a user-dropped file). */
export function loadDecodedRows(rows: WikiannRow[]): void {
  DECODED = rows;
}

export function evaluateWikiann(): WikiannSummary {
  const rows = DECODED ?? WIKIANN_SAMPLE;
  const sampleSpans = extractSpans(rows);

  // Headline totals are the REAL full-corpus stats (computed offline over all 30,000 rows,
  // not extrapolated from the small embedded sample).
  const byType: Record<string, number> = {};
  const byLang: Record<string, number> = {};
  let totalRows = 0;
  let totalSpans = 0;
  for (const lang of ['en', 'ar', 'es'] as const) {
    const m = WIKIANN_META[lang];
    totalRows += m.rows;
    totalSpans += m.spans;
    byLang[lang] = m.spans;
    for (const [t, n] of Object.entries(m.byType)) byType[t] = (byType[t] ?? 0) + n;
  }

  return {
    rows: totalRows,
    spans: totalSpans,
    byType,
    byLang,
    sampleRows: rows.length,
    sampleSpans: sampleSpans.length,
    cross: evaluateCrossLingual(),
  };
}
