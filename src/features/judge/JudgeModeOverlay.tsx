import { ArrowLeft, ArrowRight, CheckCircle2, Eye, Sparkles, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { getJudgeModeStep, judgeModeProgress } from '@/data/judgeMode';
import { Button, Chip, Meter } from '@/components/ui';

export default function JudgeModeOverlay() {
  const active = useStore((s) => s.judgeModeActive);
  const index = useStore((s) => s.judgeStepIndex);
  const setJudgeStep = useStore((s) => s.setJudgeStep);
  const nextJudgeStep = useStore((s) => s.nextJudgeStep);
  const previousJudgeStep = useStore((s) => s.previousJudgeStep);
  const stopJudgeMode = useStore((s) => s.stopJudgeMode);

  if (!active) return null;

  const step = getJudgeModeStep(index);
  const progress = judgeModeProgress(index);
  const first = progress.current === 1;
  const last = progress.current === progress.total;

  return (
    <aside
      role="dialog"
      aria-label="Judge Mode walkthrough"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 w-[min(520px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-accent/30 bg-ink-900/95 shadow-panel backdrop-blur-md"
    >
      <div className="border-b border-white/10 bg-accent/10 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="accent">
                <Sparkles size={12} /> Judge Mode
              </Chip>
              <span className="font-mono text-[11px] text-slate-400">
                Step {progress.current} / {progress.total}
              </span>
            </div>
            <h2 className="mt-2 text-base font-semibold text-slate-50">{step.title}</h2>
          </div>
          <Button size="sm" variant="ghost" onClick={stopJudgeMode} title="Exit Judge Mode" aria-label="Exit Judge Mode">
            <X size={15} />
          </Button>
        </div>
        <Meter value={progress.percent} max={100} colorHex="#38bdf8" className="mt-3" height={5} />
      </div>

      <div className="max-h-[68vh] overflow-y-auto p-4">
        <section className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
          <div className="data-label mb-1 flex items-center gap-1 text-accent">
            <Eye size={12} /> What this page means
          </div>
          <p className="text-[13px] leading-relaxed text-slate-200">{step.simpleExplanation}</p>
        </section>

        <section className="mt-3">
          <div className="data-label mb-1.5">Important sections to point at</div>
          <div className="flex flex-wrap gap-1.5">
            {step.sections.map((section) => (
              <Chip key={section} tone="slate">{section}</Chip>
            ))}
          </div>
        </section>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <section className="rounded-lg border border-verified/20 bg-verified/5 p-3">
            <div className="data-label mb-1 text-verified">Wow factor</div>
            <p className="text-[12px] leading-relaxed text-slate-300">{step.wowFactor}</p>
          </section>
          <section className="rounded-lg border border-syncing/20 bg-syncing/5 p-3">
            <div className="data-label mb-1 text-syncing">Connection</div>
            <p className="text-[12px] leading-relaxed text-slate-300">{step.connection}</p>
          </section>
        </div>

        <section className="mt-3 rounded-lg border border-high/20 bg-high/5 p-3">
          <div className="data-label mb-1 text-high">Say this to judges</div>
          <p className="text-[13px] leading-relaxed text-slate-200">{step.judgeTakeaway}</p>
        </section>

        <section className="mt-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <div className="data-label mb-1">Suggested action</div>
          <p className="text-[12px] leading-relaxed text-slate-400">{step.demoAction}</p>
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="subtle" onClick={previousJudgeStep} disabled={first}>
            <ArrowLeft size={14} /> Back
          </Button>
          <Button size="sm" variant="subtle" onClick={() => setJudgeStep(index)} title="Reopen this step page">
            Reopen page
          </Button>
        </div>
        {last ? (
          <Button size="sm" variant="primary" onClick={stopJudgeMode}>
            <CheckCircle2 size={14} /> Finish
          </Button>
        ) : (
          <Button size="sm" variant="primary" onClick={nextJudgeStep}>
            Next <ArrowRight size={14} />
          </Button>
        )}
      </div>
    </aside>
  );
}
