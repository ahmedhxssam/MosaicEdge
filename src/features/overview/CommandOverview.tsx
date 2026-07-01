import { useFusion, useDelta, useTimelineSeries } from '@/hooks/useFusion';
import { useStore } from '@/store/useStore';
import { Card, PanelHeader, Kpi, Button, Chip, PageHeader } from '@/components/ui';
import { Basemap } from '@/components/viz/Basemap';
import { ConfidenceTrend } from '@/components/viz/Charts';
import { AlertCard } from '@/components/common/AlertCard';
import { DELTA_KIND_META } from '@/services/deltaEngine';
import { NETWORK_META, SOURCE_META } from '@/lib/format';
import {
  FileText, Network, Boxes, AlertTriangle, Zap, RefreshCw, ArrowRight, MapPin, Activity, UserCheck,
} from 'lucide-react';
import type { SourceType } from '@/types';

export default function CommandOverview() {
  const state = useFusion();
  const delta = useDelta();
  const series = useTimelineSeries();
  const networkState = useStore((s) => s.networkState);
  const queued = useStore((s) => s.syncQueue.filter((q) => q.status === 'queued').length);
  const openBrief = useStore((s) => s.openBrief);
  const openAlert = useStore((s) => s.openAlert);
  const setActiveView = useStore((s) => s.setActiveView);

  const top = state.alerts[0];
  const priorityCount = state.alerts.filter((a) => a.severity === 'critical' || a.severity === 'high').length;
  const reviews = state.entities.filter((e) => e.reviewStatus === 'needs-review').length;
  const multiAlias = state.entities.filter((e) => e.aliases.length > 1);
  const avgMerge = multiAlias.length
    ? Math.round((multiAlias.reduce((s, e) => s + e.mergeConfidence, 0) / multiAlias.length) * 100)
    : 100;

  const sourceCounts = (['HUMINT', 'OSINT', 'GEOINT', 'SIGINT'] as SourceType[]).map((t) => ({
    t,
    n: state.reports.filter((r) => r.sourceType === t).length,
  }));

  const headlineDelta = delta.entries.find((e) => e.kind === 'escalated');

  return (
    <div>
      <PageHeader
        kicker="Command Overview"
        title="Disconnected Intelligence Fusion"
        description="A provenance-first picture of the La Guaira earthquake response — what we know, what conflicts, and what to verify first."
        actions={
          <Button variant="primary" onClick={() => openBrief(top?.id)}>
            <FileText size={15} /> Generate Intelligence Brief
          </Button>
        }
      />

      {/* Headline */}
      {top && (
        <button
          onClick={() => openAlert(top.id, 'queue')}
          className="mb-4 flex w-full items-center justify-between gap-4 rounded-xl border border-critical/30 bg-gradient-to-r from-critical/10 to-transparent px-4 py-3 text-left transition-colors hover:from-critical/15"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-critical/20 text-critical animate-pulse-ring">
              <AlertTriangle size={18} />
            </span>
            <div>
              <div className="data-label text-critical">Top assessment · synthetic scenario metrics</div>
              <div className="text-[15px] font-semibold text-slate-50">
                {top.headline} — {top.whyChanged ?? top.summary}
              </div>
            </div>
          </div>
          <ArrowRight size={18} className="shrink-0 text-slate-500" />
        </button>
      )}

      {/* KPIs */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Reports processed" value={state.reports.length} icon={<FileText size={15} />} hint="across 4 source types" />
        <Kpi label="Resolved entities" value={state.entities.length} icon={<Boxes size={15} />} hint={`${multiAlias.length} multi-alias`} onClick={() => setActiveView('graph')} />
        <Kpi label="Priority alerts" value={priorityCount} tone="text-high" icon={<Activity size={15} />} onClick={() => setActiveView('queue')} />
        <Kpi label="Truth tensions" value={state.contradictions.length} tone="text-contradiction" icon={<Zap size={15} />} onClick={() => setActiveView('queue')} />
        <Kpi label="Queued for sync" value={queued} tone={queued ? 'text-syncing' : undefined} icon={<RefreshCw size={15} />} onClick={() => setActiveView('sync')} />
        <Kpi label="Entity resolution conf." value={`${avgMerge}%`} tone="text-verified" icon={<UserCheck size={15} />} onClick={() => setActiveView('review')} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Map */}
        <Card className="lg:col-span-2">
          <PanelHeader title="La Guaira earthquake response — operational picture" icon={<MapPin size={16} />} subtitle="Markers colored by current risk level · simulated local basemap" />
          <div className="h-[360px]">
            <Basemap state={state} onSelect={(id) => { useStore.getState().setRiskPath(id); setActiveView('graph'); }} />
          </div>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          <Card>
            <PanelHeader
              title="What changed since last sync"
              icon={<RefreshCw size={16} />}
              actions={<Button size="sm" variant="ghost" onClick={() => setActiveView('whatchanged')}>Open <ArrowRight size={13} /></Button>}
            />
            <div className="max-h-[150px] space-y-2 overflow-y-auto p-3 scrollfade">
              {delta.entries.slice(0, 4).map((e, i) => (
                <div key={i} className="text-[12px]">
                  <span className={`font-semibold ${DELTA_KIND_META[e.kind].tone}`}>{e.title}</span>
                  <div className="text-slate-400">{e.detail}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <PanelHeader title="Network & source health" icon={<Network size={16} />} />
            <div className="space-y-2.5 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Link state</span>
                <Chip tone={networkState === 'connected' ? 'verified' : networkState === 'degraded' ? 'high' : 'offline'}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: NETWORK_META[networkState].hex }} />
                  {NETWORK_META[networkState].label}
                </Chip>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {sourceCounts.map(({ t, n }) => (
                  <div key={t} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
                    <span className="text-[12px] font-semibold" style={{ color: SOURCE_META[t].hex }}>{t}</span>
                    <span className="font-mono text-sm text-slate-300">{n}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Pending human reviews</span>
                <Chip tone={reviews ? 'contradiction' : 'verified'}>{reviews}</Chip>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <PanelHeader title="Confidence trend" icon={<Activity size={16} />} subtitle="Replay window T−120 → now" />
          <div className="p-3">
            <ConfidenceTrend data={series} />
            <p className="mt-1 text-[11px] text-slate-500">Highway-closure confidence climbs as corroborating reports arrive.</p>
          </div>
        </Card>
        <div className="lg:col-span-2">
          {top && <AlertCard alert={top} state={state} defaultOpen />}
        </div>
      </div>
    </div>
  );
}
