import { useStore } from '@/store/useStore';
import { PageHeader, Card, PanelHeader, Button, Chip } from '@/components/ui';
import { BookOpen, Play } from 'lucide-react';

const DEMO_STEPS = [
  ['The problem', 'Field teams receive conflicting, multilingual reports while connectivity is unreliable.'],
  ['Load scenario', 'Open Live Feed — 30 synthetic reports across HUMINT/OSINT/GEOINT/SIGINT in EN/AR/ES.'],
  ['Show fusion', 'Entity Graph: Vargas Hospital resolves 4 aliases across 3 languages; the coastal highway resolves 3.'],
  ['Show contradiction', 'Priority Queue → Truth Tensions: highway closure favored over older open-status reports.'],
  ['Show priority', 'Open the Hospital Access and Generator Fuel alert and its transparent score breakdown.'],
  ['Show risk path', 'Click “Risk path”: Hospital → coastal highway → Tacagua Viaduct → aftershock damage.'],
  ['Go offline', 'Top bar → Offline. Add a simulated report on Live Feed — it queues locally.'],
  ['Reconnect', 'Top bar → Connected. Sync & Audit → Synchronize: a verifiable receipt is issued.'],
  ['What changed', 'What Changed? shows confidence increases and why, plus the sync arrival.'],
  ['Close', 'Mosaic Edge does not pretend uncertainty does not exist — it turns fragmented evidence into a transparent, auditable decision picture.'],
];

const FEATURES = [
  'Multi-source ingestion (HUMINT/OSINT/GEOINT/SIGINT)',
  'Multilingual entity resolution (EN/AR/ES) with explainable merges',
  'Conflict-aware confidence scoring (Truth Tensions)',
  'Transparent 0–100 priority queue with full breakdown',
  'Source-attributed, exportable intelligence brief',
  'Offline mode, local sync queue & store-and-forward receipts',
  'Tamper-evident SHA-256 audit chain',
  'Interactive evidence graph + Risk Path mode',
  'Timeline replay with “why it changed”',
  'What-Changed delta brief',
  'Analyst console (source-grounded, deterministic)',
  'Human-in-the-loop corrections',
  'Role-aware redaction',
  'Evaluation metrics computed from ground truth',
  'Judge Mode walkthrough for live presentation',
];

export default function Documentation() {
  const setActiveView = useStore((s) => s.setActiveView);
  const loadDemo = useStore((s) => s.loadDemoScenario);

  return (
    <div>
      <PageHeader
        kicker="Documentation"
        title="Mosaic Edge — overview & demo"
        description="Disconnected Intelligence Fusion for Civilian Protection. Turn fragmented reports into verifiable, time-sensitive field intelligence — even when the network disappears."
        actions={<Button variant="primary" onClick={() => { loadDemo(); setActiveView('overview'); }}><Play size={14} /> Start the demo</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <PanelHeader title="3-minute demo script" icon={<Play size={16} />} />
          <ol className="space-y-2 p-4">
            {DEMO_STEPS.map(([t, d], i) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent">{i + 1}</span>
                <div><span className="text-[13px] font-semibold text-slate-100">{t}.</span> <span className="text-[13px] text-slate-400">{d}</span></div>
              </li>
            ))}
          </ol>
        </Card>

        <div className="space-y-4">
          <Card>
            <PanelHeader title="What makes it different" icon={<BookOpen size={16} />} />
            <div className="p-4 text-[13px] leading-relaxed text-slate-300">
              Most platforms produce a confident answer. Mosaic Edge shows the analyst <span className="text-slate-100">what it knows, what it doesn’t, what sources conflict, what changed, and what must be verified before action</span> — conflict-aware, provenance-first fusion that runs on a disconnected edge node.
            </div>
          </Card>
          <Card>
            <PanelHeader title="Implemented features" subtitle={`${FEATURES.length} working capabilities`} />
            <div className="flex flex-wrap gap-1.5 p-4">
              {FEATURES.map((f) => <Chip key={f} tone="slate">{f}</Chip>)}
            </div>
          </Card>
          <Card>
            <PanelHeader title="Repository docs" subtitle="Markdown in /docs" />
            <ul className="space-y-1 p-4 font-mono text-[12px] text-slate-400">
              <li>README.md — overview, setup, roadmap, ethics</li>
              <li>docs/demo-script.md — full 3-minute walkthrough</li>
              <li>docs/architecture.md — edge/cloud boundaries & AWS mapping</li>
              <li>docs/evaluation.md — ground truth & methodology</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
