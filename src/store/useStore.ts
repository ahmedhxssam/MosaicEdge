import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AuditEvent,
  Correction,
  CorrectionType,
  NetworkState,
  Report,
  SyncEvent,
  SyncReceipt,
  UserRole,
} from '@/types';
import { SEED_REPORTS, DEMO_INJECT_REPORTS, buildRawReport, type RawReport } from '@/data/reports';
import { T0_MS } from '@/data/scenario';
import { sha256 } from '@/lib/sha256';
import { appendEvent, tamperEvent, type NewEventInput } from '@/services/auditLedgerService';
import { makeSyncEvent, synchronize as runSync } from '@/services/syncQueueService';
import { checkBedrockHealth, type BedrockHealth } from '@/services/awsProvider';
import { JUDGE_MODE_STEPS, getJudgeModeStep } from '@/data/judgeMode';

export type ViewKey =
  | 'overview'
  | 'feed'
  | 'queue'
  | 'graph'
  | 'timeline'
  | 'whatchanged'
  | 'console'
  | 'review'
  | 'sync'
  | 'edge'
  | 'architecture'
  | 'evaluation'
  | 'security'
  | 'sources'
  | 'docs';

export interface FuseOpts {
  reliabilityOverrides: Record<string, number>;
  excludedReportIds: string[];
  reviewDecisions: Record<string, 'confirmed' | 'rejected'>;
}

interface StoreState {
  // UI
  networkState: NetworkState;
  role: UserRole;
  presentationMode: boolean;
  judgeModeActive: boolean;
  judgeStepIndex: number;
  activeView: ViewKey;
  focusAlertId: string | null;
  riskPathEntityId: string | null;
  briefOpen: boolean;

  // Data
  userReports: Report[];
  reliabilityOverrides: Record<string, number>;
  excludedReportIds: string[];
  reviewDecisions: Record<string, 'confirmed' | 'rejected'>;
  flaggedReportIds: string[];
  corrections: Correction[];
  auditLedger: AuditEvent[];
  syncQueue: SyncEvent[];
  syncReceipts: SyncReceipt[];
  lastReceipt: SyncReceipt | null;
  whatChangedBaseline: number;
  rev: number;
  initialized: boolean;
  bedrockHealth: BedrockHealth;

  // Actions
  init: () => void;
  refreshBedrockHealth: () => void;
  setNetworkState: (s: NetworkState) => void;
  setRole: (r: UserRole) => void;
  togglePresentation: () => void;
  startJudgeMode: () => void;
  stopJudgeMode: () => void;
  setJudgeStep: (index: number) => void;
  nextJudgeStep: () => void;
  previousJudgeStep: () => void;
  setActiveView: (v: ViewKey) => void;
  openAlert: (id: string, view?: ViewKey) => void;
  setRiskPath: (entityId: string | null) => void;
  openBrief: (alertId?: string) => void;
  closeBrief: () => void;
  loadDemoScenario: () => void;
  addReport: (raw: RawReport) => void;
  injectDemoReport: () => void;
  importReports: (reports: Report[]) => void;
  applyCorrection: (input: Omit<Correction, 'id' | 'timestamp' | 'actor' | 'networkState'>) => void;
  synchronize: () => { ok: boolean; message: string };
  tamperAudit: () => void;
  restoreAudit: () => void;
  allReports: () => Report[];
  fuseOptions: () => FuseOpts;
}

function nowIso(): string {
  return new Date().toISOString();
}

function genesisLedger(): AuditEvent[] {
  const seeds: NewEventInput[] = [
    {
      timestamp: new Date(T0_MS - 100 * 60_000).toISOString(),
      actor: 'auditor', action: 'system.boot', objectType: 'system', objectId: 'edge-node-01',
      networkState: 'connected', details: 'Mosaic Edge fusion node initialized (LocalDemoProvider).',
    },
    {
      timestamp: new Date(T0_MS - 98 * 60_000).toISOString(),
      actor: 'field-analyst', action: 'scenario.load', objectType: 'scenario', objectId: 'venezuela-earthquake-response',
      networkState: 'connected', details: 'Loaded Venezuela Earthquake Response synthetic scenario.',
    },
    {
      timestamp: new Date(T0_MS - 96 * 60_000).toISOString(),
      actor: 'field-analyst', action: 'ingest.batch', objectType: 'report-bundle', objectId: 'seed-bundle',
      networkState: 'connected', details: `Ingested ${SEED_REPORTS.length} synthetic reports across HUMINT/OSINT/GEOINT/SIGINT.`,
    },
  ];
  const chain: AuditEvent[] = [];
  for (const s of seeds) chain.push(appendEvent(chain, s));
  return chain;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      networkState: 'connected',
      role: 'field-analyst',
      presentationMode: false,
      judgeModeActive: false,
      judgeStepIndex: 0,
      activeView: 'overview',
      focusAlertId: null,
      riskPathEntityId: null,
      briefOpen: false,

      userReports: [],
      reliabilityOverrides: {},
      excludedReportIds: [],
      reviewDecisions: {},
      flaggedReportIds: [],
      corrections: [],
      auditLedger: [],
      syncQueue: [],
      syncReceipts: [],
      lastReceipt: null,
      whatChangedBaseline: 30,
      rev: 0,
      initialized: false,
      bedrockHealth: { configured: false, reason: 'not checked yet' },

      init: () => {
        const st = get();
        if (st.auditLedger.length === 0) {
          set({ auditLedger: genesisLedger(), initialized: true });
        } else {
          set({ initialized: true });
        }
        get().refreshBedrockHealth();
      },

      refreshBedrockHealth: () => {
        checkBedrockHealth().then((h) => set({ bedrockHealth: h }));
      },

      setNetworkState: (s) => {
        const prev = get().networkState;
        if (prev === s) return;
        set((st) => ({
          networkState: s,
          auditLedger: appendAudit(st, {
            actor: st.role, action: 'network.state', objectType: 'system', objectId: 'link',
            networkState: s, details: `Network state changed ${prev} → ${s}.`,
          }),
        }));
      },

      setRole: (r) =>
        set((st) => ({
          role: r,
          auditLedger: appendAudit(st, {
            actor: r, action: 'role.switch', objectType: 'session', objectId: 'role',
            networkState: st.networkState, details: `Active role set to ${r}.`,
          }),
        })),

      togglePresentation: () => set((st) => ({ presentationMode: !st.presentationMode })),
      startJudgeMode: () =>
        set(() => {
          const step = getJudgeModeStep(0);
          return {
            judgeModeActive: true,
            judgeStepIndex: 0,
            activeView: step.view,
            focusAlertId: null,
            riskPathEntityId: null,
            briefOpen: false,
          };
        }),
      stopJudgeMode: () => set({ judgeModeActive: false }),
      setJudgeStep: (index) =>
        set(() => {
          const safeIndex = Math.max(0, Math.min(JUDGE_MODE_STEPS.length - 1, index));
          const step = getJudgeModeStep(safeIndex);
          return {
            judgeModeActive: true,
            judgeStepIndex: safeIndex,
            activeView: step.view,
            focusAlertId: step.view === 'queue' ? 'hospital-fuel' : null,
          };
        }),
      nextJudgeStep: () => {
        const st = get();
        get().setJudgeStep(Math.min(JUDGE_MODE_STEPS.length - 1, st.judgeStepIndex + 1));
      },
      previousJudgeStep: () => {
        const st = get();
        get().setJudgeStep(Math.max(0, st.judgeStepIndex - 1));
      },
      setActiveView: (v) => set({ activeView: v }),
      openAlert: (id, view = 'queue') => set({ focusAlertId: id, activeView: view }),
      setRiskPath: (entityId) => set({ riskPathEntityId: entityId }),
      openBrief: (alertId) => set((st) => ({ briefOpen: true, focusAlertId: alertId ?? st.focusAlertId })),
      closeBrief: () => set({ briefOpen: false }),

      loadDemoScenario: () =>
        set((st) => ({
          userReports: [],
          reliabilityOverrides: {},
          excludedReportIds: [],
          reviewDecisions: {},
          flaggedReportIds: [],
          corrections: [],
          syncQueue: [],
          syncReceipts: [],
          lastReceipt: null,
          networkState: 'connected',
          judgeModeActive: false,
          judgeStepIndex: 0,
          focusAlertId: null,
          riskPathEntityId: null,
          auditLedger: appendAudit({ ...st, auditLedger: genesisLedger() }, {
            actor: st.role, action: 'scenario.reload', objectType: 'scenario', objectId: 'venezuela-earthquake-response',
            networkState: 'connected', details: 'Reset to clean Venezuela Earthquake Response baseline.',
          }),
          rev: st.rev + 1,
        })),

      addReport: (raw) => {
        const report = buildRawReport(raw);
        const st = get();
        const unsynced = st.networkState !== 'connected';
        const stamped: Report = {
          ...report,
          unsynced,
          userAdded: true,
          processingStatus: unsynced ? 'queued' : 'synced',
        };
        const queue = unsynced
          ? [
              ...st.syncQueue,
              makeSyncEvent({
                objectType: 'report', objectId: report.id, label: `${report.sourceType} report ${report.id}`,
                createdAt: report.timestamp, queuedAt: nowIso(), networkState: st.networkState,
              }),
            ]
          : st.syncQueue;
        set({
          userReports: [...st.userReports, stamped],
          syncQueue: queue,
          auditLedger: appendAudit(st, {
            actor: st.role, action: 'report.ingest', objectType: 'report', objectId: report.id,
            networkState: st.networkState,
            details: `Ingested ${report.sourceType} report ${report.id}${unsynced ? ' (queued for sync)' : ''}.`,
          }),
          rev: st.rev + 1,
        });
      },

      injectDemoReport: () => {
        const existing = get().userReports.some((r) => r.id === DEMO_INJECT_REPORTS[0].id);
        if (existing) return;
        get().addReport(DEMO_INJECT_REPORTS[0]);
      },

      importReports: (reports) => {
        const st = get();
        const unsynced = st.networkState !== 'connected';
        const stamped = reports.map((r) => ({ ...r, unsynced, userAdded: true, processingStatus: unsynced ? ('queued' as const) : ('synced' as const) }));
        const queue = unsynced
          ? [
              ...st.syncQueue,
              ...stamped.map((r) =>
                makeSyncEvent({ objectType: 'report', objectId: r.id, label: `${r.sourceType} report ${r.id}`, createdAt: r.timestamp, queuedAt: nowIso(), networkState: st.networkState }),
              ),
            ]
          : st.syncQueue;
        set({
          userReports: [...st.userReports, ...stamped],
          syncQueue: queue,
          auditLedger: appendAudit(st, {
            actor: st.role, action: 'report.import', objectType: 'report-bundle', objectId: 'upload',
            networkState: st.networkState, details: `Imported ${reports.length} report(s) from JSON bundle.`,
          }),
          rev: st.rev + 1,
        });
      },

      applyCorrection: (input) => {
        const st = get();
        const correction: Correction = {
          ...input,
          id: `COR-${st.corrections.length + 1}-${sha256(input.targetId + input.type).slice(0, 5)}`,
          timestamp: nowIso(),
          actor: st.role,
          networkState: st.networkState,
        };

        const next: Partial<StoreState> = {};
        switch (input.type) {
          case 'confirm-merge':
            next.reviewDecisions = { ...st.reviewDecisions, [input.targetId]: 'confirmed' };
            break;
          case 'reject-merge':
            next.reviewDecisions = { ...st.reviewDecisions, [input.targetId]: 'rejected' };
            break;
          case 'mark-outdated':
            next.excludedReportIds = Array.from(new Set([...st.excludedReportIds, input.targetId]));
            break;
          case 'flag-verification':
            next.flaggedReportIds = Array.from(new Set([...st.flaggedReportIds, input.targetId]));
            break;
          case 'adjust-reliability': {
            const base = st.reliabilityOverrides[input.targetId] ?? currentReliability(st, input.targetId);
            next.reliabilityOverrides = {
              ...st.reliabilityOverrides,
              [input.targetId]: Math.max(0, Math.min(1, base + (input.reliabilityDelta ?? 0))),
            };
            break;
          }
          case 'analyst-note':
          default:
            break;
        }

        set({
          ...next,
          corrections: [...st.corrections, correction],
          auditLedger: appendAudit(st, {
            actor: st.role, action: `correction.${input.type}`, objectType: input.targetType, objectId: input.targetId,
            networkState: st.networkState,
            details: `${input.type} on ${input.targetLabel}${input.note ? ` — "${input.note}"` : ''}${input.reliabilityDelta ? ` (Δ${input.reliabilityDelta})` : ''}.`,
          }),
          rev: st.rev + 1,
        });
      },

      synchronize: () => {
        const st = get();
        const outcome = runSync(st.syncQueue, st.networkState, st.role, nowIso());
        if (!outcome.receipt) {
          return { ok: false, message: outcome.error ?? 'Nothing to sync.' };
        }
        // Synced reports lose their unsynced flag.
        const syncedIds = new Set(outcome.receipt.itemIds);
        set({
          syncQueue: outcome.queue,
          syncReceipts: [...st.syncReceipts, outcome.receipt],
          lastReceipt: outcome.receipt,
          userReports: st.userReports.map((r) => (syncedIds.has(r.id) ? { ...r, unsynced: false, processingStatus: 'synced' } : r)),
          auditLedger: appendAudit(st, {
            actor: st.role, action: 'sync.flush', objectType: 'sync-receipt', objectId: outcome.receipt.id,
            networkState: st.networkState,
            details: `Store-and-forward sync: ${outcome.receipt.itemCount} item(s), ${outcome.receipt.totalBytes} B, hash ${outcome.receipt.integrityHash.slice(0, 12)}.`,
          }),
          rev: st.rev + 1,
        });
        return { ok: true, message: `Synced ${outcome.receipt.itemCount} item(s). Receipt ${outcome.receipt.id}.` };
      },

      tamperAudit: () =>
        set((st) => {
          if (st.auditLedger.length === 0) return {};
          return { auditLedger: tamperEvent(st.auditLedger, st.auditLedger.length - 1) };
        }),

      restoreAudit: () =>
        set((st) => ({
          auditLedger: st.auditLedger.map((e) =>
            e.tampered ? { ...e, details: e.details.replace(/ \[ALTERED\]$/, ''), tampered: false } : e,
          ),
        })),

      allReports: () => [...SEED_REPORTS, ...get().userReports],
      fuseOptions: () => {
        const st = get();
        return {
          reliabilityOverrides: st.reliabilityOverrides,
          excludedReportIds: st.excludedReportIds,
          reviewDecisions: st.reviewDecisions,
        };
      },
    }),
    {
      name: 'mosaic-edge-v1',
      partialize: (s) => ({
        networkState: s.networkState,
        role: s.role,
        presentationMode: s.presentationMode,
        userReports: s.userReports,
        reliabilityOverrides: s.reliabilityOverrides,
        excludedReportIds: s.excludedReportIds,
        reviewDecisions: s.reviewDecisions,
        flaggedReportIds: s.flaggedReportIds,
        corrections: s.corrections,
        auditLedger: s.auditLedger,
        syncQueue: s.syncQueue,
        syncReceipts: s.syncReceipts,
        lastReceipt: s.lastReceipt,
      }),
    },
  ),
);

// ── helpers ──────────────────────────────────────────────────────────────────
function appendAudit(st: StoreState, input: Omit<NewEventInput, 'timestamp'> & { timestamp?: string }): AuditEvent[] {
  const ev: NewEventInput = { ...input, timestamp: input.timestamp ?? nowIso() };
  return [...st.auditLedger, appendEvent(st.auditLedger, ev)];
}

function currentReliability(st: StoreState, reportId: string): number {
  const r = [...SEED_REPORTS, ...st.userReports].find((x) => x.id === reportId);
  return r?.reliabilityScore ?? 0.5;
}

export const CORRECTION_LABELS: Record<CorrectionType, string> = {
  'confirm-merge': 'Confirm merge',
  'reject-merge': 'Reject merge',
  'mark-outdated': 'Mark outdated',
  'flag-verification': 'Flag for verification',
  'adjust-reliability': 'Adjust reliability',
  'analyst-note': 'Add note',
};
