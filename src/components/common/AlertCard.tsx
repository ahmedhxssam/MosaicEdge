import { useState } from 'react';
import type { FusionState, PriorityAlert } from '@/types';
import { Card, SeverityBadge, ConfidenceMeter, Chip, Button } from '@/components/ui';
import { ScoreBreakdownView } from './ScoreBreakdownView';
import { SourceChip } from './chips';
import { useStore } from '@/store/useStore';
import { timeAgo } from '@/lib/format';
import { ageMinutes } from '@/lib/freshness';
import { ChevronDown, ChevronUp, AlertTriangle, ShieldQuestion, GitBranch, Clock3 } from 'lucide-react';
import { cn } from '@/lib/cn';

export function AlertCard({ alert, state, defaultOpen }: { alert: PriorityAlert; state: FusionState; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const openBrief = useStore((s) => s.openBrief);
  const setActiveView = useStore((s) => s.setActiveView);
  const setRiskPath = useStore((s) => s.setRiskPath);
  const reportById = new Map(state.reports.map((r) => [r.id, r]));
  const age = ageMinutes(
    Math.min(...alert.supportingReportIds.map((id) => reportById.get(id)?.minutesBeforeT0 ?? 999), 999),
    state.asOfMinutesBeforeT0,
  );

  return (
    <Card glow={alert.severity === 'critical'} className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <SeverityBadge severity={alert.severity} score={alert.priority} />
              {alert.requiresHumanReview && (
                <Chip tone="contradiction"><ShieldQuestion size={11} /> Verify</Chip>
              )}
              {alert.contradictionIds.length > 0 && (
                <Chip tone="contradiction">{alert.contradictionIds.length} tension{alert.contradictionIds.length > 1 ? 's' : ''}</Chip>
              )}
            </div>
            <h3 className="mt-2 text-base font-semibold text-slate-50">{alert.headline}</h3>
            <p className="mt-1 text-[13px] text-slate-400">{alert.summary}</p>
          </div>
          <div className="w-32 shrink-0">
            <ConfidenceMeter value={alert.confidence} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {alert.entityLabels.map((label, i) => (
            <Chip key={i} tone="accent">{label}</Chip>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
          <span className="flex items-center gap-1"><GitBranch size={12} /> {alert.supportingReportIds.length} supporting · {alert.conflictingReportIds.length} conflicting</span>
          <span className="flex items-center gap-1"><Clock3 size={12} /> updated {timeAgo(age)}</span>
        </div>

        {alert.whyChanged && (
          <div className="mt-3 rounded-lg border border-syncing/20 bg-syncing/5 px-3 py-2 text-[12px] text-syncing/90">
            <span className="font-semibold">Why it changed: </span>
            {alert.whyChanged}
          </div>
        )}

        <div className="mt-3 rounded-lg border border-high/20 bg-high/5 px-3 py-2">
          <div className="data-label text-high">Recommended verification</div>
          <p className="mt-0.5 text-[13px] text-slate-200">{alert.recommendedVerification}</p>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setOpen(!open)}>
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {open ? 'Hide' : 'Why this matters'}
          </Button>
          {alert.riskPath && (
            <Button size="sm" variant="ghost" onClick={() => { setRiskPath(alert.entityIds[0] ?? null); setActiveView('graph'); }}>
              <GitBranch size={14} /> Risk path
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => openBrief(alert.id)}>Brief</Button>
        </div>
      </div>

      {open && (
        <div className="grid gap-4 border-t border-white/5 bg-ink-950/40 p-4 md:grid-cols-2">
          <div>
            <div className="data-label mb-2">Score breakdown</div>
            <ScoreBreakdownView breakdown={alert.scoreBreakdown} compact />
          </div>
          <div className="space-y-3">
            <div>
              <div className="data-label mb-1.5">Supporting sources</div>
              <div className="flex flex-wrap gap-1.5">
                {alert.supportingReportIds.slice(0, 8).map((id) => {
                  const r = reportById.get(id);
                  return r ? <SourceChip key={id} report={r} /> : null;
                })}
              </div>
            </div>
            {alert.conflictingReportIds.length > 0 && (
              <div>
                <div className="data-label mb-1.5 text-contradiction">Contradicting sources</div>
                <div className="flex flex-wrap gap-1.5">
                  {alert.conflictingReportIds.map((id) => {
                    const r = reportById.get(id);
                    return r ? <SourceChip key={id} report={r} /> : null;
                  })}
                </div>
              </div>
            )}
            {alert.informationGaps.length > 0 && (
              <div>
                <div className="data-label mb-1 flex items-center gap-1 text-medium"><AlertTriangle size={12} /> Information gaps</div>
                <ul className="space-y-0.5 text-[12px] text-slate-400">
                  {alert.informationGaps.map((g, i) => (
                    <li key={i} className={cn('flex gap-1.5')}><span className="text-slate-600">•</span>{g}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
