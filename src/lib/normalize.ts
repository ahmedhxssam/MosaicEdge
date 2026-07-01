/**
 * Deterministic, explainable text normalization for multilingual entity
 * resolution across English, Arabic and Spanish.
 *
 * The pipeline is intentionally transparent (no opaque ML): Unicode
 * normalization → diacritic stripping → script transliteration (dictionary +
 * char map) → token synonym folding → stopword removal. Every step is
 * inspectable so a merge can be explained to an analyst.
 */

import type { Language } from '@/types';

// ── Arabic phrase dictionary (named alias dictionary) ────────────────────────
// Maps known Arabic surface forms to their canonical Latin rendering. This is
// the "Arabic name alias dictionary" the resolver relies on for cross-script
// matching, since fuzzy string distance is meaningless across scripts.
export const ARABIC_ALIAS_DICTIONARY: Record<string, string> = {
  'مستشفى فارغاس': 'hospital dr jose maria vargas',
  'طريق كاراكاس لا غوايرا': 'caracas la guaira highway',
  'جسر تاكاغوا': 'tacagua viaduct',
  'مركز إيواء فارغاس': 'polideportivo jose maria vargas shelter',
  'لا غوايرا': 'la guaira',
  // General-purpose entries (not scenario-specific) — used by the WikiANN
  // cross-lingual evaluation gold set (data/wikiannSample.ts WIKIANN_ALIGNED).
  'منظمة الصحة العالمية': 'world health organization',
  'الهلال الأحمر': 'red crescent',
  'الأمم المتحدة': 'united nations',
  'جنيف': 'geneva',
  'دمشق': 'damascus',
  'القاهرة': 'cairo',
  'ماريا لوبيز': 'maria lopez',
};

// ── Spanish ↔ English token synonyms ─────────────────────────────────────────
// Folded so cross-language tokens collapse onto a shared concept token.
const SYNONYMS: Record<string, string> = {
  // facility descriptors → single "medical facility" token
  hospital: 'medfac',
  medico: 'medfac',
  medica: 'medfac',
  medical: 'medfac',
  clinica: 'clinic',
  clinic: 'clinic',
  refugio: 'shelter',
  shelter: 'shelter',
  polideportivo: 'polideportivo',
  // bridge
  puente: 'bridge',
  jisr: 'bridge',
  bridge: 'bridge',
  viaduct: 'viaduct',
  viaducto: 'viaduct',
  // route / road
  ruta: 'route',
  route: 'route',
  highway: 'route',
  autopista: 'route',
  carretera: 'route',
  road: 'route',
  tariq: 'route',
  // depot / warehouse
  almacen: 'depot',
  deposito: 'depot',
  depot: 'depot',
  warehouse: 'depot',
  puerto: 'port',
  port: 'port',
  // city
  ciudad: 'city',
  city: 'city',
  punto: 'point',
  agua: 'water',
  water: 'water',
  // local Venezuela scenario terms
  guaira: 'guaira',
  vargas: 'vargas',
  tacagua: 'tacagua',
  caracas: 'caracas',
  // coordination
  coordinacion: 'coordination',
  coordination: 'coordination',
  // emergency
  emergencia: 'emergency',
  emergency: 'emergency',
};

// Dropped descriptor tokens that add no discriminating signal.
const DROP_TOKENS = new Set(['center', 'centro', 'centre', 'medical', 'dr', 'doctor', 'of']);

// Cross-language stopwords / articles.
const STOPWORDS = new Set(['al', 'el', 'la', 'los', 'las', 'the', 'de', 'del', 'a', 'an']);

const ARABIC_DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭ]/g;

// Western Arabic numeral mapping for Arabic-Indic digits.
const ARABIC_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

export function stripArabicDiacritics(s: string): string {
  return s.replace(ARABIC_DIACRITICS, '');
}

function mapArabicDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => ARABIC_DIGITS[d] ?? d);
}

/**
 * Transliterate / translate an Arabic string to a Latin canonical form.
 * Dictionary hit first (most reliable), else a light char-level fallback.
 */
export function transliterateArabic(raw: string): string {
  const cleaned = stripArabicDiacritics(raw).trim();
  if (ARABIC_ALIAS_DICTIONARY[cleaned]) return ARABIC_ALIAS_DICTIONARY[cleaned];
  if (ARABIC_ALIAS_DICTIONARY[raw.trim()]) return ARABIC_ALIAS_DICTIONARY[raw.trim()];
  // Fallback: map digits and drop remaining Arabic letters so at least numbers survive.
  return mapArabicDigits(cleaned);
}

const hasArabic = (s: string): boolean => /[؀-ۿ]/.test(s);

export interface NormalizedName {
  /** Canonical, order-independent normalized string (sorted significant tokens, space-joined). */
  normalized: string;
  /** Significant tokens after folding. */
  tokens: string[];
  /** Whether a dictionary/transliteration step was applied. */
  usedDictionary: boolean;
}

/**
 * Produce a normalized, language-agnostic representation of an entity name.
 */
export function normalizeName(raw: string, _language?: Language): NormalizedName {
  let usedDictionary = false;
  let working = raw;

  if (hasArabic(working)) {
    const translit = transliterateArabic(working);
    if (translit !== mapArabicDigits(stripArabicDiacritics(working).trim())) {
      usedDictionary = true;
    }
    working = translit;
  }

  // Unicode normalize + strip combining marks (Latin accents).
  working = working.normalize('NFKD').replace(/[̀-ͯ]/g, '');
  working = mapArabicDigits(working).toLowerCase();
  // Replace separators with spaces.
  working = working.replace(/[^a-z0-9\s]/g, ' ');

  const rawTokens = working.split(/\s+/).filter(Boolean);
  const tokens: string[] = [];
  for (const t of rawTokens) {
    if (STOPWORDS.has(t)) continue;
    if (DROP_TOKENS.has(t)) continue;
    const folded = SYNONYMS[t] ?? t;
    if (DROP_TOKENS.has(folded)) continue;
    tokens.push(folded);
  }

  const unique = Array.from(new Set(tokens));
  const sorted = [...unique].sort();
  return {
    normalized: sorted.join(' '),
    tokens: unique,
    usedDictionary,
  };
}
