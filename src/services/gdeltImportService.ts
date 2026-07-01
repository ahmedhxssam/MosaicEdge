/**
 * GDELT 2.0 import adapter.
 *
 * GDELT Event and Mention exports are TAB-delimited despite the `.CSV` extension.
 * This service parses both, joins them on GlobalEventID, preserves the raw rows,
 * and produces an import summary. Field positions follow the GDELT 2.0 Event
 * Codebook (the attached reference). No live connection is implied — this is a
 * one-shot local import of a captured snapshot.
 */

import type { GdeltImportSummary } from '@/types/integration';

// ── Mentions (16 cols) ───────────────────────────────────────────────────────
export interface GdeltMentionRow {
  globalEventId: string;
  eventTimeDate: string;
  mentionTimeDate: string;
  mentionType: number;
  mentionSourceName: string;
  mentionIdentifier: string;
  sentenceId: number;
  inRawText: boolean;
  confidence: number;
  mentionDocLen: number;
  mentionDocTone: number;
  translationInfo: string;
  srcLang: string;
}

// ── Event (61 cols) — only the fields Mosaic Edge consumes ───────────────────
export interface GdeltEventRow {
  globalEventId: string;
  day: string;
  actor1Name: string;
  actor2Name: string;
  eventCode: string;
  eventBaseCode: string;
  eventRootCode: string;
  quadClass: number;
  goldsteinScale: number;
  numMentions: number;
  numSources: number;
  numArticles: number;
  avgTone: number;
  actionGeoFullName: string;
  actionGeoLat: number | null;
  actionGeoLong: number | null;
  actionGeoFeatureId: string;
  dateAdded: string;
  sourceUrl: string;
}

const num = (v: string | undefined): number => {
  const n = Number((v ?? '').trim());
  return Number.isFinite(n) ? n : 0;
};
const numOrNull = (v: string | undefined): number | null => {
  const t = (v ?? '').trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/** srclc:xxx from MentionDocTranslationInfo, e.g. "srclc:ara;eng:GT-ARA 1.0" → "ara". */
export function parseSrcLang(info: string): string {
  const m = /srclc:([a-z]{2,3})/i.exec(info || '');
  return m ? m[1].toLowerCase() : 'eng';
}

export function parseMentions(tsv: string): GdeltMentionRow[] {
  const lines = tsv.split('\n').filter((l) => l.trim().length > 0);
  return lines.map((line) => {
    const f = line.split('\t');
    return {
      globalEventId: (f[0] ?? '').trim(),
      eventTimeDate: (f[1] ?? '').trim(),
      mentionTimeDate: (f[2] ?? '').trim(),
      mentionType: num(f[3]),
      mentionSourceName: (f[4] ?? '').trim(),
      mentionIdentifier: (f[5] ?? '').trim(),
      sentenceId: num(f[6]),
      inRawText: (f[10] ?? '').trim() === '1',
      confidence: num(f[11]),
      mentionDocLen: num(f[12]),
      mentionDocTone: num(f[13]),
      translationInfo: (f[14] ?? '').trim(),
      srcLang: parseSrcLang(f[14] ?? ''),
    };
  });
}

// GDELT 2.0 Event column indices (0-based) per the V2.0 codebook.
const EV = {
  globalEventId: 0, day: 1, actor1Name: 6, actor2Name: 16,
  eventCode: 26, eventBaseCode: 27, eventRootCode: 28, quadClass: 29, goldstein: 30,
  numMentions: 31, numSources: 32, numArticles: 33, avgTone: 34,
  actionGeoFullName: 52, actionGeoLat: 56, actionGeoLong: 57, actionGeoFeatureId: 58,
  dateAdded: 59, sourceUrl: 60,
} as const;

export function parseEvents(tsv: string): GdeltEventRow[] {
  const lines = tsv.split('\n').filter((l) => l.trim().length > 0);
  return lines.map((line) => {
    const f = line.split('\t');
    return {
      globalEventId: (f[EV.globalEventId] ?? '').trim(),
      day: (f[EV.day] ?? '').trim(),
      actor1Name: (f[EV.actor1Name] ?? '').trim(),
      actor2Name: (f[EV.actor2Name] ?? '').trim(),
      eventCode: (f[EV.eventCode] ?? '').trim(),
      eventBaseCode: (f[EV.eventBaseCode] ?? '').trim(),
      eventRootCode: (f[EV.eventRootCode] ?? '').trim(),
      quadClass: num(f[EV.quadClass]),
      goldsteinScale: num(f[EV.goldstein]),
      numMentions: num(f[EV.numMentions]),
      numSources: num(f[EV.numSources]),
      numArticles: num(f[EV.numArticles]),
      avgTone: num(f[EV.avgTone]),
      actionGeoFullName: (f[EV.actionGeoFullName] ?? '').trim(),
      actionGeoLat: numOrNull(f[EV.actionGeoLat]),
      actionGeoLong: numOrNull(f[EV.actionGeoLong]),
      actionGeoFeatureId: (f[EV.actionGeoFeatureId] ?? '').trim(),
      dateAdded: (f[EV.dateAdded] ?? '').trim(),
      sourceUrl: (f[EV.sourceUrl] ?? '').trim(),
    };
  });
}

export interface JoinedGdelt {
  event?: GdeltEventRow;
  mentions: GdeltMentionRow[];
  globalEventId: string;
}

/** Join Event ↔ Mentions on GlobalEventID. Works with mentions-only input too. */
export function joinByEventId(mentions: GdeltMentionRow[], events: GdeltEventRow[] = []): JoinedGdelt[] {
  const eventById = new Map(events.map((e) => [e.globalEventId, e]));
  const byId = new Map<string, JoinedGdelt>();
  for (const m of mentions) {
    const j = byId.get(m.globalEventId) ?? {
      globalEventId: m.globalEventId,
      event: eventById.get(m.globalEventId),
      mentions: [],
    };
    j.mentions.push(m);
    byId.set(m.globalEventId, j);
  }
  return [...byId.values()];
}

// ── ISO 639-2/3 → display + Mosaic language code ─────────────────────────────
export const LANG_NAMES: Record<string, string> = {
  ara: 'Arabic', spa: 'Spanish', eng: 'English', fra: 'French', deu: 'German',
  por: 'Portuguese', rus: 'Russian', zho: 'Chinese', ell: 'Greek', ita: 'Italian',
  hun: 'Hungarian', hye: 'Armenian', tur: 'Turkish', fas: 'Persian', urd: 'Urdu',
  nld: 'Dutch', pol: 'Polish', sqi: 'Albanian', hrv: 'Croatian', hin: 'Hindi',
  ron: 'Romanian', mkd: 'Macedonian', ces: 'Czech', ukr: 'Ukrainian', slk: 'Slovak',
  srp: 'Serbian', bos: 'Bosnian', kan: 'Kannada', cat: 'Catalan', mar: 'Marathi',
  dan: 'Danish', ind: 'Indonesian', fin: 'Finnish', slv: 'Slovenian', glg: 'Galician',
  heb: 'Hebrew', bul: 'Bulgarian', nor: 'Norwegian', kor: 'Korean', swe: 'Swedish',
  est: 'Estonian',
};

export const ISO_TO_MOSAIC: Record<string, string> = { ara: 'ar', spa: 'es', eng: 'en' };

export function langName(iso: string): string {
  return LANG_NAMES[iso] ?? iso.toUpperCase();
}

export function summarizeImport(
  mentions: GdeltMentionRow[],
  events: GdeltEventRow[],
  meta: { capturedAt: string; sourceFiles: string[] },
): GdeltImportSummary {
  const languageHistogram: Record<string, number> = {};
  const sourceCount: Record<string, number> = {};
  let toneMin = Infinity;
  let toneMax = -Infinity;
  let toneSum = 0;
  for (const m of mentions) {
    languageHistogram[m.srcLang] = (languageHistogram[m.srcLang] ?? 0) + 1;
    sourceCount[m.mentionSourceName] = (sourceCount[m.mentionSourceName] ?? 0) + 1;
    toneMin = Math.min(toneMin, m.mentionDocTone);
    toneMax = Math.max(toneMax, m.mentionDocTone);
    toneSum += m.mentionDocTone;
  }
  const eventIds = new Set(events.map((e) => e.globalEventId));
  const joined = new Set(mentions.filter((m) => eventIds.has(m.globalEventId)).map((m) => m.globalEventId));
  const topSources = Object.entries(sourceCount)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const notes: string[] = [];
  if (events.length === 0) {
    notes.push('Mentions-only snapshot: no Event export provided — actor / CAMEO / Action-geo fields are unavailable.');
  }
  notes.push('Article text is not part of GDELT metadata. Where text would appear, the UI shows "Source text unavailable in local GDELT metadata snapshot."');

  return {
    mentions: mentions.length,
    events: events.length,
    joinedToEvents: joined.size,
    distinctSources: Object.keys(sourceCount).length,
    distinctLanguages: Object.keys(languageHistogram).length,
    languageHistogram,
    topSources,
    toneRange: {
      min: mentions.length ? Number(toneMin.toFixed(2)) : 0,
      max: mentions.length ? Number(toneMax.toFixed(2)) : 0,
      mean: mentions.length ? Number((toneSum / mentions.length).toFixed(2)) : 0,
    },
    capturedAt: meta.capturedAt,
    sourceFiles: meta.sourceFiles,
    notes,
  };
}

/** Parse GDELT YYYYMMDDHHMMSS → ISO string. */
export function parseGdeltTime(stamp: string): string {
  const s = (stamp || '').trim();
  if (s.length < 14) return new Date(0).toISOString();
  const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}
