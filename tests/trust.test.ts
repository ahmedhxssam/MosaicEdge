import { describe, it, expect } from 'vitest';
import { appendEvent, verifyChain, tamperEvent, GENESIS_HASH } from '@/services/auditLedgerService';
import { makeSyncEvent, synchronize, queuedItems } from '@/services/syncQueueService';
import { redactedSourceName, redactNarrative, canSeeRawNarrative } from '@/services/roleService';
import { sha256 } from '@/lib/sha256';
import type { AuditEvent } from '@/types';

function buildChain(): AuditEvent[] {
  const chain: AuditEvent[] = [];
  for (let i = 0; i < 5; i++) {
    chain.push(
      appendEvent(chain, {
        timestamp: `2026-06-30T1${i}:00:00.000Z`,
        actor: 'field-analyst',
        action: `action.${i}`,
        objectType: 'report',
        objectId: `R-00${i}`,
        networkState: 'connected',
        details: `event ${i}`,
      }),
    );
  }
  return chain;
}

describe('sha256', () => {
  it('matches a known vector', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it('hashes the empty string correctly', () => {
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});

describe('audit chain', () => {
  it('verifies an untampered chain', () => {
    const chain = buildChain();
    const v = verifyChain(chain);
    expect(v.valid).toBe(true);
    expect(v.breakIndex).toBeNull();
  });

  it('chains each event to the previous hash', () => {
    const chain = buildChain();
    expect(chain[0].previousHash).toBe(GENESIS_HASH);
    expect(chain[1].previousHash).toBe(chain[0].currentHash);
  });

  it('detects tampering and localizes the break', () => {
    const chain = tamperEvent(buildChain(), 2);
    const v = verifyChain(chain);
    expect(v.valid).toBe(false);
    expect(v.breakIndex).toBe(2);
  });
});

describe('sync queue persistence & store-and-forward', () => {
  it('queues items while offline and preserves original timestamps on sync', () => {
    const created = '2026-06-30T13:00:00.000Z';
    const q = [
      makeSyncEvent({ objectType: 'report', objectId: 'R-101', label: 'HUMINT R-101', createdAt: created, queuedAt: '2026-06-30T13:01:00.000Z', networkState: 'offline' }),
    ];
    expect(queuedItems(q).length).toBe(1);

    // Offline sync is refused.
    expect(synchronize(q, 'offline', 'field-analyst', '2026-06-30T14:00:00.000Z').receipt).toBeNull();

    // Connected sync flushes and issues a receipt; original createdAt preserved.
    const out = synchronize(q, 'connected', 'field-analyst', '2026-06-30T14:00:00.000Z');
    expect(out.receipt).not.toBeNull();
    expect(out.receipt!.itemCount).toBe(1);
    expect(out.queue[0].status).toBe('synced');
    expect(out.queue[0].createdAt).toBe(created);
    expect(out.receipt!.integrityHash).toHaveLength(64);
  });

  it('survives a JSON round-trip (persistence simulation)', () => {
    const q = [makeSyncEvent({ objectType: 'report', objectId: 'R-9', label: 'x', createdAt: '2026-06-30T13:00:00.000Z', queuedAt: '2026-06-30T13:00:00.000Z', networkState: 'offline' })];
    const round = JSON.parse(JSON.stringify(q));
    expect(round[0].objectId).toBe('R-9');
    expect(round[0].status).toBe('queued');
  });
});

describe('role-aware redaction', () => {
  const humint = { sourceName: 'Field Team Bravo-2', sourceType: 'HUMINT' as const, rawText: 'sensitive narrative', translatedText: undefined };

  it('redacts HUMINT source name for Operations Lead', () => {
    expect(redactedSourceName('operations-lead', humint)).toMatch(/redacted/);
    expect(redactedSourceName('field-analyst', humint)).toBe('Field Team Bravo-2');
  });

  it('redacts HUMINT narrative for Operations Lead but not Field Analyst', () => {
    expect(canSeeRawNarrative('operations-lead', 'HUMINT')).toBe(false);
    expect(canSeeRawNarrative('field-analyst', 'HUMINT')).toBe(true);
    expect(redactNarrative('operations-lead', humint)).toMatch(/redacted/);
    expect(redactNarrative('auditor', humint)).toBe('sensitive narrative');
  });

  it('does not redact OSINT/GEOINT for any role', () => {
    expect(canSeeRawNarrative('operations-lead', 'OSINT')).toBe(true);
    expect(canSeeRawNarrative('operations-lead', 'GEOINT')).toBe(true);
  });
});
