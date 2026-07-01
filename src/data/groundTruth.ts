import type { EntityMention } from '@/types';
import { SEED_REPORTS } from './reports';

/**
 * Hand-labelled ground truth for the synthetic Venezuela earthquake response
 * exercise. The evaluation harness scores the live engine output against these
 * gold labels. Nothing here is read by the fusion engines themselves.
 */

/** Entity+predicate pairs that genuinely conflict and should surface as Truth Tensions. */
export const GT_CONTRADICTIONS: { entityId: string; predicate: string; note: string }[] = [
  { entityId: 'ENT-HIGHWAY', predicate: 'status', note: 'Caracas-La Guaira Highway open vs closed' },
  { entityId: 'ENT-HOSP', predicate: 'fuelHoursRemaining', note: 'Hospital generator fuel 8h vs 3h' },
  { entityId: 'ENT-SHELTER', predicate: 'status', note: 'Shelter partially-open vs closed vs capacity-only' },
  { entityId: 'ENT-HOSP', predicate: 'evacuationComplete', note: 'Hospital evacuation complete vs not complete' },
  { entityId: 'ENT-VIADUCT', predicate: 'status', note: 'Tacagua Viaduct damaged/open-route claims vs closed inspection status' },
];

/** Alert/topic ids a human analyst would deem "must not miss" (critical). */
export const GT_CRITICAL_ALERTS: string[] = ['hospital-fuel', 'evacuation-route', 'misinformation'];

/** Reports that are genuinely stale and superseded by fresher contradicting evidence. */
export const GT_STALE_REPORTS: string[] = ['R-005', 'R-007', 'R-026'];

/** Ground-truth entity clusters keyed by canonical id (mention ids that belong together). */
export function groundTruthClusters(mentions: EntityMention[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const m of mentions) {
    const arr = map.get(m.canonicalId) ?? [];
    arr.push(m.id);
    map.set(m.canonicalId, arr);
  }
  return map;
}

/** All mentions from the seed scenario (gold reference set). */
export function allSeedMentions(): EntityMention[] {
  return SEED_REPORTS.flatMap((r) => r.extractedEntities);
}

/**
 * Distinct multilingual alias surface forms in the gold set - i.e. surface
 * forms that are non-English or are spelling/transliteration variants of the
 * canonical English name. These are the hard cases for cross-language
 * resolution.
 */
export function goldMultilingualAliases(): { surfaceForm: string; canonicalId: string; language: string }[] {
  const seen = new Set<string>();
  const out: { surfaceForm: string; canonicalId: string; language: string }[] = [];
  for (const m of allSeedMentions()) {
    const key = `${m.canonicalId}::${m.surfaceForm}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const isEasyEnglish =
      m.language === 'en' &&
      ['Hospital Dr. Jose Maria Vargas', 'Caracas-La Guaira Highway', 'Tacagua Viaduct',
        'Polideportivo Jose Maria Vargas Shelter', 'Port of La Guaira Aid Staging Area',
        'La Guaira', 'Caracas Emergency Operations Center', 'Catia La Mar Water Point',
        'USAR Team 4'].includes(m.surfaceForm);
    if (!isEasyEnglish) {
      out.push({ surfaceForm: m.surfaceForm, canonicalId: m.canonicalId, language: m.language });
    }
  }
  return out;
}
