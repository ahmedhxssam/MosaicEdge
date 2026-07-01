import { useMemo, useRef, useState } from 'react';
import { useFusion } from '@/hooks/useFusion';
import { useStore } from '@/store/useStore';
import { PageHeader, Card, Button, Segmented, Chip } from '@/components/ui';
import { SourceTypePill, LanguageChip, ReliabilityDot } from '@/components/common/chips';
import { redactNarrative } from '@/services/roleService';
import { timeAgo } from '@/lib/format';
import { ageMinutes } from '@/lib/freshness';
import type { Language, SourceType, Report } from '@/types';
import { CANONICAL_ENTITIES } from '@/data/entities';
import { buildRawReport } from '@/data/reports';
import { ShieldCheck, Plus, Upload, Radio, WifiOff } from 'lucide-react';

const STAGES = ['Received', 'Parsed', 'Language', 'Entities', 'Resolved', 'Claims', 'Contradictions', 'Priority', 'Sync'];

export default function LiveFeed() {
  const state = useFusion();
  const role = useStore((s) => s.role);
  const networkState = useStore((s) => s.networkState);
  const injectDemoReport = useStore((s) => s.injectDemoReport);
  const importReports = useStore((s) => s.importReports);
  const addReport = useStore((s) => s.addReport);
  const fileRef = useRef<HTMLInputElement>(null);

  const [src, setSrc] = useState<SourceType | 'all'>('all');
  const [lang, setLang] = useState<Language | 'all'>('all');
  const [showForm, setShowForm] = useState(false);

  const reports = useMemo(
    () =>
      [...state.reports]
        .filter((r) => (src === 'all' || r.sourceType === src) && (lang === 'all' || r.language === lang))
        .sort((a, b) => a.minutesBeforeT0 - b.minutesBeforeT0),
    [state.reports, src, lang],
  );

  const onUpload = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const arr: Report[] = Array.isArray(parsed) ? parsed : parsed.reports;
      if (!Array.isArray(arr)) throw new Error('Expected an array of reports');
      importReports(arr);
    } catch (e) {
      alert(`Invalid report bundle: ${(e as Error).message}`);
    }
  };

  return (
    <div>
      <PageHeader
        kicker="Live Feed"
        title="Operational intake"
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()}><Upload size={14} /> Upload JSON</Button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
            <Button size="sm" variant="ghost" onClick={() => setShowForm(!showForm)}><Plus size={14} /> Add report</Button>
            <Button size="sm" variant="primary" onClick={injectDemoReport}><Radio size={14} /> Add simulated report</Button>
          </>
        }
      />

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-verified/20 bg-verified/5 px-4 py-2.5 text-[13px] text-verified/90">
        <ShieldCheck size={16} className="shrink-0" />
        Local processing active. Core fusion (resolution · contradiction · scoring) remains available without external connectivity.
        {networkState === 'offline' && <span className="ml-auto flex items-center gap-1 text-syncing"><WifiOff size={14} /> Offline — new reports queue locally.</span>}
      </div>

      {/* Pipeline */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-1 px-4 py-3">
          <span className="data-label mr-2">Ingestion pipeline</span>
          {STAGES.map((s, i) => (
            <span key={s} className="flex items-center">
              <span className="rounded-md border border-verified/20 bg-verified/5 px-2 py-1 text-[11px] text-verified/90">{s}</span>
              {i < STAGES.length - 1 && <span className="px-1 text-slate-600">→</span>}
            </span>
          ))}
        </div>
      </Card>

      {showForm && <AddReportForm onAdd={(r) => { addReport(r); setShowForm(false); }} />}

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Segmented<SourceType | 'all'> size="sm" value={src} onChange={setSrc}
          options={[{ value: 'all', label: 'All' }, { value: 'HUMINT', label: 'HUMINT' }, { value: 'OSINT', label: 'OSINT' }, { value: 'GEOINT', label: 'GEOINT' }, { value: 'SIGINT', label: 'SIGINT' }]} />
        <Segmented<Language | 'all'> size="sm" value={lang} onChange={setLang}
          options={[{ value: 'all', label: 'All langs' }, { value: 'en', label: 'EN' }, { value: 'ar', label: 'AR' }, { value: 'es', label: 'ES' }]} />
        <span className="ml-auto text-xs text-slate-500">{reports.length} reports</span>
      </div>

      <div className="space-y-2.5">
        {reports.map((r) => {
          const age = ageMinutes(r.minutesBeforeT0, state.asOfMinutesBeforeT0);
          return (
            <Card key={r.id} className="p-3.5">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="font-mono text-slate-500">{r.id}</span>
                <SourceTypePill type={r.sourceType} />
                <LanguageChip language={r.language} />
                <span className="text-slate-400">{r.sourceName}</span>
                <ReliabilityDot tier={r.reliabilityTier} score={r.reliabilityScore} />
                <span className="text-slate-600">· {r.location}</span>
                <span className="ml-auto text-slate-500">{timeAgo(age)}</span>
                {r.unsynced && <Chip tone="syncing">queued</Chip>}
                {r.userAdded && <Chip tone="accent">new</Chip>}
              </div>
              <p className="mt-2 text-[13px] text-slate-200" dir={r.language === 'ar' ? 'rtl' : 'ltr'}>{r.rawText}</p>
              {r.translatedText && (
                <p className="mt-1 text-[12px] italic text-slate-500">↳ {redactNarrative(role, r)}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {r.extractedEntities.map((m) => (
                  <Chip key={m.id} tone="slate" title={`${m.entityType} · ${m.language}`}>{m.surfaceForm}</Chip>
                ))}
              </div>
              <div className="mt-1.5 font-mono text-[10px] text-slate-600">hash {r.integrityHash.slice(0, 16)} · {r.sourceClassification}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function AddReportForm({ onAdd }: { onAdd: (r: ReturnType<typeof toRaw>) => void }) {
  const [entityId, setEntityId] = useState('ENT-RT7');
  const [type, setType] = useState<SourceType>('HUMINT');
  const [text, setText] = useState('Field update: status nominal.');
  const ent = CANONICAL_ENTITIES.find((e) => e.id === entityId)!;
  return (
    <Card className="mb-4 p-4">
      <div className="data-label mb-2">Add simulated report (resolves against an existing entity)</div>
      <div className="grid gap-2 md:grid-cols-3">
        <select className="rounded-lg border border-white/10 bg-ink-900 px-2 py-1.5 text-sm" value={entityId} onChange={(e) => setEntityId(e.target.value)}>
          {CANONICAL_ENTITIES.map((e) => <option key={e.id} value={e.id}>{e.canonicalName}</option>)}
        </select>
        <select className="rounded-lg border border-white/10 bg-ink-900 px-2 py-1.5 text-sm" value={type} onChange={(e) => setType(e.target.value as SourceType)}>
          {(['HUMINT', 'OSINT', 'GEOINT', 'SIGINT'] as SourceType[]).map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input className="rounded-lg border border-white/10 bg-ink-900 px-2 py-1.5 text-sm md:col-span-1" value={text} onChange={(e) => setText(e.target.value)} placeholder="Report text" />
      </div>
      <div className="mt-2 flex justify-end">
        <Button size="sm" variant="primary" onClick={() => onAdd(toRaw(ent, type, text))}>Ingest</Button>
      </div>
    </Card>
  );
}

function toRaw(ent: typeof CANONICAL_ENTITIES[number], type: SourceType, text: string) {
  return {
    id: `R-${200 + Math.floor((typeof performance !== 'undefined' ? performance.now() : 0) % 800)}`,
    sourceType: type, sourceName: 'Analyst-entered', reliability: 0.78, language: 'en' as Language,
    minutesBeforeT0: 0, location: ent.canonicalName, coordEntity: ent.id, raw: text,
    classification: `SYNTHETIC // ${type} // ANALYST`, thread: 'evacuation-route',
    mentions: [{ surface: ent.canonicalName, type: ent.entityType, canonicalId: ent.id }],
    claims: [{ subjectIdx: 0, predicate: 'contextNote', value: 'analyst', valueText: text }],
  };
}

// Re-export buildRawReport usage so the form's raw shape is valid at the store boundary.
void buildRawReport;
