/**
 * Store-and-forward sync queue.
 *
 * While disconnected, every analyst action (a new report, a correction, a note)
 * is appended to a local queue with its ORIGINAL event timestamp preserved.
 * On reconnect, `synchronize` flushes queued items and returns a verifiable
 * sync receipt with an integrity hash over the synced item set.
 */

import type { NetworkState, SyncEvent, SyncReceipt, UserRole } from '@/types';
import { sha256 } from '@/lib/sha256';

export function makeSyncEvent(input: {
  objectType: SyncEvent['objectType'];
  objectId: string;
  label: string;
  createdAt: string;
  queuedAt: string;
  networkState: NetworkState;
  bytes?: number;
}): SyncEvent {
  return {
    id: `SYNC-${input.objectId}-${input.createdAt.slice(11, 19).replace(/:/g, '')}`,
    objectType: input.objectType,
    objectId: input.objectId,
    label: input.label,
    createdAt: input.createdAt,
    queuedAt: input.queuedAt,
    status: 'queued',
    networkStateAtCreation: input.networkState,
    bytes: input.bytes ?? estimateBytes(input.label),
  };
}

function estimateBytes(label: string): number {
  return 320 + label.length * 6; // rough synthetic payload size
}

export function queuedItems(queue: SyncEvent[]): SyncEvent[] {
  return queue.filter((s) => s.status === 'queued' || s.status === 'failed');
}

export function syncedItems(queue: SyncEvent[]): SyncEvent[] {
  return queue.filter((s) => s.status === 'synced');
}

export interface SyncOutcome {
  queue: SyncEvent[];
  receipt: SyncReceipt | null;
  error?: string;
}

/**
 * Flush queued items. Requires a connected link. Preserves original timestamps
 * and returns a tamper-evident receipt over the synced item ids.
 */
export function synchronize(
  queue: SyncEvent[],
  networkState: NetworkState,
  actor: UserRole,
  nowIso: string,
): SyncOutcome {
  if (networkState !== 'connected') {
    return { queue, receipt: null, error: 'Link not connected — items remain queued.' };
  }
  const pending = queuedItems(queue);
  if (pending.length === 0) {
    return { queue, receipt: null, error: 'Nothing to synchronize.' };
  }

  const receiptId = `RCPT-${nowIso.slice(11, 19).replace(/:/g, '')}-${sha256(nowIso).slice(0, 4)}`;
  const totalBytes = pending.reduce((s, p) => s + p.bytes, 0);
  const integrityHash = sha256(pending.map((p) => `${p.objectId}:${p.createdAt}`).join('|') + nowIso);

  const updated = queue.map((s) =>
    s.status === 'queued' || s.status === 'failed'
      ? { ...s, status: 'synced' as const, syncedAt: nowIso, receiptId }
      : s,
  );

  const receipt: SyncReceipt = {
    id: receiptId,
    timestamp: nowIso,
    itemCount: pending.length,
    itemIds: pending.map((p) => p.objectId),
    totalBytes,
    integrityHash,
    durationMs: 220 + pending.length * 140,
    actor,
  };

  return { queue: updated, receipt };
}
