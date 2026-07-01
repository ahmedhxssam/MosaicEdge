import { useStore } from '@/store/useStore';
import type { Language, ReliabilityTier, Report, SourceType } from '@/types';
import { RELIABILITY_META, SOURCE_META, LANGUAGE_META } from '@/lib/format';
import { redactedSourceName } from '@/services/roleService';
import { cn } from '@/lib/cn';

export function SourceTypePill({ type, className }: { type: SourceType; className?: string }) {
  const m = SOURCE_META[type];
  return (
    <span
      className={cn('chip border-transparent font-semibold', className)}
      style={{ color: m.hex, backgroundColor: `${m.hex}18`, borderColor: `${m.hex}40` }}
      title={m.description}
    >
      {m.label}
    </span>
  );
}

export function LanguageChip({ language }: { language: Language }) {
  const m = LANGUAGE_META[language];
  return (
    <span className="chip border-white/10 bg-white/5 font-mono text-slate-300" title={m.label}>
      {m.flag}
    </span>
  );
}

export function ReliabilityDot({ tier, score }: { tier: ReliabilityTier; score?: number }) {
  const m = RELIABILITY_META[tier];
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400" title={m.label}>
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.hex }} />
      {score !== undefined ? `${Math.round(score * 100)}%` : m.label}
    </span>
  );
}

/** A source reference chip that respects the active role's redaction. */
export function SourceChip({ report, onClick }: { report: Report; onClick?: () => void }) {
  const role = useStore((s) => s.role);
  const name = redactedSourceName(role, report);
  const m = SOURCE_META[report.sourceType];
  return (
    <button
      onClick={onClick}
      className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-left text-[11px] transition-colors hover:bg-white/10"
      title={`${report.id} · ${report.sourceClassification}`}
    >
      <span className="font-mono text-slate-500">{report.id}</span>
      <span className="font-semibold" style={{ color: m.hex }}>
        {report.sourceType}
      </span>
      <span className="truncate text-slate-300">{name}</span>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: RELIABILITY_META[report.reliabilityTier].hex }} />
    </button>
  );
}
