import { useDelta } from '@/hooks/useFusion';
import { PageHeader, Card, PanelHeader } from '@/components/ui';
import { DELTA_KIND_META } from '@/services/deltaEngine';
import type { DeltaEntry } from '@/types';
import { GitCompareArrows } from 'lucide-react';

const ORDER: DeltaEntry['kind'][] = [
  'new-alert', 'escalated', 'de-escalated', 'new-entity-link', 'new-contradiction',
  'stale-report', 'sync-arrival', 'analyst-decision', 'suggested-verification',
];

export default function WhatChanged() {
  const delta = useDelta();
  const grouped = ORDER.map((kind) => ({ kind, items: delta.entries.filter((e) => e.kind === kind) })).filter((g) => g.items.length);

  return (
    <div>
      <PageHeader
        kicker="What Changed?"
        title={`Delta brief · T−${delta.fromMinutesBeforeT0} → now`}
        description="The reason disconnected fusion matters: on reconnect, see exactly what moved, what conflicts emerged, and what to verify."
      />
      {grouped.length === 0 && (
        <Card><div className="p-8 text-center text-sm text-slate-400">No material changes in the comparison window.</div></Card>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {grouped.map((g) => (
          <Card key={g.kind}>
            <PanelHeader
              title={<span className={DELTA_KIND_META[g.kind].tone}>{DELTA_KIND_META[g.kind].label}</span>}
              icon={<GitCompareArrows size={15} />}
              actions={<span className="font-mono text-xs text-slate-500">{g.items.length}</span>}
            />
            <div className="divide-y divide-white/5">
              {g.items.map((e, i) => (
                <div key={i} className="px-4 py-2.5">
                  <div className="text-[13px] font-medium text-slate-200">{e.title}</div>
                  <div className="mt-0.5 text-[12px] text-slate-400">{e.detail}</div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
