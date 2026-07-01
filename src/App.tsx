import { useEffect } from 'react';
import { useStore, type ViewKey } from '@/store/useStore';
import { NavRail } from '@/components/layout/NavRail';
import { TopBar } from '@/components/layout/TopBar';
import { BriefModal } from '@/features/brief/BriefModal';
import JudgeModeOverlay from '@/features/judge/JudgeModeOverlay';
import { cn } from '@/lib/cn';

import CommandOverview from '@/features/overview/CommandOverview';
import LiveFeed from '@/features/feed/LiveFeed';
import PriorityQueue from '@/features/queue/PriorityQueue';
import EntityGraphPage from '@/features/graph/EntityGraphPage';
import TimelineReplay from '@/features/timeline/TimelineReplay';
import WhatChanged from '@/features/whatchanged/WhatChanged';
import AnalystConsole from '@/features/console/AnalystConsole';
import HumanReview from '@/features/review/HumanReview';
import SyncAudit from '@/features/sync/SyncAudit';
import SecurityTrust from '@/features/security/SecurityTrust';
import EdgeReadiness from '@/features/edge/EdgeReadiness';
import Architecture from '@/features/architecture/Architecture';
import Evaluation from '@/features/evaluation/Evaluation';
import DataSources from '@/features/sources/DataSources';
import Documentation from '@/features/docs/Documentation';

const PAGES: Record<ViewKey, React.ComponentType> = {
  overview: CommandOverview,
  feed: LiveFeed,
  queue: PriorityQueue,
  graph: EntityGraphPage,
  timeline: TimelineReplay,
  whatchanged: WhatChanged,
  console: AnalystConsole,
  review: HumanReview,
  sync: SyncAudit,
  security: SecurityTrust,
  edge: EdgeReadiness,
  architecture: Architecture,
  evaluation: Evaluation,
  sources: DataSources,
  docs: Documentation,
};

export default function App() {
  const activeView = useStore((s) => s.activeView);
  const presentationMode = useStore((s) => s.presentationMode);
  const init = useStore((s) => s.init);
  useEffect(() => { init(); }, [init]);

  const Page = PAGES[activeView] ?? CommandOverview;

  return (
    <div className="flex h-screen w-screen overflow-hidden text-slate-200">
      {!presentationMode && <NavRail />}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className={cn('flex-1 overflow-y-auto', presentationMode ? 'px-8 py-6' : 'px-6 py-5')}>
          <div className={cn('mx-auto', presentationMode ? 'max-w-[1400px]' : 'max-w-[1500px]')}>
            <Page />
          </div>
        </main>
      </div>
      <BriefModal />
      <JudgeModeOverlay />
    </div>
  );
}
