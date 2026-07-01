import { useMemo, useState } from 'react';
import { useFusion } from '@/hooks/useFusion';
import { useStore } from '@/store/useStore';
import { EntityGraph, GraphLegend, type GraphFilters } from '@/components/viz/EntityGraph';
import { PageHeader, Card, Chip, ConfidenceMeter, PanelHeader } from '@/components/ui';
import { LanguageChip, ReliabilityDot, SourceTypePill } from '@/components/common/chips';
import { canSeeRawNarrative, redactNarrative, redactedSourceName } from '@/services/roleService';
import { ageMinutes } from '@/lib/freshness';
import { formatDateTime, timeAgo } from '@/lib/format';
import type { Contradiction, GraphNode, Report, ResolvedEntity, UserRole } from '@/types';
import { FileText, GitBranch, ShieldCheck, Zap } from 'lucide-react';

export default function EntityGraphPage() {
  const state = useFusion();
  const riskPathEntityId = useStore((s) => s.riskPathEntityId);
  const role = useStore((s) => s.role);
  const [filters, setFilters] = useState<GraphFilters>({
    showReports: true,
    riskChainOnly: false,
    contradictionsOnly: false,
    highConfidenceOnly: false,
  });
  const [selected, setSelected] = useState<GraphNode | null>(null);

  // Risk-path entity ids: the alert chain containing the focused entity (default hospital-fuel).
  const riskPathIds = useMemo(() => {
    const alert =
      state.alerts.find((a) => a.entityIds.includes(riskPathEntityId ?? '')) ??
      state.alerts.find((a) => a.id === 'hospital-fuel');
    return alert?.entityIds ?? [];
  }, [state.alerts, riskPathEntityId]);

  const selectedEntity = selected?.kind === 'entity' ? state.entities.find((e) => e.id === selected.id) : null;
  const selectedReport = selected?.kind === 'report' ? state.reports.find((r) => r.id === selected.id) : null;
  const selectedContradiction = selected?.kind === 'event' ? state.contradictions.find((c) => c.id === selected.id) : null;
  const toggle = (k: keyof GraphFilters) => setFilters((f) => ({ ...f, [k]: !f[k] }));

  return (
    <div>
      <PageHeader
        kicker="Entity Graph"
        title="Provenance evidence graph"
        description="Entities laid out by geography; edges show support, contradiction and operational dependency."
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button onClick={() => toggle('riskChainOnly')}><Chip tone={filters.riskChainOnly ? 'high' : 'slate'}><GitBranch size={11} /> Risk path only</Chip></button>
        <button onClick={() => toggle('contradictionsOnly')}><Chip tone={filters.contradictionsOnly ? 'contradiction' : 'slate'}>Unresolved contradictions</Chip></button>
        <button onClick={() => toggle('highConfidenceOnly')}><Chip tone={filters.highConfidenceOnly ? 'verified' : 'slate'}>High-confidence links</Chip></button>
        <button onClick={() => toggle('showReports')}><Chip tone={filters.showReports ? 'accent' : 'slate'}>Show reports</Chip></button>
        <span className="ml-auto"><GraphLegend /></span>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-3">
          <div className="h-[560px] grid-bg">
            <EntityGraph graph={state.graph} filters={filters} riskPathEntityIds={riskPathIds} onSelect={setSelected} selectedId={selected?.id} />
          </div>
        </Card>

        <div className="space-y-3">
          {selectedReport ? (
            <ReportInspector report={selectedReport} role={role} asOf={state.asOfMinutesBeforeT0} />
          ) : selectedEntity ? (
            <EntityInspector entity={selectedEntity} />
          ) : selectedContradiction ? (
            <ContradictionInspector contradiction={selectedContradiction} />
          ) : (
            <Card>
              <PanelHeader title="Inspect" subtitle="Click or drag any node" />
              <div className="p-4 text-sm text-slate-400">
                Click an entity to see aliases and merge reasoning. Click a report dot to see the actual report and its extracted claims. Drag nodes apart to make crossed lines easier to read.
                <div className="mt-3 rounded-lg border border-high/20 bg-high/5 p-2.5 text-[12px] text-high/90">
                  <span className="font-semibold">Risk path:</span> Vargas Hospital → coastal highway → Tacagua Viaduct → aftershock damage. Toggle “Risk path only”.
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function EntityInspector({ entity }: { entity: ResolvedEntity }) {
  return (
    <Card>
      <PanelHeader title={entity.canonicalName} subtitle={`${entity.entityType} · risk ${entity.riskLevel}`} />
      <div className="space-y-3 p-3">
        <ConfidenceMeter value={entity.mergeConfidence * 100} label="Merge confidence" />
        <div>
          <div className="data-label mb-1">Resolved aliases ({entity.aliases.length})</div>
          <div className="flex flex-wrap gap-1">
            {entity.aliases.map((a) => <Chip key={a.surfaceForm} tone="slate" title={a.language}>{a.surfaceForm}</Chip>)}
          </div>
        </div>
        <div>
          <div className="data-label mb-1">Why merged</div>
          <ul className="space-y-1 text-[12px] text-slate-400">
            {entity.mergeReasons.map((r, i) => <li key={i} className="flex gap-1.5"><span className="text-accent">•</span>{r.detail}</li>)}
          </ul>
        </div>
        <div className="text-[11px] text-slate-500">Appears in {entity.reportIds.length} report(s) · review: {entity.reviewStatus}</div>
      </div>
    </Card>
  );
}

function ReportInspector({ report, role, asOf }: { report: Report; role: UserRole; asOf: number }) {
  const age = ageMinutes(report.minutesBeforeT0, asOf);
  const narrative = redactNarrative(role, report);
  const sourceName = redactedSourceName(role, report);
  const rawVisible = canSeeRawNarrative(role, report.sourceType);
  return (
    <Card className="border-accent/20">
      <PanelHeader
        title={<span className="flex items-center gap-2"><FileText size={15} className="text-accent" /> {report.id}</span>}
        subtitle={`${report.location} · ${formatDateTime(report.timestamp)} · ${timeAgo(age)}`}
        actions={report.unsynced ? <Chip tone="syncing">queued</Chip> : <Chip tone="verified">synced</Chip>}
      />
      <div className="space-y-3 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <SourceTypePill type={report.sourceType} />
          <LanguageChip language={report.language} />
          <ReliabilityDot tier={report.reliabilityTier} score={report.reliabilityScore} />
        </div>

        <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
          <div className="data-label mb-1">Actual report</div>
          <p className="text-[13px] leading-relaxed text-slate-100" dir={report.language === 'ar' && rawVisible ? 'rtl' : 'ltr'}>
            {rawVisible ? report.rawText : narrative}
          </p>
          {rawVisible && report.translatedText && (
            <p className="mt-2 border-t border-white/5 pt-2 text-[12px] italic leading-relaxed text-slate-400">{narrative}</p>
          )}
        </div>

        <div>
          <div className="data-label mb-1">Source breakdown</div>
          <div className="grid gap-1.5 text-[12px]">
            <InfoRow label="Source" value={sourceName} />
            <InfoRow label="Reliability" value={`${Math.round(report.reliabilityScore * 100)}% · ${report.reliabilityTier}`} />
            <InfoRow label="Classification" value={report.sourceClassification} />
            <InfoRow label="Thread" value={report.threadId} />
          </div>
        </div>

        <div>
          <div className="data-label mb-1">Extracted claims ({report.extractedClaims.length})</div>
          <div className="space-y-1.5">
            {report.extractedClaims.map((claim) => (
              <div key={claim.id} className="rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-[12px]">
                <div className="text-slate-200">{claim.valueText}</div>
                <div className="mt-0.5 font-mono text-[10px] text-slate-600">{claim.predicate} · extraction {Math.round(claim.extractedConfidence * 100)}%</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="data-label mb-1">Entities mentioned</div>
          <div className="flex flex-wrap gap-1">
            {report.extractedEntities.map((m) => <Chip key={m.id} tone="slate" title={`${m.entityType} · ${m.language}`}>{m.surfaceForm}</Chip>)}
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-verified/20 bg-verified/5 px-3 py-2">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-verified" />
          <div className="min-w-0 text-[11px] text-slate-400">
            <div className="text-verified">Integrity hash</div>
            <div className="truncate font-mono text-slate-500">{report.integrityHash}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ContradictionInspector({ contradiction }: { contradiction: Contradiction }) {
  return (
    <Card className="border-contradiction/20">
      <PanelHeader
        title={<span className="flex items-center gap-2"><Zap size={15} className="text-contradiction" /> Truth Tension</span>}
        subtitle={`${contradiction.entityLabel} · ${contradiction.predicateLabel}`}
      />
      <div className="space-y-3 p-3">
        <ConfidenceMeter value={contradiction.confidence} label="Favored interpretation" />
        <div className="rounded-lg border border-contradiction/20 bg-contradiction/5 p-3 text-[13px] text-slate-200">
          {contradiction.rationale}
        </div>
        <div>
          <div className="data-label mb-1">Competing claims</div>
          <div className="space-y-1.5">
            {contradiction.claims.map((claim) => (
              <div key={claim.claimId} className="flex items-center justify-between gap-2 rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-[12px]">
                <span className="min-w-0 truncate text-slate-300">{claim.valueText}</span>
                <Chip tone={claim.stance === 'favored' ? 'verified' : 'contradiction'}>{claim.stance}</Chip>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
      <span className="text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-right text-slate-300">{value}</span>
    </div>
  );
}
