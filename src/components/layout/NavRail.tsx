import {
  LayoutDashboard,
  Radio,
  ListOrdered,
  Share2,
  Clock,
  GitCompareArrows,
  TerminalSquare,
  UserCheck,
  ShieldCheck,
  Cpu,
  Workflow,
  BarChart3,
  BookOpen,
  Lock,
  Hexagon,
  Globe,
} from 'lucide-react';
import { useStore, type ViewKey } from '@/store/useStore';
import { useFusion } from '@/hooks/useFusion';
import { cn } from '@/lib/cn';

interface NavItem {
  key: ViewKey;
  label: string;
  icon: React.ReactNode;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    label: 'Command',
    items: [{ key: 'overview', label: 'Command Overview', icon: <LayoutDashboard size={17} /> }],
  },
  {
    label: 'Intake',
    items: [
      { key: 'feed', label: 'Live Feed', icon: <Radio size={17} /> },
      { key: 'queue', label: 'Priority Queue', icon: <ListOrdered size={17} /> },
      { key: 'sources', label: 'Data & Sources', icon: <Globe size={17} /> },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { key: 'graph', label: 'Entity Graph', icon: <Share2 size={17} /> },
      { key: 'timeline', label: 'Timeline Replay', icon: <Clock size={17} /> },
      { key: 'whatchanged', label: 'What Changed?', icon: <GitCompareArrows size={17} /> },
      { key: 'console', label: 'Analyst Console', icon: <TerminalSquare size={17} /> },
      { key: 'review', label: 'Human Review', icon: <UserCheck size={17} /> },
    ],
  },
  {
    label: 'Trust & Edge',
    items: [
      { key: 'sync', label: 'Sync & Audit', icon: <ShieldCheck size={17} /> },
      { key: 'security', label: 'Security & Trust', icon: <Lock size={17} /> },
      { key: 'edge', label: 'Edge Readiness', icon: <Cpu size={17} /> },
    ],
  },
  {
    label: 'Reference',
    items: [
      { key: 'architecture', label: 'Architecture', icon: <Workflow size={17} /> },
      { key: 'evaluation', label: 'Evaluation', icon: <BarChart3 size={17} /> },
      { key: 'docs', label: 'Documentation', icon: <BookOpen size={17} /> },
    ],
  },
];

export function NavRail() {
  const activeView = useStore((s) => s.activeView);
  const setActiveView = useStore((s) => s.setActiveView);
  const fusion = useFusion();

  const badges: Partial<Record<ViewKey, number>> = {
    queue: fusion.alerts.filter((a) => a.severity === 'critical' || a.severity === 'high').length,
    whatchanged: undefined,
    review: fusion.entities.filter((e) => e.reviewStatus === 'needs-review').length + fusion.contradictions.length,
  };

  return (
    <nav className="flex h-full w-60 shrink-0 flex-col border-r border-white/5 bg-ink-900/60">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-accent ring-1 ring-inset ring-accent/30">
          <Hexagon size={20} className="fill-accent/20" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight text-slate-50">Mosaic Edge</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Fusion Workstation</div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-2.5 pb-4 scrollfade">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = activeView === item.key;
                const badge = badges[item.key];
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveView(item.key)}
                    className={cn('nav-item w-full', active && 'nav-item-active')}
                  >
                    <span className={cn(active ? 'text-accent' : 'text-slate-500')}>{item.icon}</span>
                    <span className="flex-1 text-left">{item.label}</span>
                    {badge ? (
                      <span className="rounded-full bg-critical/20 px-1.5 text-[10px] font-semibold text-critical">
                        {badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-white/5 px-4 py-3 text-[10px] leading-relaxed text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-verified" />
          LocalDemoProvider · offline-capable
        </div>
        <div className="mt-1">No AWS credentials required.</div>
      </div>
    </nav>
  );
}
