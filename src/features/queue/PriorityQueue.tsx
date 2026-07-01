import { useState } from 'react';
import { useFusion } from '@/hooks/useFusion';
import { useStore } from '@/store/useStore';
import { AlertCard } from '@/components/common/AlertCard';
import { TruthTensionCard } from '@/components/common/TruthTensionCard';
import { PageHeader, Segmented, Chip, Card, PanelHeader } from '@/components/ui';
import type { Severity } from '@/types';
import { Zap } from 'lucide-react';

type SevFilter = 'all' | Severity;

export default function PriorityQueue() {
  const state = useFusion();
  const focusAlertId = useStore((s) => s.focusAlertId);
  const [sev, setSev] = useState<SevFilter>('all');
  const [contraOnly, setContraOnly] = useState(false);
  const [reviewOnly, setReviewOnly] = useState(false);

  const alerts = state.alerts.filter((a) => {
    if (sev !== 'all' && a.severity !== sev) return false;
    if (contraOnly && a.contradictionIds.length === 0) return false;
    if (reviewOnly && !a.requiresHumanReview) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        kicker="Priority Queue"
        title="Ranked investigator queue"
        description="Transparent 0–100 priority: 35% civilian safety · 20% immediacy · 20% corroboration · 15% source confidence · 10% freshness."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented<SevFilter>
          size="sm"
          value={sev}
          onChange={setSev}
          options={[
            { value: 'all', label: 'All' },
            { value: 'critical', label: 'Critical', hex: '#f43f5e' },
            { value: 'high', label: 'High', hex: '#fb923c' },
            { value: 'medium', label: 'Medium', hex: '#fbbf24' },
            { value: 'low', label: 'Low', hex: '#64748b' },
          ]}
        />
        <button onClick={() => setContraOnly(!contraOnly)}>
          <Chip tone={contraOnly ? 'contradiction' : 'slate'}>Contradictions only</Chip>
        </button>
        <button onClick={() => setReviewOnly(!reviewOnly)}>
          <Chip tone={reviewOnly ? 'high' : 'slate'}>Verification required</Chip>
        </button>
        <span className="ml-auto text-xs text-slate-500">{alerts.length} of {state.alerts.length} alerts</span>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          {alerts.map((a) => (
            <AlertCard key={a.id} alert={a} state={state} defaultOpen={a.id === focusAlertId} />
          ))}
        </div>
        <div>
          <Card>
            <PanelHeader title="Truth Tensions" icon={<Zap size={16} />} subtitle={`${state.contradictions.length} active conflicts`} />
            <div className="space-y-3 p-3">
              {state.contradictions.map((c) => (
                <TruthTensionCard key={c.id} contradiction={c} state={state} />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
