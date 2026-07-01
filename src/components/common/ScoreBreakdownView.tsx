import type { ScoreBreakdown } from '@/types';
import { Meter, Tooltip } from '@/components/ui';
import { Info } from 'lucide-react';

/** Transparent factor-by-factor view of a priority score. No opaque AI scoring. */
export function ScoreBreakdownView({ breakdown, compact }: { breakdown: ScoreBreakdown; compact?: boolean }) {
  return (
    <div className="space-y-2">
      {!compact && (
        <div className="flex items-baseline justify-between">
          <span className="data-label">Priority score (weighted)</span>
          <span className="font-mono text-lg font-semibold text-slate-100">{breakdown.total}/100</span>
        </div>
      )}
      <div className="space-y-1.5">
        {breakdown.factors.map((f) => (
          <div key={f.key}>
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1 text-slate-400">
                {f.label}
                <span className="font-mono text-slate-600">×{f.weight}</span>
                <Tooltip content={f.explanation}>
                  <Info size={11} className="text-slate-600" />
                </Tooltip>
              </span>
              <span className="font-mono text-slate-300">
                {f.rawScore} <span className="text-slate-600">→ {f.weighted}</span>
              </span>
            </div>
            <Meter value={f.rawScore} className="mt-1" height={4} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-white/5 pt-1.5 text-[11px]">
        <span className="text-slate-500">Σ weighted</span>
        <span className="font-mono font-semibold text-accent">{breakdown.total}</span>
      </div>
    </div>
  );
}
