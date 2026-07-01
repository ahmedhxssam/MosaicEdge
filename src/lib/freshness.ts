/**
 * Information freshness model. Recency decays exponentially; "staleness" is a
 * hard threshold used by the contradiction engine and the evaluation harness.
 */

/** Age of a report/claim (minutes) given the replay cursor (minutes before T0). */
export function ageMinutes(minutesBeforeT0: number, asOfMinutesBeforeT0: number): number {
  return Math.max(0, minutesBeforeT0 - asOfMinutesBeforeT0);
}

/** Whether an item existed at the replay cursor. */
export function existsAt(minutesBeforeT0: number, asOfMinutesBeforeT0: number): boolean {
  return minutesBeforeT0 >= asOfMinutesBeforeT0;
}

const FRESHNESS_TAU = 75;

/** Freshness score in [0,100]. 0 min old → 100; decays with a ~75 min constant. */
export function freshnessScore(age: number): number {
  return Math.round(100 * Math.exp(-age / FRESHNESS_TAU));
}

export const STALE_MINUTES = 70;

export function isStale(age: number): boolean {
  return age > STALE_MINUTES;
}
