import { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { SEED_REPORTS } from '@/data/reports';
import { computeMetrics } from '@/services/evaluationService';
import { verifyChain } from '@/services/auditLedgerService';
import { PageHeader, Card, Button, Tooltip } from '@/components/ui';
import { BarChart3, Info, Play } from 'lucide-react';
import { cn } from '@/lib/cn';

const STATUS_HEX = { good: '#34d399', ok: '#38bdf8', warn: '#fb923c' } as const;

export default function Evaluation() {
  const userReports = useStore((s) => s.userReports);
  const auditLedger = useStore((s) => s.auditLedger);
  const syncReceipts = useStore((s) => s.syncReceipts);
  const [runId, setRunId] = useState(0);

  const metrics = useMemo(
    () =>
      computeMetrics([...SEED_REPORTS, ...userReports], {
        auditValid: verifyChain(auditLedger).valid,
        syncCompleted: syncReceipts.length > 0,
        queuePersisted: typeof localStorage !== 'undefined',
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runId, userReports.length],
  );

  return (
    <div>
      <PageHeader
        kicker="Evaluation"
        title="Synthetic-scenario metrics"
        description="Every figure is recomputed live from the seeded ground truth — nothing is hardcoded."
        actions={<Button variant="primary" onClick={() => setRunId((r) => r + 1)}><Play size={14} /> Run validation</Button>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {metrics.results.map((m) => (
          <Card key={m.key} className="p-4">
            <div className="flex items-center justify-between">
              <span className="data-label">{m.label}</span>
              <Tooltip content={m.definition}><Info size={12} className="text-slate-600" /></Tooltip>
            </div>
            <div className="mt-1.5 text-2xl font-semibold tabular-nums" style={{ color: STATUS_HEX[m.status] }}>{m.display}</div>
            {m.numerator !== undefined && m.denominator !== undefined && (
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/8">
                <div className="h-full rounded-full" style={{ width: `${(m.numerator / Math.max(1, m.denominator)) * 100}%`, background: STATUS_HEX[m.status] }} />
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <div className="border-b border-white/5 px-4 py-3 text-sm font-semibold text-slate-100 flex items-center gap-2"><BarChart3 size={16} className="text-accent" /> Method & limitations</div>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <div>
            <div className="data-label mb-1.5">Ground truth</div>
            <ul className="space-y-1 text-[12px] text-slate-400">
              <li>• 30 seed reports · 9 canonical entities · 12+ multilingual aliases</li>
              <li>• 5 labelled contradictions · 3 stale/superseded reports</li>
              <li>• 3 ground-truth critical risks</li>
              <li>• Metrics computed by pair-counting (precision/recall) vs gold clusters</li>
            </ul>
          </div>
          <div>
            <div className="data-label mb-1.5">Limitations</div>
            <ul className="space-y-1 text-[12px] text-slate-400">
              {metrics.limitations.map((l, i) => <li key={i} className={cn('flex gap-1.5')}><span className="text-slate-600">•</span>{l}</li>)}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/5 px-4 py-2 text-[11px] text-slate-600">Computed {new Date(metrics.computedAt).toLocaleString()}</div>
      </Card>
    </div>
  );
}
