/**
 * Amazon Neptune provider (optional) — durable knowledge graph & link analysis.
 * Demo builds the evidence graph locally; this persists it for multi-node,
 * cross-time link analysis.
 */

import type { EvidenceGraph } from '@/types';
import type { FusionProvider, ProviderStatus } from './awsProvider';
import { AWS_CONFIGURED } from './awsProvider';

export const NeptuneProvider: FusionProvider & {
  upsertGraph(graph: EvidenceGraph): Promise<{ nodes: number; edges: number }>;
  queryRiskPath(fromEntityId: string): Promise<string[]>;
} = {
  id: 'neptune',
  mode: 'aws',
  isConfigured: () => AWS_CONFIGURED,
  status: (): ProviderStatus => ({
    id: 'neptune',
    service: 'Amazon Neptune — graph persistence & link analysis',
    configured: AWS_CONFIGURED,
    mode: 'aws',
    note: 'Optional. Persists the provenance graph for durable, cross-node link analysis. Demo graph is in-memory.',
  }),
  async upsertGraph(): Promise<{ nodes: number; edges: number }> {
    if (!AWS_CONFIGURED) throw new Error('Neptune provider not configured — in-memory graph active.');
    throw new Error('Neptune upsert not implemented in the prototype.');
  },
  async queryRiskPath(): Promise<string[]> {
    if (!AWS_CONFIGURED) throw new Error('Neptune provider not configured.');
    throw new Error('Neptune path query not implemented in the prototype.');
  },
};
