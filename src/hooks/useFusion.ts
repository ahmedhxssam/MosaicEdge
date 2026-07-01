import { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { fuse } from '@/services/localFusionEngine';
import { computeDelta } from '@/services/deltaEngine';
import { SEED_REPORTS } from '@/data/reports';
import type { FusionState } from '@/types';

function useOpts() {
  const reliabilityOverrides = useStore((s) => s.reliabilityOverrides);
  const excludedReportIds = useStore((s) => s.excludedReportIds);
  const reviewDecisions = useStore((s) => s.reviewDecisions);
  return { reliabilityOverrides, excludedReportIds, reviewDecisions };
}

/** The live fused picture (as of now, T0). Recomputes on any data mutation. */
export function useFusion(): FusionState {
  const rev = useStore((s) => s.rev);
  const userReports = useStore((s) => s.userReports);
  const opts = useOpts();
  return useMemo(
    () => fuse([...SEED_REPORTS, ...userReports], 0, opts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rev],
  );
}

/** A fused snapshot as of `asOf` minutes before T0 — used by Timeline Replay. */
export function useFusionAt(asOf: number): FusionState {
  const rev = useStore((s) => s.rev);
  const userReports = useStore((s) => s.userReports);
  const opts = useOpts();
  return useMemo(
    () => fuse([...SEED_REPORTS, ...userReports], asOf, opts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rev, asOf],
  );
}

export interface TrendPoint {
  label: string;
  asOf: number;
  hospital: number;
  highway: number;
  criticals: number;
  contradictions: number;
}

/** Confidence/alert trend across the replay window — for sparkline & timeline charts. */
export function useTimelineSeries(): TrendPoint[] {
  const rev = useStore((s) => s.rev);
  const userReports = useStore((s) => s.userReports);
  const opts = useOpts();
  return useMemo(() => {
    const all = [...SEED_REPORTS, ...userReports];
    const points = [120, 90, 60, 30, 0];
    return points.map((asOf) => {
      const st = fuse(all, asOf, opts);
      const hospital = st.alerts.find((a) => a.id === 'hospital-fuel')?.confidence ?? 0;
      const highway = st.contradictions.find((c) => c.id.includes('status') && /highway|guaira/i.test(c.entityLabel))?.confidence ?? 0;
      return {
        label: asOf === 0 ? 'Now' : `T−${asOf}`,
        asOf,
        hospital,
        highway,
        criticals: st.alerts.filter((a) => a.severity === 'critical').length,
        contradictions: st.contradictions.length,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rev]);
}

/** The "What Changed?" delta between the last-sync baseline and now. */
export function useDelta() {
  const rev = useStore((s) => s.rev);
  const baseline = useStore((s) => s.whatChangedBaseline);
  const userReports = useStore((s) => s.userReports);
  const corrections = useStore((s) => s.corrections);
  const syncQueue = useStore((s) => s.syncQueue);
  const opts = useOpts();
  return useMemo(() => {
    const all = [...SEED_REPORTS, ...userReports];
    const curr = fuse(all, 0, opts);
    const prev = fuse(all, baseline, opts);
    const syncArrivals = syncQueue.filter((s) => s.status === 'synced');
    return computeDelta(prev, curr, { syncArrivals, analystDecisions: corrections });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rev, baseline]);
}
