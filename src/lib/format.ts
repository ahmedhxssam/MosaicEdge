import type { Severity, ReliabilityTier, SourceType, NetworkState } from '@/types';

export function timeAgo(minutes: number): string {
  const m = Math.round(minutes);
  if (m <= 0) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h} hr ago` : `${h} hr ${rem} min ago`;
}

export function formatClock(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export const pct = (v: number): string => `${Math.round(v)}%`;

export function severityFromScore(score: number): Severity {
  if (score >= 85) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

export const SEVERITY_META: Record<Severity, { label: string; hex: string; text: string; bg: string; ring: string; dot: string }> = {
  critical: { label: 'Critical', hex: '#f43f5e', text: 'text-critical', bg: 'bg-critical/10', ring: 'ring-critical/40', dot: 'bg-critical' },
  high: { label: 'High', hex: '#fb923c', text: 'text-high', bg: 'bg-high/10', ring: 'ring-high/40', dot: 'bg-high' },
  medium: { label: 'Medium', hex: '#fbbf24', text: 'text-medium', bg: 'bg-medium/10', ring: 'ring-medium/40', dot: 'bg-medium' },
  low: { label: 'Low', hex: '#64748b', text: 'text-low', bg: 'bg-low/10', ring: 'ring-low/40', dot: 'bg-low' },
};

export const RELIABILITY_META: Record<ReliabilityTier, { label: string; hex: string }> = {
  high: { label: 'High reliability', hex: '#34d399' },
  medium: { label: 'Medium reliability', hex: '#38bdf8' },
  low: { label: 'Low reliability', hex: '#fbbf24' },
  'very-low': { label: 'Very low reliability', hex: '#f43f5e' },
};

export const SOURCE_META: Record<SourceType, { label: string; hex: string; description: string }> = {
  HUMINT: { label: 'HUMINT', hex: '#38bdf8', description: 'Field report' },
  OSINT: { label: 'OSINT', hex: '#a78bfa', description: 'Public report' },
  GEOINT: { label: 'GEOINT', hex: '#34d399', description: 'Infrastructure observation' },
  SIGINT: { label: 'SIGINT', hex: '#f59e0b', description: 'Synthetic comms summary' },
};

export const NETWORK_META: Record<NetworkState, { label: string; hex: string }> = {
  connected: { label: 'Connected', hex: '#34d399' },
  degraded: { label: 'Degraded', hex: '#fbbf24' },
  offline: { label: 'Offline', hex: '#6b7280' },
};

export const LANGUAGE_META: Record<string, { label: string; flag: string }> = {
  en: { label: 'English', flag: 'EN' },
  ar: { label: 'Arabic', flag: 'AR' },
  es: { label: 'Spanish', flag: 'ES' },
};

export function confidenceTone(c: number): string {
  if (c >= 80) return 'text-verified';
  if (c >= 60) return 'text-medium';
  if (c >= 40) return 'text-high';
  return 'text-critical';
}
