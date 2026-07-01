/**
 * Tamper-evident audit ledger.
 *
 * Each event chains to the previous via:
 *   currentHash = SHA-256(previousHash + timestamp + actor + action + objectId + details)
 *
 * Any modification to a recorded field breaks the chain at that point, which
 * `verifyChain` detects and localizes. The genesis link uses a fixed seed hash.
 */

import type { AuditEvent, NetworkState, UserRole } from '@/types';
import { sha256 } from '@/lib/sha256';

export const GENESIS_HASH = '0'.repeat(64);

export function hashEvent(e: Omit<AuditEvent, 'currentHash' | 'eventId' | 'sequence' | 'tampered'>): string {
  return sha256(`${e.previousHash}${e.timestamp}${e.actor}${e.action}${e.objectId}${e.details}`);
}

export interface NewEventInput {
  timestamp: string;
  actor: UserRole;
  action: string;
  objectType: string;
  objectId: string;
  networkState: NetworkState;
  details: string;
}

export function appendEvent(chain: AuditEvent[], input: NewEventInput): AuditEvent {
  const last = chain[chain.length - 1];
  const previousHash = last ? last.currentHash : GENESIS_HASH;
  const sequence = last ? last.sequence + 1 : 0;
  const base = {
    timestamp: input.timestamp,
    actor: input.actor,
    action: input.action,
    objectType: input.objectType,
    objectId: input.objectId,
    previousHash,
    networkState: input.networkState,
    details: input.details,
  };
  const currentHash = hashEvent(base);
  return {
    eventId: `AE-${String(sequence).padStart(4, '0')}-${currentHash.slice(0, 6)}`,
    sequence,
    ...base,
    currentHash,
  };
}

export interface ChainVerification {
  valid: boolean;
  length: number;
  breakIndex: number | null;
  breakReason?: string;
}

export function verifyChain(chain: AuditEvent[]): ChainVerification {
  let prevHash = GENESIS_HASH;
  for (let i = 0; i < chain.length; i++) {
    const e = chain[i];
    if (e.previousHash !== prevHash) {
      return { valid: false, length: chain.length, breakIndex: i, breakReason: 'previousHash does not match prior link' };
    }
    const recomputed = hashEvent(e);
    if (recomputed !== e.currentHash) {
      return { valid: false, length: chain.length, breakIndex: i, breakReason: 'currentHash does not match event contents' };
    }
    prevHash = e.currentHash;
  }
  return { valid: true, length: chain.length, breakIndex: null };
}

/** Demo helper: corrupt one event's details WITHOUT re-hashing, to prove detection. */
export function tamperEvent(chain: AuditEvent[], index: number): AuditEvent[] {
  return chain.map((e, i) =>
    i === index ? { ...e, details: e.details + ' [ALTERED]', tampered: true } : e,
  );
}
