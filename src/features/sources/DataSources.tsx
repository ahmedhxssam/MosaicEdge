import { useMemo, useState } from 'react';
import { useFusion } from '@/hooks/useFusion';
import { Card, PageHeader, PanelHeader, Kpi, Chip, Button, Meter, EmptyState } from '@/components/ui';
import { GDELT_MENTION_ROWS, GDELT_EVENT_ROWS, GDELT_SNAPSHOT_META } from '@/data/gdeltSnapshot';
import { summarizeImport, langName, ISO_TO_MOSAIC, joinByEventId } from '@/services/gdeltImportService';
import { normalizeMention, normalizeJoined, GDELT_TEXT_UNAVAILABLE, QUAD_CLASS_LABEL } from '@/services/gdeltNormalizationService';
import { evaluateWikiann } from '@/services/wikiannService';
import { WIKIANN_FILES } from '@/data/wikiannSample';
import { alertToCot } from '@/services/cotService';
import { Globe, Languages, Database, Radio, Download, FileWarning, ShieldCheck, Network, CheckCircle2, XCircle } from 'lucide-react';

const PROVENANCE = [
  { label: 'Synthetic Venezuela Earthquake Response Exercise', tone: 'accent' as const, desc: 'Simulated La Guaira field reports based on public June 2026 crisis context. Powers the core fusion demo.' },
  { label: 'Imported GDELT 2.0 Translingual Snapshot', tone: 'verified' as const, desc: 'Real captured OSINT mention metadata. Never merged into the synthetic scenario.' },
  { label: 'WikiANN Evaluation Dataset', tone: 'syncing' as const, desc: 'Real multilingual NER set used only to evaluate the normalizer.' },
  { label: 'CoT-Compatible Simulated Edge Event', tone: 'high' as const, desc: 'Interoperability export in MITRE Cursor-on-Target 2.0 format.' },
];

export default function DataSources() {
  const state = useFusion();
  const [cotAlertId, setCotAlertId] = useState<string | null>(null);

  const captured = GDELT_SNAPSHOT_META.capturedAt;
  const summary = useMemo(
    () =>
      summarizeImport(GDELT_MENTION_ROWS, GDELT_EVENT_ROWS, {
        capturedAt: captured,
        sourceFiles: [GDELT_SNAPSHOT_META.mentionsSourceFile, GDELT_SNAPSHOT_META.eventsSourceFile],
      }),
    [captured],
  );
  const eventById = useMemo(() => new Map(GDELT_EVENT_ROWS.map((e) => [e.globalEventId, e])), []);
  const normalized = useMemo(
    () =>
      GDELT_MENTION_ROWS.map((m) => {
        const ev = eventById.get(m.globalEventId);
        return ev
          ? normalizeJoined({ globalEventId: m.globalEventId, event: ev, mentions: [m] }, captured)
          : normalizeMention(m, captured);
      }),
    [captured, eventById],
  );
  const quadClassCounts = useMemo(() => {
    const c: Record<number, number> = {};
    for (const e of GDELT_EVENT_ROWS) c[e.quadClass] = (c[e.quadClass] ?? 0) + 1;
    return c;
  }, []);
  const avgGoldstein = useMemo(
    () => (GDELT_EVENT_ROWS.length ? GDELT_EVENT_ROWS.reduce((s, e) => s + e.goldsteinScale, 0) / GDELT_EVENT_ROWS.length : 0),
    [],
  );
  const wiki = useMemo(() => evaluateWikiann(), []);

  const langs = Object.entries(summary.languageHistogram).sort((a, b) => b[1] - a[1]);
  const maxLang = Math.max(...langs.map(([, n]) => n), 1);

  const alert = state.alerts.find((a) => a.id === cotAlertId) ?? state.alerts[0];
  const cot = useMemo(() => {
    if (!alert) return null;
    const entity = state.entities.find((e) => e.id === alert.entityIds[0]);
    const coord = entity?.coordinates;
    return alertToCot(alert, coord ? { lat: coord.lat, lng: coord.lng } : undefined, entity?.entityType ?? 'location', state.generatedAt);
  }, [alert, state]);

  const downloadCot = () => {
    if (!cot) return;
    const blob = new Blob([cot.xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cot.event.uid}.cot.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        kicker="Data & Sources"
        title="Imported data, provenance, and interoperability"
        description="Real imported datasets are labelled and kept strictly separate from the synthetic scenario. The fusion demo remains fully offline after ingestion."
      />

      {/* Provenance legend */}
      <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {PROVENANCE.map((p) => (
          <Card key={p.label} className="p-3">
            <Chip tone={p.tone}>{p.label}</Chip>
            <p className="mt-2 text-[12px] text-slate-400">{p.desc}</p>
          </Card>
        ))}
      </div>

      {/* GDELT */}
      <Card className="mb-4">
        <PanelHeader
          title="Imported GDELT 2.0 Translingual Snapshot"
          icon={<Globe size={16} className="text-verified" />}
          subtitle={`${GDELT_SNAPSHOT_META.mentionsSourceFile} + ${GDELT_SNAPSHOT_META.eventsSourceFile} · captured ${captured.slice(0, 16).replace('T', ' ')} · full snapshot, tab-delimited`}
          actions={<Chip tone="verified"><ShieldCheck size={12} /> Real import — 100% of both files</Chip>}
        />
        <div className="p-4">
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="Mentions ingested" value={`${summary.mentions} / ${GDELT_SNAPSHOT_META.totalMentions}`} icon={<Database size={15} />} hint="full source file, no subset" />
            <Kpi label="Events joined" value={`${summary.events} / ${GDELT_SNAPSHOT_META.totalEvents}`} icon={<Network size={15} />} hint={`${summary.joinedToEvents} mentions matched to an event`} />
            <Kpi label="Distinct languages" value={summary.distinctLanguages} tone="text-syncing" icon={<Languages size={15} />} />
            <Kpi label="Avg document tone" value={summary.toneRange.mean} hint={`${summary.toneRange.min} … ${summary.toneRange.max}`} />
          </div>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="Avg Goldstein scale" value={avgGoldstein.toFixed(2)} hint="cooperation (+) ↔ conflict (−)" />
            {([1, 2, 3, 4] as const).map((q) => (
              <Kpi key={q} label={QUAD_CLASS_LABEL[q]} value={quadClassCounts[q] ?? 0} hint={`CAMEO quad class ${q}`} />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <div className="data-label mb-2">Language distribution (full snapshot)</div>
              <div className="space-y-1.5">
                {langs.slice(0, 12).map(([iso, n]) => {
                  const isCore = !!ISO_TO_MOSAIC[iso];
                  return (
                    <div key={iso} className="flex items-center gap-2">
                      <span className={`w-24 shrink-0 text-[11px] ${isCore ? 'font-semibold text-accent' : 'text-slate-400'}`}>{langName(iso)}</span>
                      <Meter value={n} max={maxLang} colorHex={isCore ? '#38bdf8' : '#475569'} className="flex-1" />
                      <span className="w-6 text-right font-mono text-[11px] text-slate-500">{n}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">Highlighted = languages Mosaic Edge resolves natively (Arabic, Spanish, English). The full file spans {GDELT_SNAPSHOT_META.totalMentions} mentions across {Object.keys(GDELT_SNAPSHOT_META.languageHistogram).length} languages.</p>
            </div>
            <div>
              <div className="data-label mb-2">Top mention sources</div>
              <div className="space-y-1">
                {summary.topSources.map((s) => (
                  <div key={s.source} className="flex items-center justify-between rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-1 text-[12px]">
                    <span className="truncate text-slate-300">{s.source}</span>
                    <span className="font-mono text-slate-500">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {summary.notes.length > 0 && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-medium/20 bg-medium/5 px-3 py-2 text-[12px] text-medium/90">
              <FileWarning size={15} className="mt-0.5 shrink-0" />
              <div>{summary.notes.map((n, i) => <div key={i}>{n}</div>)}</div>
            </div>
          )}

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="text-slate-500">
                <tr className="border-b border-white/10">
                  <th className="py-1.5 pr-3 font-medium">Normalized ID</th>
                  <th className="py-1.5 pr-3 font-medium">Source</th>
                  <th className="py-1.5 pr-3 font-medium">Lang</th>
                  <th className="py-1.5 pr-3 font-medium">Actor(s)</th>
                  <th className="py-1.5 pr-3 font-medium">Geo</th>
                  <th className="py-1.5 pr-3 font-medium">Tone</th>
                  <th className="py-1.5 pr-3 font-medium">Conf.</th>
                </tr>
              </thead>
              <tbody>
                {normalized.slice(0, 15).map((r) => (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="py-1.5 pr-3 font-mono text-slate-400">{r.id}</td>
                    <td className="py-1.5 pr-3 text-slate-300">
                      <a href={r.sourceReference} target="_blank" rel="noreferrer" className="hover:text-accent">{r.sourceSystem === 'GDELT 2.0 Translingual' ? new URL(r.sourceReference!).hostname : r.sourceReference}</a>
                    </td>
                    <td className="py-1.5 pr-3"><Chip tone={r.language === 'ar' || r.language === 'es' || r.language === 'en' ? 'accent' : 'slate'}>{r.language}</Chip></td>
                    <td className="py-1.5 pr-3 text-slate-400">{r.extractedEntities.filter((e) => e.type === 'actor').map((e) => e.surfaceForm).join(', ') || '—'}</td>
                    <td className="py-1.5 pr-3 text-slate-400">{r.location ?? '—'}</td>
                    <td className="py-1.5 pr-3 font-mono text-slate-500">{r.tone}</td>
                    <td className="py-1.5 pr-3 font-mono text-slate-500">{r.confidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-slate-500">Showing 15 of {normalized.length} normalized records. {GDELT_TEXT_UNAVAILABLE} Actor/geo columns come from joined GDELT Event fields — never fabricated.</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* CoT */}
        <Card>
          <PanelHeader
            title="Cursor-on-Target export"
            icon={<Radio size={16} className="text-high" />}
            subtitle="MITRE CoT 2.0 · civilian/neutral markers only"
            actions={<Button size="sm" variant="subtle" onClick={downloadCot}><Download size={13} /> .cot.xml</Button>}
          />
          <div className="p-4">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {state.alerts.slice(0, 5).map((a) => (
                <button key={a.id} onClick={() => setCotAlertId(a.id)} className={`chip ${a.id === (alert?.id) ? 'border-high/40 bg-high/10 text-high' : 'border-white/10 bg-white/5 text-slate-400'}`}>
                  {a.headline.length > 22 ? a.headline.slice(0, 22) + '…' : a.headline}
                </button>
              ))}
            </div>
            {cot ? (
              <pre className="max-h-[260px] overflow-auto rounded-lg border border-white/10 bg-ink-950/60 p-3 text-[11px] leading-relaxed text-slate-300">{cot.xml}</pre>
            ) : (
              <EmptyState title="No geolocated alert selected" />
            )}
            <p className="mt-2 text-[11px] text-slate-500">Generated locally from the current fusion state. Labelled "CoT-Compatible Simulated Edge Event" — no live tracking or targeting.</p>
          </div>
        </Card>

        {/* WikiANN */}
        <Card>
          <PanelHeader title="WikiANN multilingual NER evaluation" icon={<Languages size={16} className="text-syncing" />} subtitle="Real parquet decoded offline · evaluation only, no model trained" />
          <div className="p-4">
            <div className="data-label mb-2">Decoded parquet attachments</div>
            <div className="space-y-1 text-[11px]">
              {WIKIANN_FILES.map((f) => (
                <div key={f.logicalName} className="rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-slate-300">{f.logicalName}</span>
                    <Chip tone={f.lang === 'es' ? 'high' : 'slate'}>{f.lang}</Chip>
                  </div>
                  <div className="text-slate-500">{f.file} · {f.rows.toLocaleString()} rows — {f.resolved}</div>
                </div>
              ))}
            </div>

            <div className="my-3 grid grid-cols-3 gap-2">
              <Kpi label="Real rows decoded" value={wiki.rows.toLocaleString()} hint="30k across en/ar/es" icon={<Database size={15} />} />
              <Kpi label="Real spans found" value={wiki.spans.toLocaleString()} hint={`PER ${wiki.byType.PER ?? 0} · ORG ${wiki.byType.ORG ?? 0} · LOC ${wiki.byType.LOC ?? 0}`} />
              <Kpi label="Live re-parsed sample" value={`${wiki.sampleRows} rows / ${wiki.sampleSpans} spans`} tone="text-syncing" hint="BIO spans extracted client-side, right now" />
            </div>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <Kpi label="es↔en normalization match" value={`${wiki.cross.matchRateEs}%`} tone="text-verified" />
              <Kpi label="ar↔en normalization match" value={`${wiki.cross.matchRateAr}%`} tone="text-high" />
            </div>

            <div className="data-label mb-1">Cross-lingual normalization (live)</div>
            <div className="space-y-0.5 text-[11px]">
              {wiki.cross.results.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-2 rounded border border-white/5 px-2 py-1">
                  <span className="truncate text-slate-400"><span className="text-slate-300">{r.en}</span> ↔ {r.variant} <span className="text-slate-600">({r.variantLang})</span></span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className="font-mono text-slate-500">{r.similarity}</span>
                    {r.matched ? <CheckCircle2 size={13} className="text-verified" /> : <XCircle size={13} className="text-slate-600" />}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Honest result: dictionary-backed Arabic terms resolve exactly (100% similarity via transliteration lookup); Spanish relies on pure fuzzy token matching across accented Latin script, which is imperfect ({wiki.cross.matchRateEs}%). Arabic terms <em>outside</em> the alias dictionary still fail to cross-match — a documented limitation and roadmap item (learnable transliteration), not hidden behind a rounded-up score.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
