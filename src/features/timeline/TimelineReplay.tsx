import { useState } from 'react';
import { useFusionAt } from '@/hooks/useFusion';
import { PageHeader, Card, PanelHeader, SeverityBadge, Button, Chip } from '@/components/ui';
import { Basemap } from '@/components/viz/Basemap';
import { formatClock } from '@/lib/format';
import { T0_MS } from '@/data/scenario';
import { Clock, Sparkles } from 'lucide-react';

const MAX = 120;

export default function TimelineReplay() {
  const [cursor, setCursor] = useState(MAX); // minutes before T0; MAX = earliest
  const [explain, setExplain] = useState<string | null>(null);
  const state = useFusionAt(cursor);
  const earlier = useFusionAt(Math.min(MAX, cursor + 30));

  const clockIso = new Date(T0_MS - cursor * 60_000).toISOString();

  const doExplain = () => {
    const lines: string[] = [];
    for (const a of state.alerts.slice(0, 4)) {
      const prev = earlier.alerts.find((x) => x.id === a.id);
      if (prev && Math.abs(a.priority - prev.priority) >= 1) {
        lines.push(`${a.headline}: priority ${prev.priority}→${a.priority}, confidence ${prev.confidence}%→${a.confidence}%.`);
      } else if (!prev) {
        lines.push(`${a.headline}: newly surfaced at this point.`);
      }
    }
    const highwayNow = state.contradictions.find((c) => /highway|guaira/i.test(c.entityLabel));
    const highwayPrev = earlier.contradictions.find((c) => /highway|guaira/i.test(c.entityLabel));
    if (highwayNow && highwayPrev) lines.push(`Highway-closure confidence moved ${highwayPrev.confidence}% → ${highwayNow.confidence}% as corroborating reports arrived.`);
    setExplain(lines.length ? lines.join(' ') : 'No material change in this 30-minute step.');
  };

  return (
    <div>
      <PageHeader kicker="Timeline Replay" title="Replay the assessment" description="Drag the cursor to reconstruct exactly what was known — and how confidence shifted — at each point." />

      <Card className="mb-4">
        <div className="flex items-center gap-4 px-4 py-3">
          <Clock size={18} className="text-accent" />
          <input
            type="range"
            min={0}
            max={MAX}
            step={5}
            value={MAX - cursor}
            onChange={(e) => { setCursor(MAX - Number(e.target.value)); setExplain(null); }}
            className="flex-1 accent-sky-400"
          />
          <div className="w-40 text-right">
            <div className="font-mono text-lg font-semibold text-slate-100">{cursor === 0 ? 'NOW' : `T−${cursor} min`}</div>
            <div className="text-[11px] text-slate-500">{formatClock(clockIso)} · {state.reports.length} reports</div>
          </div>
          <Button size="sm" variant="primary" onClick={doExplain}><Sparkles size={14} /> Explain why it changed</Button>
        </div>
        {explain && (
          <div className="border-t border-white/5 bg-syncing/5 px-4 py-2.5 text-[13px] text-syncing/90">{explain}</div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <PanelHeader title="Picture at cursor" subtitle="Markers and risk recompute live" />
          <div className="h-[380px]"><Basemap state={state} /></div>
        </Card>
        <Card>
          <PanelHeader title="Alerts at this point" subtitle={`${state.contradictions.length} contradictions active`} />
          <div className="max-h-[380px] space-y-2 overflow-y-auto p-3">
            {state.alerts.map((a) => (
              <div key={a.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                <div className="flex items-center justify-between">
                  <SeverityBadge severity={a.severity} score={a.priority} />
                  <Chip tone="accent">{a.confidence}%</Chip>
                </div>
                <div className="mt-1 text-[13px] text-slate-200">{a.headline}</div>
              </div>
            ))}
            {state.alerts.length === 0 && <div className="p-4 text-sm text-slate-500">No alerts had formed yet at this point.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
