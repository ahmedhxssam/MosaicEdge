import { useStore } from '@/store/useStore';
import { PageHeader, Card, PanelHeader, Chip } from '@/components/ui';
import { ROLE_META, redactionNotice } from '@/services/roleService';
import { ShieldCheck, Lock, Eye, ScrollText } from 'lucide-react';

const TRUST = [
  'Synthetic data labeling on every record and view',
  'Local-first operating mode — no data leaves the node in demo',
  'Tamper-evident SHA-256 audit chain',
  'Source provenance preserved end-to-end',
  'Data classification tags on all sources',
  'Role-aware redaction of sensitive narratives',
  'Least-privilege architecture concept (IAM/KMS in production)',
  'Encryption at rest & in transit in production architecture',
  'Human review for low-confidence merges & contradictions',
  'No automatic irreversible actions',
  'No real-world targeting, facial recognition, or live surveillance',
];

const GUARDRAILS = [
  'Low-confidence claims cannot create a Critical alert on their own',
  'Contradictions are shown, never hidden',
  'Unverified reports are explicitly labeled',
  'No recommendation omits source provenance',
  'Analyst corrections are fully auditable',
  'Information gaps are surfaced, not glossed over',
];

export default function SecurityTrust() {
  const role = useStore((s) => s.role);
  const notice = redactionNotice(role);

  return (
    <div>
      <PageHeader kicker="Security & Trust" title="Trust, provenance & guardrails" description="Mosaic Edge is built to make uncertainty visible and decisions defensible." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <PanelHeader title="Security & trust controls" icon={<ShieldCheck size={16} />} />
          <ul className="grid gap-1.5 p-4 text-[13px] text-slate-300 sm:grid-cols-1">
            {TRUST.map((t) => <li key={t} className="flex gap-2"><span className="text-verified">✓</span>{t}</li>)}
          </ul>
        </Card>

        <div className="space-y-4">
          <Card className="border-high/20">
            <PanelHeader title="Decision guardrails" icon={<Lock size={16} />} subtitle="Hard rules enforced by the engines" />
            <ul className="space-y-1.5 p-4 text-[13px] text-slate-300">
              {GUARDRAILS.map((g) => <li key={g} className="flex gap-2"><span className="text-high">▸</span>{g}</li>)}
            </ul>
          </Card>

          <Card>
            <PanelHeader title="Role-aware data segregation" icon={<Eye size={16} />} subtitle={`Active role: ${ROLE_META[role].label}`} />
            <div className="space-y-2 p-4">
              {(Object.keys(ROLE_META) as (keyof typeof ROLE_META)[]).map((r) => (
                <div key={r} className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                  <div><div className="text-[13px] font-medium text-slate-200">{ROLE_META[r].label}</div><div className="text-[11px] text-slate-500">{ROLE_META[r].description}</div></div>
                  {r === role && <Chip tone="accent">active</Chip>}
                </div>
              ))}
              {notice && (
                <div className="flex items-start gap-2 rounded-lg border border-medium/20 bg-medium/5 px-3 py-2 text-[12px] text-medium/90">
                  <ScrollText size={14} className="mt-0.5 shrink-0" />{notice}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
