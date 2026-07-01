import { useFusion } from '@/hooks/useFusion';
import { useStore } from '@/store/useStore';
import { PageHeader, Card, PanelHeader, Meter, Chip } from '@/components/ui';
import { GreengrassProvider } from '@/services/greengrassProvider';
import { Cpu, Battery, HardDrive, MemoryStick, Gauge, Boxes } from 'lucide-react';

export default function EdgeReadiness() {
  const state = useFusion();
  const queued = useStore((s) => s.syncQueue.filter((q) => q.status === 'queued').length);
  const networkState = useStore((s) => s.networkState);

  const profile = [
    { icon: <Cpu size={15} />, label: 'CPU', value: '8-core edge processor' },
    { icon: <MemoryStick size={15} />, label: 'Memory', value: '16 GB' },
    { icon: <HardDrive size={15} />, label: 'Local storage', value: '1 TB encrypted' },
    { icon: <Boxes size={15} />, label: 'Local capacity', value: '≈ 10,000 short reports' },
  ];

  return (
    <div>
      <PageHeader kicker="Edge Node Readiness" title="Reference deployment profile" description="Illustrative single-node profile — not measured hardware telemetry. Local processing latency below is measured live." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <PanelHeader title="Ruggedized single-node profile" icon={<Gauge size={16} />} subtitle="Reference figures · synthetic" />
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between"><span className="data-label flex items-center gap-1"><Battery size={13} /> Power draw</span><span className="font-mono text-slate-300">180 W / 500 W</span></div>
              <Meter value={180} max={500} colorHex="#34d399" className="mt-2" />
              <div className="mt-1 text-[11px] text-slate-500">36% of power budget</div>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between"><span className="data-label flex items-center gap-1"><Boxes size={13} /> Local store utilization</span><span className="font-mono text-slate-300">{state.reports.length} / 10,000</span></div>
              <Meter value={state.reports.length} max={10000} colorHex="#38bdf8" className="mt-2" />
              <div className="mt-1 text-[11px] text-slate-500">{queued} queued for sync · link {networkState}</div>
            </div>
            {profile.map((p) => (
              <div key={p.label} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 text-[13px]">
                <span className="flex items-center gap-2 text-slate-400">{p.icon} {p.label}</span>
                <span className="text-slate-200">{p.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 text-[13px]">
              <span className="flex items-center gap-2 text-slate-400"><Cpu size={15} /> Model profile</span>
              <span className="text-slate-200">Local rules + optional cloud NLP</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 text-[13px]">
              <span className="flex items-center gap-2 text-slate-400"><Gauge size={15} /> Sync health</span>
              <Chip tone={networkState === 'connected' ? 'verified' : 'syncing'}>{networkState === 'connected' ? 'healthy' : 'queued'}</Chip>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <PanelHeader title="Why edge?" icon={<Cpu size={16} />} />
            <ul className="space-y-2 p-4 text-[13px] text-slate-300">
              {['Keeps operations usable during outages', 'Limits unnecessary data transfer', 'Enables local triage in seconds', 'Maintains a local audit record', 'Supports delayed, verifiable synchronization'].map((x) => (
                <li key={x} className="flex gap-2"><span className="text-verified">✓</span>{x}</li>
              ))}
            </ul>
          </Card>
          <Card>
            <PanelHeader title="Greengrass components" subtitle={`${GreengrassProvider.components.length} edge components`} />
            <div className="space-y-1.5 p-3 font-mono text-[11px]">
              {GreengrassProvider.components.map((c) => (
                <div key={c.name} className="rounded border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
                  <div className="text-accent">{c.name}<span className="text-slate-600"> v{c.version}</span></div>
                  <div className="text-slate-500">{c.role}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
