import { useState } from 'react';
import { useFusion, useDelta } from '@/hooks/useFusion';
import { useStore } from '@/store/useStore';
import { answerQuery, SUGGESTED_QUESTIONS, type ConsoleCitation, type ConsoleResponse } from '@/services/analystConsoleEngine';
import { BedrockProvider } from '@/services/bedrockProvider';
import { PageHeader, Card, Button, Chip } from '@/components/ui';
import { TerminalSquare, Send, Quote, Cloud, Loader2 } from 'lucide-react';

interface Turn { q: string; r: ConsoleResponse; live: boolean; liveError?: string; }

/** Build a minimal, cited fact context from the current fusion state — never the full dataset. */
function buildBedrockContext(state: ReturnType<typeof useFusion>) {
  const alerts = state.alerts.slice(0, 6);
  const contradictions = state.contradictions.slice(0, 6);
  const reports = state.reports.slice(0, 10);
  const entities = state.entities.slice(0, 8);
  const facts = [
    ...alerts.map((a) => `[${a.id}] ALERT ${a.severity.toUpperCase()} priority ${a.priority}/100, confidence ${a.confidence}%: ${a.headline} — ${a.summary}`),
    ...contradictions.map((c) => `[${c.id}] CONTRADICTION on ${c.entityLabel} ${c.predicateLabel}: favored "${c.favoredValueText}" at ${c.confidence}% confidence`),
    ...reports.map((r) => `[${r.id}] REPORT ${r.sourceType}/${r.language}: ${(r.translatedText ?? r.rawText).slice(0, 180)}`),
    ...entities.map((e) => `[${e.id}] ENTITY ${e.canonicalName} — ${e.aliases.length} alias(es), merge confidence ${(e.mergeConfidence * 100).toFixed(0)}%`),
  ];
  return {
    reportIds: reports.map((r) => r.id),
    alertIds: alerts.map((a) => a.id),
    entityIds: entities.map((e) => e.id),
    facts,
  };
}

export default function AnalystConsole() {
  const state = useFusion();
  const delta = useDelta();
  const role = useStore((s) => s.role);
  const openAlert = useStore((s) => s.openAlert);
  const setActiveView = useStore((s) => s.setActiveView);
  const bedrockHealth = useStore((s) => s.bedrockHealth);
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);

  const citeAny = (ids: string[]): ConsoleCitation[] =>
    ids
      .map((id): ConsoleCitation | null => {
        const report = state.reports.find((r) => r.id === id);
        if (report) return { id, label: `${id} · ${report.sourceType}`, refType: 'report' };
        const alert = state.alerts.find((a) => a.id === id);
        if (alert) return { id, label: alert.headline, refType: 'alert' };
        const contradiction = state.contradictions.find((c) => c.id === id);
        if (contradiction) return { id, label: `${contradiction.entityLabel} — ${contradiction.predicateLabel}`, refType: 'contradiction' };
        const entity = state.entities.find((e) => e.id === id);
        if (entity) return { id, label: entity.canonicalName, refType: 'entity' };
        return null;
      })
      .filter((c): c is ConsoleCitation => c !== null);

  const ask = async (q: string) => {
    if (!q.trim() || pending) return;
    setInput('');

    if (bedrockHealth.configured) {
      setPending(true);
      try {
        const context = buildBedrockContext(state);
        const live = await BedrockProvider.summarize({ question: q, context });
        const r: ConsoleResponse = {
          intent: 'bedrock-live',
          answer: live.answer,
          citations: citeAny(live.citations),
          grounded: live.citations.length > 0,
        };
        setTurns((t) => [{ q, r, live: true }, ...t]);
      } catch (err) {
        const r = answerQuery({ state, query: q, role, delta });
        setTurns((t) => [{ q, r, live: false, liveError: String((err as Error)?.message ?? err) }, ...t]);
      } finally {
        setPending(false);
      }
      return;
    }

    const r = answerQuery({ state, query: q, role, delta });
    setTurns((t) => [{ q, r, live: false }, ...t]);
  };

  return (
    <div>
      <PageHeader
        kicker="Analyst Console"
        title="Guided, source-grounded queries"
        description="Not an open chatbot — every answer is grounded in current reports and returns clickable citations."
      />

      <Card className="mb-4 p-3">
        <div className="flex items-center gap-2 text-[12px]">
          <Cloud size={14} className={bedrockHealth.configured ? 'text-verified' : 'text-slate-600'} />
          {bedrockHealth.configured ? (
            <Chip tone="verified">LIVE · Amazon Bedrock ({bedrockHealth.modelId}, {bedrockHealth.region})</Chip>
          ) : (
            <span className="text-slate-500">Bedrock not connected — {bedrockHealth.reason ?? 'using deterministic local engine'}.</span>
          )}
        </div>
      </Card>

      <Card className="mb-4">
        <div className="flex items-center gap-2 p-3">
          <TerminalSquare size={18} className="text-accent" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask(input)}
            placeholder="Ask about the current picture…"
            className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
          />
          <Button size="sm" variant="primary" onClick={() => ask(input)} disabled={pending}>
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Ask
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5 border-t border-white/5 p-3">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button key={q} onClick={() => ask(q)}><Chip tone="slate">{q}</Chip></button>
          ))}
        </div>
      </Card>

      <div className="space-y-3">
        {turns.length === 0 && (
          <Card><div className="p-6 text-center text-sm text-slate-500">Pick a suggested question to see a source-grounded answer.</div></Card>
        )}
        {turns.map((t, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-2 text-[13px] text-slate-400"><Quote size={13} className="text-accent" /> {t.q}</div>
            <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-slate-200">{t.r.answer}</p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="data-label mr-1">Cited</span>
              {t.r.citations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => (c.refType === 'alert' ? openAlert(c.id, 'queue') : setActiveView(c.refType === 'contradiction' ? 'queue' : 'feed'))}
                >
                  <Chip tone={c.refType === 'alert' ? 'high' : c.refType === 'contradiction' ? 'contradiction' : 'accent'}>{c.label}</Chip>
                </button>
              ))}
              {t.r.grounded && <Chip tone="verified">grounded</Chip>}
              {t.live && <Chip tone="verified">LIVE · Bedrock</Chip>}
              {t.liveError && <Chip tone="slate">Bedrock call failed, fell back to local engine: {t.liveError}</Chip>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
