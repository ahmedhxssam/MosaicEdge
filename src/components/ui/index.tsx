import React from 'react';
import { cn } from '@/lib/cn';
import type { Severity } from '@/types';
import { SEVERITY_META } from '@/lib/format';

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({
  children,
  className,
  raised,
  glow,
}: {
  children: React.ReactNode;
  className?: string;
  raised?: boolean;
  glow?: boolean;
}) {
  return (
    <div className={cn(raised ? 'panel-raised' : 'panel', glow && 'shadow-glow', 'animate-fade-in', className)}>
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  icon,
  subtitle,
  actions,
  className,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 border-b border-white/5 px-4 py-3', className)}>
      <div className="flex items-start gap-2.5 min-w-0">
        {icon && <div className="mt-0.5 text-accent">{icon}</div>}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-100">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

// ── Button ───────────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'ghost' | 'subtle' | 'danger' | 'outline';
export function Button({
  children,
  variant = 'subtle',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' }) {
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-accent text-ink-950 hover:bg-accent-soft font-semibold',
    ghost: 'text-slate-300 hover:bg-white/5 hover:text-slate-100',
    subtle: 'bg-white/5 text-slate-200 hover:bg-white/10 border border-white/10',
    outline: 'border border-accent/40 text-accent hover:bg-accent/10',
    danger: 'bg-critical/15 text-critical hover:bg-critical/25 border border-critical/30',
  };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg transition-colors focus-ring disabled:opacity-40 disabled:cursor-not-allowed',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Badges & chips ─────────────────────────────────────────────────────────
export function SeverityBadge({ severity, score, className }: { severity: Severity; score?: number; className?: string }) {
  const m = SEVERITY_META[severity];
  return (
    <span
      className={cn('chip font-semibold uppercase tracking-wide', m.bg, m.text, 'border-transparent', className)}
      style={{ borderColor: `${m.hex}40` }}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', m.dot)} />
      {m.label}
      {score !== undefined && <span className="font-mono">· {score}</span>}
    </span>
  );
}

export function Chip({
  children,
  tone = 'slate',
  className,
  onClick,
  title,
}: {
  children: React.ReactNode;
  tone?: 'slate' | 'accent' | 'verified' | 'contradiction' | 'syncing' | 'high' | 'critical' | 'offline';
  className?: string;
  onClick?: () => void;
  title?: string;
}) {
  const tones: Record<string, string> = {
    slate: 'border-white/10 bg-white/5 text-slate-300',
    accent: 'border-accent/30 bg-accent/10 text-accent',
    verified: 'border-verified/30 bg-verified/10 text-verified',
    contradiction: 'border-contradiction/30 bg-contradiction/10 text-contradiction',
    syncing: 'border-syncing/30 bg-syncing/10 text-syncing',
    high: 'border-high/30 bg-high/10 text-high',
    critical: 'border-critical/30 bg-critical/10 text-critical',
    offline: 'border-white/10 bg-white/5 text-slate-500',
  };
  return (
    <span
      title={title}
      onClick={onClick}
      className={cn('chip', tones[tone], onClick && 'cursor-pointer hover:brightness-125', className)}
    >
      {children}
    </span>
  );
}

// ── Meter ────────────────────────────────────────────────────────────────────
export function Meter({
  value,
  max = 100,
  colorHex,
  className,
  height = 6,
}: {
  value: number;
  max?: number;
  colorHex?: string;
  className?: string;
  height?: number;
}) {
  const pctv = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-white/8', className)} style={{ height }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pctv}%`, backgroundColor: colorHex ?? '#38bdf8' }}
      />
    </div>
  );
}

// ── KPI ──────────────────────────────────────────────────────────────────────
export function Kpi({
  label,
  value,
  hint,
  tone,
  icon,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn('panel px-4 py-3', onClick && 'cursor-pointer transition-colors hover:bg-slatepanel-raised')}
    >
      <div className="flex items-center justify-between">
        <span className="data-label">{label}</span>
        {icon && <span className="text-slate-500">{icon}</span>}
      </div>
      <div className={cn('mt-1.5 text-2xl font-semibold tabular-nums', tone ?? 'text-slate-100')}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-slate-500">{hint}</div>}
    </div>
  );
}

// ── Segmented control ─────────────────────────────────────────────────────────
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: { value: T; label: React.ReactNode; hex?: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="inline-flex rounded-lg border border-white/10 bg-ink-900 p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-md font-medium transition-colors focus-ring',
              size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
              active ? 'bg-white/10 text-slate-100' : 'text-slate-400 hover:text-slate-200',
            )}
            style={active && o.hex ? { color: o.hex, boxShadow: `inset 0 0 0 1px ${o.hex}40` } : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Tooltip (hover) ────────────────────────────────────────────────────────
export function Tooltip({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-64 -translate-x-1/2 rounded-lg border border-white/10 bg-ink-850 p-2.5 text-xs leading-relaxed text-slate-300 shadow-panel group-hover/tt:block">
        {content}
      </span>
    </span>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, hint }: { icon?: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {icon && <div className="text-slate-600">{icon}</div>}
      <div className="text-sm font-medium text-slate-400">{title}</div>
      {hint && <div className="max-w-sm text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

// ── Confidence meter w/ label ─────────────────────────────────────────────────
export function ConfidenceMeter({ value, label = 'Confidence' }: { value: number; label?: string }) {
  const hex = value >= 80 ? '#34d399' : value >= 60 ? '#fbbf24' : value >= 40 ? '#fb923c' : '#f43f5e';
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="data-label">{label}</span>
        <span className="font-mono font-semibold" style={{ color: hex }}>
          {Math.round(value)}%
        </span>
      </div>
      <Meter value={value} colorHex={hex} className="mt-1" />
    </div>
  );
}

export function PageHeader({
  title,
  kicker,
  description,
  actions,
}: {
  title: string;
  kicker?: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {kicker && <div className="data-label mb-1 text-accent">{kicker}</div>}
        <h1 className="text-xl font-semibold tracking-tight text-slate-50">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
