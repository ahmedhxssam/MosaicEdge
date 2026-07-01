import { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useFusion } from '@/hooks/useFusion';
import { generateBrief, generateBriefMarkdown } from '@/services/briefGenerator';
import { Button, SeverityBadge, Chip } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { ROLE_META } from '@/services/roleService';
import { X, Copy, Download, Check, FileText } from 'lucide-react';

export function BriefModal() {
  const open = useStore((s) => s.briefOpen);
  const close = useStore((s) => s.closeBrief);
  const role = useStore((s) => s.role);
  const focusAlertId = useStore((s) => s.focusAlertId);
  const state = useFusion();
  const [copied, setCopied] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const alertId = activeId ?? focusAlertId ?? state.alerts[0]?.id;
  const brief = useMemo(() => (open ? generateBrief(state, role, alertId ?? undefined) : null), [open, state, role, alertId]);

  if (!open || !brief) return null;
  const md = generateBriefMarkdown(brief);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  const download = () => {
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${brief.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm" onClick={close}>
      <div className="my-6 w-full max-w-3xl panel-raised" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <FileText size={16} className="text-accent" /> Intelligence Brief
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="subtle" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy MD'}</Button>
            <Button size="sm" variant="subtle" onClick={download}><Download size={14} /> .md</Button>
            <Button size="sm" variant="ghost" onClick={() => window.print()}>Print</Button>
            <button onClick={close} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10"><X size={16} /></button>
          </div>
        </div>

        {/* Alert selector */}
        <div className="flex flex-wrap gap-1.5 border-b border-white/5 px-5 py-2">
          {state.alerts.slice(0, 7).map((a) => (
            <button key={a.id} onClick={() => setActiveId(a.id)}
              className={`chip ${a.id === alertId ? 'border-accent/40 bg-accent/10 text-accent' : 'border-white/10 bg-white/5 text-slate-400'}`}>
              {a.headline.length > 26 ? a.headline.slice(0, 26) + '…' : a.headline}
            </button>
          ))}
        </div>

        <div className="max-h-[68vh] overflow-y-auto px-6 py-5 text-sm leading-relaxed text-slate-300">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-medium">{brief.classification}</div>
          <h1 className="text-lg font-bold text-slate-50">{brief.headline}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <SeverityBadge severity={brief.urgency} />
            <Chip tone="accent">Confidence {brief.confidence}%</Chip>
            <span>{brief.operation}</span><span>·</span>
            <span>{formatDateTime(brief.generatedAt)}</span><span>·</span>
            <span>Prepared for {ROLE_META[brief.preparedBy].label}</span>
          </div>

          <Section title="Bottom line">{brief.bottomLine}</Section>

          <Section title="Key entities">
            <div className="flex flex-wrap gap-1.5">{brief.keyEntities.map((e) => <Chip key={e.id} tone="accent">{e.name} <span className="text-slate-500">· {e.type}</span></Chip>)}</div>
          </Section>

          <Section title={`Supporting sources (${brief.supportingSources.length})`}>
            <ul className="space-y-1">
              {brief.supportingSources.map((s) => (
                <li key={s.reportId} className="flex flex-wrap items-center gap-2 text-[13px]">
                  <span className="font-mono text-slate-500">{s.reportId}</span>
                  <span className="font-semibold text-slate-300">{s.sourceType}</span>
                  <span className="text-slate-400">{s.sourceName}</span>
                  <span className="text-slate-600">· rel {Math.round(s.reliability * 100)}% · {formatDateTime(s.timestamp)}</span>
                </li>
              ))}
            </ul>
          </Section>

          {brief.contradictingSources.length > 0 && (
            <Section title={`Contradicting sources (${brief.contradictingSources.length})`}>
              <ul className="space-y-1">
                {brief.contradictingSources.map((s) => (
                  <li key={s.reportId} className="flex flex-wrap items-center gap-2 text-[13px] text-contradiction/90">
                    <span className="font-mono">{s.reportId}</span><span className="font-semibold">{s.sourceType}</span>
                    <span>{s.sourceName}</span><span className="opacity-70">· rel {Math.round(s.reliability * 100)}%</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Timeline">
            <ul className="space-y-1 border-l border-white/10 pl-3">
              {brief.timeline.map((t, i) => (
                <li key={i} className="text-[13px]"><span className="font-mono text-slate-500">{formatDateTime(t.timestamp)}</span> — {t.label}</li>
              ))}
            </ul>
          </Section>

          <Section title="Recommended verification">
            <ul className="space-y-1">{brief.recommendedVerification.map((v, i) => <li key={i} className="flex gap-2 text-[13px]"><span className="text-high">☐</span>{v}</li>)}</ul>
          </Section>

          <Section title="Risks & limitations">
            <ul className="space-y-1">{brief.risksAndLimitations.map((r, i) => <li key={i} className="flex gap-2 text-[13px] text-slate-400"><span className="text-slate-600">•</span>{r}</li>)}</ul>
          </Section>

          <Section title="Source citations">
            <div className="space-y-0.5 font-mono text-[11px] text-slate-500">{brief.citations.map((c) => <div key={c.id}>{c.label}</div>)}</div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 border-t border-white/5 pt-3">
      <div className="data-label mb-1.5">{title}</div>
      {children}
    </div>
  );
}
