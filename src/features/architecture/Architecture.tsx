import { PageHeader, Card, Chip } from '@/components/ui';
import { useStore } from '@/store/useStore';
import { LocalDemoProvider } from '@/services/awsProvider';
import { BedrockProvider } from '@/services/bedrockProvider';
import { OpenSearchProvider } from '@/services/opensearchProvider';
import { NeptuneProvider } from '@/services/neptuneProvider';
import { GreengrassProvider } from '@/services/greengrassProvider';
import { Cpu, Cloud, ArrowRight, Server, Database, Brain, Search, Network, ShieldCheck } from 'lucide-react';

const EDGE = [
  { icon: <Server size={15} />, label: 'Local report adapters & parsing' },
  { icon: <Network size={15} />, label: 'Language normalization & entity extraction' },
  { icon: <Cpu size={15} />, label: 'Entity resolution cache + priority scoring' },
  { icon: <Database size={15} />, label: 'Local encrypted store + sync queue' },
  { icon: <ShieldCheck size={15} />, label: 'Tamper-evident audit ledger' },
];
const CLOUD = [
  { icon: <Database size={15} />, label: 'Amazon S3 — encrypted evidence & events' },
  { icon: <Brain size={15} />, label: 'Amazon Bedrock — source-grounded summaries' },
  { icon: <Search size={15} />, label: 'Amazon OpenSearch — entity correlation' },
  { icon: <Network size={15} />, label: 'Amazon Neptune — graph & link analysis' },
  { icon: <ShieldCheck size={15} />, label: 'IAM · KMS · CloudWatch · DataSync' },
];

const PROVIDERS = [LocalDemoProvider, GreengrassProvider, BedrockProvider, OpenSearchProvider, NeptuneProvider];

export default function Architecture() {
  // Subscribing forces a re-render once the async Bedrock health check resolves
  // (BedrockProvider.status() reads the same runtime state, but isn't itself reactive).
  useStore((s) => s.bedrockHealth);
  return (
    <div>
      <PageHeader kicker="Architecture" title="Edge / cloud fusion architecture" description="Everything in the demo runs on the edge node. The cloud zone is the production integration path — optional and credential-gated." />

      <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <Card className="border-accent/20">
          <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
            <Cpu size={18} className="text-accent" />
            <div><div className="text-sm font-semibold text-slate-100">Edge / Disconnected Field Node</div><div className="text-[11px] text-verified">Implemented in demo · offline-capable</div></div>
          </div>
          <div className="space-y-2 p-3">
            {EDGE.map((b) => (
              <div key={b.label} className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-[13px] text-slate-200">
                <span className="text-accent">{b.icon}</span>{b.label}
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-col items-center justify-center gap-2 px-2">
          <ArrowRight size={22} className="text-syncing" />
          <div className="rotate-0 text-center text-[10px] uppercase tracking-wide text-syncing">Store &amp; forward<br />on reconnect</div>
        </div>

        <Card className="border-white/10">
          <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
            <Cloud size={18} className="text-slate-300" />
            <div><div className="text-sm font-semibold text-slate-100">Cloud / Connected Environment</div><div className="text-[11px] text-medium">Production integration path</div></div>
          </div>
          <div className="space-y-2 p-3">
            {CLOUD.map((b) => (
              <div key={b.label} className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-[13px] text-slate-300">
                <span className="text-slate-400">{b.icon}</span>{b.label}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="border-b border-white/5 px-4 py-3 text-sm font-semibold text-slate-100">Provider status</div>
          <div className="divide-y divide-white/5">
            {PROVIDERS.map((p) => {
              const s = p.status();
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-slate-200">{s.service}</div>
                    <div className="text-[11px] text-slate-500">{s.note}</div>
                  </div>
                  <Chip tone={s.configured ? 'verified' : 'slate'}>{s.configured ? 'active' : 'optional'}</Chip>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <div className="border-b border-white/5 px-4 py-3 text-sm font-semibold text-slate-100">Implemented vs production path</div>
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <div>
              <div className="data-label mb-1.5 text-verified">Implemented (demo)</div>
              <ul className="space-y-1 text-[12px] text-slate-400">
                {['Local ingestion', 'Entity resolution', 'Conflict detection', 'Priority scoring', 'Sync queue', 'Audit chain', 'Simulated sync', 'Synthetic map & graph'].map((x) => <li key={x}>✓ {x}</li>)}
              </ul>
            </div>
            <div>
              <div className="data-label mb-1.5 text-medium">Production integration</div>
              <ul className="space-y-1 text-[12px] text-slate-400">
                {['Greengrass deployment', 'Bedrock extraction', 'Neptune graph', 'OpenSearch correlation', 'S3 persistence', 'DataSync forward', 'KMS encryption', 'IAM least-privilege', 'CloudWatch'].map((x) => <li key={x}>→ {x}</li>)}
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
