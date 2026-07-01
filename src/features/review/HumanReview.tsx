import { useFusion } from '@/hooks/useFusion';
import { useStore } from '@/store/useStore';
import { PageHeader, Card, PanelHeader, Button, Chip, ConfidenceMeter } from '@/components/ui';
import { CheckCircle2, XCircle, Flag, Clock, MinusCircle, PlusCircle } from 'lucide-react';
import { CORRECTION_LABELS } from '@/store/useStore';

export default function HumanReview() {
  const state = useFusion();
  const apply = useStore((s) => s.applyCorrection);
  const corrections = useStore((s) => s.corrections);
  const reviewDecisions = useStore((s) => s.reviewDecisions);

  const mergeCandidates = state.entities.filter((e) => e.aliases.length > 1);
  const reportById = new Map(state.reports.map((r) => [r.id, r]));
  // Low-reliability or contested reports surfaced for source actions.
  const sourceActionReports = state.reports
    .filter((r) => r.reliabilityScore < 0.5 || state.contradictions.some((c) => c.claims.some((cc) => cc.reportId === r.id && cc.stance === 'contested')))
    .slice(0, 8);

  return (
    <div>
      <PageHeader kicker="Human Review" title="Human-in-the-loop corrections" description="Confirm or reject merges, mark reports outdated, adjust reliability, flag for verification. Every action is audited and feeds the confidence calculation." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <PanelHeader title="Entity merge decisions" subtitle={`${mergeCandidates.length} multi-alias clusters`} />
          <div className="divide-y divide-white/5">
            {mergeCandidates.map((e) => {
              const decision = reviewDecisions[e.dominantCanonicalId];
              return (
                <div key={e.id} className="p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-100">{e.canonicalName}</span>
                        {e.reviewStatus === 'needs-review' && <Chip tone="high"><Clock size={11} /> needs review</Chip>}
                        {decision === 'confirmed' && <Chip tone="verified">confirmed</Chip>}
                        {decision === 'rejected' && <Chip tone="critical">rejected</Chip>}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {e.aliases.map((a) => <Chip key={a.surfaceForm} tone="slate" title={a.language}>{a.surfaceForm}</Chip>)}
                      </div>
                    </div>
                    <div className="w-24 shrink-0"><ConfidenceMeter value={e.mergeConfidence * 100} label="Merge" /></div>
                  </div>
                  <ul className="mt-2 space-y-0.5 text-[11px] text-slate-500">
                    {e.mergeReasons.slice(0, 3).map((r, i) => <li key={i}>• {r.detail}</li>)}
                  </ul>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="subtle" onClick={() => apply({ type: 'confirm-merge', targetType: 'entity', targetId: e.dominantCanonicalId, targetLabel: e.canonicalName })}>
                      <CheckCircle2 size={13} /> Confirm
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => apply({ type: 'reject-merge', targetType: 'entity', targetId: e.dominantCanonicalId, targetLabel: e.canonicalName })}>
                      <XCircle size={13} /> Reject
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <PanelHeader title="Source actions" subtitle="Adjust reliability · mark outdated · flag" />
            <div className="divide-y divide-white/5">
              {sourceActionReports.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 p-3">
                  <div className="min-w-0 text-[12px]">
                    <span className="font-mono text-slate-500">{r.id}</span> <span className="text-slate-300">{r.sourceName}</span>
                    <div className="text-slate-500">rel {Math.round(r.reliabilityScore * 100)}% · {r.sourceType}</div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="ghost" title="Raise reliability" onClick={() => apply({ type: 'adjust-reliability', targetType: 'report', targetId: r.id, targetLabel: r.id, reliabilityDelta: 0.1 })}><PlusCircle size={14} /></Button>
                    <Button size="sm" variant="ghost" title="Lower reliability" onClick={() => apply({ type: 'adjust-reliability', targetType: 'report', targetId: r.id, targetLabel: r.id, reliabilityDelta: -0.1 })}><MinusCircle size={14} /></Button>
                    <Button size="sm" variant="ghost" title="Flag for verification" onClick={() => apply({ type: 'flag-verification', targetType: 'report', targetId: r.id, targetLabel: r.id })}><Flag size={14} /></Button>
                    <Button size="sm" variant="ghost" title="Mark outdated" onClick={() => apply({ type: 'mark-outdated', targetType: 'report', targetId: r.id, targetLabel: r.id })}><Clock size={14} /></Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <PanelHeader title="Recent analyst decisions" subtitle={`${corrections.length} recorded`} />
            <div className="max-h-44 space-y-1 overflow-y-auto p-3 text-[12px]">
              {corrections.length === 0 && <div className="text-slate-500">No corrections yet — actions appear here and in the audit ledger.</div>}
              {[...corrections].reverse().map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <Chip tone="slate">{CORRECTION_LABELS[c.type]}</Chip>
                  <span className="text-slate-400">{c.targetLabel}</span>
                  <span className="ml-auto text-slate-600">{c.actor}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
