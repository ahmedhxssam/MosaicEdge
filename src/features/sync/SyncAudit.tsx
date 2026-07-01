import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { PageHeader, Card, PanelHeader, Button, Chip } from '@/components/ui';
import { verifyChain, type ChainVerification } from '@/services/auditLedgerService';
import { NETWORK_META, formatDateTime } from '@/lib/format';
import { RefreshCw, ShieldCheck, ShieldAlert, AlertTriangle, FileCheck2, Wrench } from 'lucide-react';

export default function SyncAudit() {
  const networkState = useStore((s) => s.networkState);
  const syncQueue = useStore((s) => s.syncQueue);
  const lastReceipt = useStore((s) => s.lastReceipt);
  const auditLedger = useStore((s) => s.auditLedger);
  const synchronize = useStore((s) => s.synchronize);
  const tamperAudit = useStore((s) => s.tamperAudit);
  const restoreAudit = useStore((s) => s.restoreAudit);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [verification, setVerification] = useState<ChainVerification | null>(null);

  const queued = syncQueue.filter((s) => s.status === 'queued');
  const synced = syncQueue.filter((s) => s.status === 'synced');
  const tampered = auditLedger.some((e) => e.tampered);

  const doSync = () => setSyncMsg(synchronize().message);

  return (
    <div>
      <PageHeader kicker="Sync & Audit" title="Disconnected-first proof" description="While offline, ingestion and fusion keep working and actions queue locally. On reconnect, a verifiable store-and-forward sync flushes the queue. Every action chains into a tamper-evident ledger." />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Sync queue */}
        <Card>
          <PanelHeader
            title="Store-and-forward queue"
            icon={<RefreshCw size={16} />}
            subtitle={`Link: ${NETWORK_META[networkState].label} · ${queued.length} queued · ${synced.length} synced`}
            actions={<Button size="sm" variant="primary" disabled={networkState !== 'connected' || queued.length === 0} onClick={doSync}>Synchronize</Button>}
          />
          <div className="p-3">
            {networkState !== 'connected' && (
              <div className="mb-2 rounded-lg border border-syncing/20 bg-syncing/5 px-3 py-2 text-[12px] text-syncing/90">
                Offline/degraded — new reports persist locally and original timestamps are preserved for sync.
              </div>
            )}
            {syncQueue.length === 0 && <div className="py-6 text-center text-sm text-slate-500">Queue empty. Go Offline and add a report from the Live Feed to see it queue.</div>}
            <div className="space-y-1.5">
              {syncQueue.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-[12px]">
                  <div className="min-w-0">
                    <span className="font-mono text-slate-500">{s.objectId}</span> <span className="text-slate-300">{s.label}</span>
                    <div className="text-slate-600">created {formatDateTime(s.createdAt)} · {s.bytes} B</div>
                  </div>
                  <Chip tone={s.status === 'synced' ? 'verified' : 'syncing'}>{s.status}</Chip>
                </div>
              ))}
            </div>
            {syncMsg && <div className="mt-2 text-[12px] text-verified">{syncMsg}</div>}
            {lastReceipt && (
              <div className="mt-3 rounded-lg border border-verified/20 bg-verified/5 p-3 text-[12px]">
                <div className="flex items-center gap-1.5 font-semibold text-verified"><FileCheck2 size={14} /> Sync receipt {lastReceipt.id}</div>
                <div className="mt-1 grid grid-cols-2 gap-1 text-slate-400">
                  <span>Items: {lastReceipt.itemCount}</span>
                  <span>Bytes: {lastReceipt.totalBytes}</span>
                  <span>Duration: {lastReceipt.durationMs} ms</span>
                  <span>By: {lastReceipt.actor}</span>
                </div>
                <div className="mt-1 font-mono text-[10px] text-slate-500">integrity {lastReceipt.integrityHash.slice(0, 24)}…</div>
              </div>
            )}
          </div>
        </Card>

        {/* Audit ledger */}
        <Card>
          <PanelHeader
            title="Tamper-evident audit ledger"
            icon={<ShieldCheck size={16} />}
            subtitle={`${auditLedger.length} chained events · SHA-256`}
            actions={
              <div className="flex gap-1.5">
                <Button size="sm" variant="primary" onClick={() => setVerification(verifyChain(auditLedger))}>Verify chain</Button>
              </div>
            }
          />
          <div className="p-3">
            {verification && (
              <div className={`mb-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] ${verification.valid ? 'border-verified/30 bg-verified/5 text-verified' : 'border-critical/30 bg-critical/10 text-critical'}`}>
                {verification.valid ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                {verification.valid
                  ? `Audit chain verified. ${verification.length} events, no integrity breaks detected.`
                  : `Integrity break at event #${verification.breakIndex}: ${verification.breakReason}.`}
              </div>
            )}
            <div className="mb-2 flex items-center gap-2">
              <Button size="sm" variant="danger" onClick={() => { tamperAudit(); setVerification(null); }}><AlertTriangle size={13} /> Tamper (demo)</Button>
              {tampered && <Button size="sm" variant="subtle" onClick={() => { restoreAudit(); setVerification(null); }}><Wrench size={13} /> Restore</Button>}
              <span className="text-[11px] text-slate-500">Alter a row, then re-verify to see detection.</span>
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="sticky top-0 bg-ink-850 text-slate-500">
                  <tr><th className="px-2 py-1">#</th><th className="px-2 py-1">Action</th><th className="px-2 py-1">Actor</th><th className="px-2 py-1">Hash</th></tr>
                </thead>
                <tbody className="font-mono">
                  {auditLedger.map((e) => (
                    <tr key={e.eventId} className={`border-t border-white/5 ${e.tampered ? 'bg-critical/10' : ''}`}>
                      <td className="px-2 py-1 text-slate-500">{e.sequence}</td>
                      <td className="px-2 py-1 text-slate-300">{e.action}</td>
                      <td className="px-2 py-1 text-slate-500">{e.actor}</td>
                      <td className="px-2 py-1 text-accent/80" title={e.currentHash}>{e.currentHash.slice(0, 10)}…</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
