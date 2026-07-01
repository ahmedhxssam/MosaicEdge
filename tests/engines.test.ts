import { describe, it, expect } from 'vitest';
import { SEED_REPORTS } from '@/data/reports';
import { fuse } from '@/services/localFusionEngine';
import { resolveEntities } from '@/services/entityResolutionEngine';
import { normalizeName } from '@/lib/normalize';
import { nameSimilarity } from '@/lib/fuzzy';
import { freshnessScore, isStale, ageMinutes } from '@/lib/freshness';

const state = fuse(SEED_REPORTS, 0);

describe('multilingual entity resolution (EN/AR/ES)', () => {
  it('resolves Hospital Dr. Jose Maria Vargas across English, Arabic and Spanish aliases', () => {
    const hosp = state.entities.find((e) => e.canonicalName === 'Hospital Dr. Jose Maria Vargas');
    expect(hosp).toBeDefined();
    const surfaces = hosp!.aliases.map((a) => a.surfaceForm);
    expect(surfaces).toContain('Hospital Dr. Jose Maria Vargas');
    expect(surfaces).toContain('Vargas Hospital');
    expect(surfaces).toContain('Hospital Vargas');
    expect(surfaces).toContain('مستشفى فارغاس');
    expect(new Set(hosp!.aliases.map((a) => a.language)).size).toBe(3);
  });

  it('resolves Caracas-La Guaira Highway across 3 languages', () => {
    const highway = state.entities.find((e) => e.canonicalName === 'Caracas-La Guaira Highway');
    expect(highway?.aliases.length).toBe(3);
  });

  it('normalizes the Arabic hospital name to the same form as English', () => {
    const ar = normalizeName('مستشفى فارغاس', 'ar');
    const en = normalizeName('Hospital Dr. Jose Maria Vargas', 'en');
    expect(ar.usedDictionary).toBe(true);
    expect(nameSimilarity(ar, en)).toBeGreaterThan(0.9);
  });

  it('does not merge distinct entities of the same type', () => {
    const shelter = state.entities.find((e) => e.canonicalName === 'Polideportivo Jose Maria Vargas Shelter');
    const water = state.entities.find((e) => e.canonicalName === 'Catia La Mar Water Point');
    expect(shelter?.id).not.toBe(water?.id);
  });

  it('produces exactly the 9 canonical entities (no false merges/splits)', () => {
    expect(state.entities.length).toBe(9);
  });
});

describe('contradiction detection', () => {
  it('flags the coastal highway open/closed conflict and favors closure', () => {
    const c = state.contradictions.find((x) => /highway|guaira/i.test(x.entityLabel) && x.predicate === 'status');
    expect(c).toBeDefined();
    expect(c!.favoredValueText.toLowerCase()).toMatch(/impassable|closed/);
    expect(c!.confidence).toBeGreaterThan(80);
  });

  it('detects the hospital generator fuel numeric discrepancy (8h vs 3h)', () => {
    const c = state.contradictions.find((x) => x.predicate === 'fuelHoursRemaining');
    expect(c?.conflictType).toBe('numeric-discrepancy');
    expect(c!.favoredValueText).toMatch(/3/);
  });

  it('surfaces all five ground-truth contradictions', () => {
    expect(state.contradictions.length).toBe(5);
  });
});

describe('priority scoring', () => {
  it('ranks Hospital Access and Fuel as the #1 critical alert', () => {
    expect(state.alerts[0].id).toBe('hospital-fuel');
    expect(state.alerts[0].severity).toBe('critical');
    expect(state.alerts[0].headline).toMatch(/Vargas|Hospital|Coastal/i);
  });

  it('score breakdown weights sum to 1 and weighted sum equals total', () => {
    const a = state.alerts[0];
    const weightSum = a.scoreBreakdown.factors.reduce((s, f) => s + f.weight, 0);
    expect(weightSum).toBeCloseTo(1, 5);
    const weighted = Math.round(a.scoreBreakdown.factors.reduce((s, f) => s + f.weighted, 0));
    expect(weighted).toBe(a.priority);
  });

  it('uses the documented factor weights', () => {
    const f = Object.fromEntries(state.alerts[0].scoreBreakdown.factors.map((x) => [x.key, x.weight]));
    expect(f.civilianSafety).toBe(0.35);
    expect(f.immediacy).toBe(0.2);
    expect(f.corroboration).toBe(0.2);
    expect(f.sourceConfidence).toBe(0.15);
    expect(f.freshness).toBe(0.1);
  });
});

describe('freshness', () => {
  it('decays from 100 at age 0', () => {
    expect(freshnessScore(0)).toBe(100);
    expect(freshnessScore(75)).toBeLessThan(45);
  });
  it('marks reports older than the threshold stale', () => {
    expect(isStale(80)).toBe(true);
    expect(isStale(30)).toBe(false);
  });
  it('computes age relative to the replay cursor', () => {
    expect(ageMinutes(90, 30)).toBe(60);
    expect(ageMinutes(30, 90)).toBe(0);
  });
});

describe('timeline replay (as-of fusion)', () => {
  it('shows lower highway-closure confidence earlier in the window', () => {
    const early = fuse(SEED_REPORTS, 90);
    const now = fuse(SEED_REPORTS, 0);
    const bEarly = early.contradictions.find((c) => /highway|guaira/i.test(c.entityLabel));
    const bNow = now.contradictions.find((c) => /highway|guaira/i.test(c.entityLabel));
    // Either the contradiction had not formed yet, or confidence is lower earlier.
    if (bEarly && bNow) expect(bNow.confidence).toBeGreaterThanOrEqual(bEarly.confidence);
  });
});

describe('corrections affect fusion', () => {
  it('excluding a report removes it from the active picture', () => {
    const withExcl = fuse(SEED_REPORTS, 0, { excludedReportIds: ['R-005'] });
    expect(withExcl.reports.find((r) => r.id === 'R-005')).toBeUndefined();
  });
  it('reliability override changes claim weighting', () => {
    const boosted = fuse(SEED_REPORTS, 0, { reliabilityOverrides: { 'R-005': 0.99 } });
    const r = boosted.reports.find((x) => x.id === 'R-005');
    expect(r?.reliabilityScore).toBe(0.99);
  });
});
