import type { Contradiction, FusionState } from '@/types';
import { Card, Chip, ConfidenceMeter } from '@/components/ui';
import { SourceTypePill } from './chips';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Zap, CheckCircle2, AlertOctagon } from 'lucide-react';

const CONFLICT_LABELS: Record<string, string> = {
  direct: 'Direct contradiction',
  'numeric-discrepancy': 'Numeric discrepancy',
  'stale-superseded': 'Stale / superseded',
  'low-corroboration': 'Low corroboration',
};

export function TruthTensionCard({ contradiction: c, state }: { contradiction: Contradiction; state: FusionState }) {
  return (
    <Card className="overflow-hidden border-contradiction/20">
      <div className="flex items-start justify-between gap-3 border-b border-contradiction/15 bg-contradiction/5 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-contradiction/15 text-contradiction">
              <Zap size={15} />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">{c.entityLabel} — {c.predicateLabel}</h3>
              <div className="text-[11px] text-contradiction/80">{CONFLICT_LABELS[c.conflictType]}</div>
            </div>
          </div>
        </div>
        <div className="w-28 shrink-0">
          <ConfidenceMeter value={c.confidence} label="Favored" />
        </div>
      </div>

      <div className="space-y-1.5 p-4">
        {c.claims.map((cc) => {
          const favored = cc.stance === 'favored';
          return (
            <div
              key={cc.claimId}
              className={cn(
                'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-[12px]',
                favored ? 'border-verified/30 bg-verified/5' : 'border-white/5 bg-white/[0.02] opacity-80',
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                {favored ? <CheckCircle2 size={14} className="shrink-0 text-verified" /> : <AlertOctagon size={14} className="shrink-0 text-slate-500" />}
                <span className="truncate text-slate-200">{cc.valueText}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-[10px] text-slate-500">
                <SourceTypePill type={cc.sourceType} />
                <span className="font-mono">{Math.round(cc.reliability * 100)}%</span>
                <span>{timeAgo(cc.freshnessMinutes)}</span>
                <span className="hidden sm:inline">×{cc.corroboration}</span>
              </div>
            </div>
          );
        })}

        <p className="!mt-3 text-[12px] leading-relaxed text-slate-400">{c.rationale}</p>

        <div className="!mt-3 flex items-start gap-2 rounded-lg border border-high/20 bg-high/5 px-3 py-2">
          <Chip tone="high">Verify</Chip>
          <p className="text-[12px] text-slate-200">{c.verificationAction}</p>
        </div>
      </div>
    </Card>
  );
}
