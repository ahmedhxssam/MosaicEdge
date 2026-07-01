import { Wifi, WifiOff, SignalLow, FileText, Presentation, RotateCcw, ShieldAlert, Sparkles } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { OPERATION } from '@/data/scenario';
import { NETWORK_META } from '@/lib/format';
import { ROLE_META } from '@/services/roleService';
import type { NetworkState, UserRole } from '@/types';
import { Button, Segmented } from '@/components/ui';
import { cn } from '@/lib/cn';

export function TopBar() {
  const networkState = useStore((s) => s.networkState);
  const setNetworkState = useStore((s) => s.setNetworkState);
  const role = useStore((s) => s.role);
  const setRole = useStore((s) => s.setRole);
  const presentationMode = useStore((s) => s.presentationMode);
  const togglePresentation = useStore((s) => s.togglePresentation);
  const loadDemoScenario = useStore((s) => s.loadDemoScenario);
  const judgeModeActive = useStore((s) => s.judgeModeActive);
  const startJudgeMode = useStore((s) => s.startJudgeMode);
  const setActiveView = useStore((s) => s.setActiveView);
  const openBrief = useStore((s) => s.openBrief);
  const queued = useStore((s) => s.syncQueue.filter((q) => q.status === 'queued').length);

  const netIcon: Record<NetworkState, React.ReactNode> = {
    connected: <Wifi size={14} />,
    degraded: <SignalLow size={14} />,
    offline: <WifiOff size={14} />,
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 bg-ink-900/70 px-5 py-2.5 backdrop-blur">
      {/* Operation identity */}
      <div className="flex items-center gap-3">
        <div className="leading-tight">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-100">{OPERATION.name}</span>
            <span className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] text-accent">{OPERATION.codeName}</span>
          </div>
          <div className="text-[11px] text-slate-500">{OPERATION.region}</div>
        </div>
        <span className="hidden items-center gap-1 rounded-md border border-medium/30 bg-medium/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-medium md:inline-flex">
          <ShieldAlert size={12} /> Synthetic Demo Data
        </span>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Network state */}
        <div className="flex items-center gap-1.5">
          <span className="data-label hidden lg:inline">Link</span>
          <Segmented<NetworkState>
            size="sm"
            value={networkState}
            onChange={setNetworkState}
            options={(['connected', 'degraded', 'offline'] as NetworkState[]).map((n) => ({
              value: n,
              hex: NETWORK_META[n].hex,
              label: (
                <span className="flex items-center gap-1">
                  {netIcon[n]} <span className="hidden sm:inline">{NETWORK_META[n].label}</span>
                </span>
              ),
            }))}
          />
          {queued > 0 && (
            <span className="rounded-md bg-syncing/15 px-1.5 py-0.5 font-mono text-[10px] text-syncing">{queued} queued</span>
          )}
        </div>

        {/* Role */}
        <div className="flex items-center gap-1.5">
          <span className="data-label hidden lg:inline">Role</span>
          <Segmented<UserRole>
            size="sm"
            value={role}
            onChange={setRole}
            options={(Object.keys(ROLE_META) as UserRole[]).map((r) => ({ value: r, label: ROLE_META[r].short }))}
          />
        </div>

        <Button size="sm" variant="ghost" onClick={() => openBrief()} title="Generate intelligence brief">
          <FileText size={14} /> Brief
        </Button>

        <Button
          size="sm"
          variant={judgeModeActive ? 'primary' : 'outline'}
          onClick={() => {
            if (!judgeModeActive) loadDemoScenario();
            startJudgeMode();
          }}
          title="Start a guided judge walkthrough"
        >
          <Sparkles size={14} /> Judge Mode
        </Button>

        <Button
          size="sm"
          variant={presentationMode ? 'primary' : 'ghost'}
          onClick={togglePresentation}
          className={cn(presentationMode && 'ring-1 ring-accent/40')}
          title="Toggle Presentation Mode"
        >
          <Presentation size={14} /> {presentationMode ? 'Presenting' : 'Present'}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            loadDemoScenario();
            setActiveView('overview');
          }}
          title="Reset to clean demo scenario"
        >
          <RotateCcw size={14} /> Load Demo
        </Button>
      </div>
    </header>
  );
}
