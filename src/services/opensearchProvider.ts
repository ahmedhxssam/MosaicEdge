/**
 * Amazon OpenSearch provider (optional) — entity search & cross-report
 * correlation at scale. Demo mode resolves and correlates locally; this is the
 * production index surface.
 */

import type { FusionProvider, ProviderStatus } from './awsProvider';
import { AWS_CONFIGURED } from './awsProvider';

export interface CorrelationHit {
  entityId: string;
  score: number;
  reportIds: string[];
}

export const OpenSearchProvider: FusionProvider & {
  index: string;
  correlate(query: string): Promise<CorrelationHit[]>;
} = {
  id: 'opensearch',
  mode: 'aws',
  index: 'mosaic-edge-entities',
  isConfigured: () => AWS_CONFIGURED,
  status: (): ProviderStatus => ({
    id: 'opensearch',
    service: 'Amazon OpenSearch — entity search & correlation',
    configured: AWS_CONFIGURED,
    mode: 'aws',
    note: 'Optional. Scales fuzzy/multilingual correlation beyond a single edge node. Demo correlates locally.',
  }),
  async correlate(): Promise<CorrelationHit[]> {
    if (!AWS_CONFIGURED) throw new Error('OpenSearch provider not configured — local correlation active.');
    throw new Error('OpenSearch correlation not implemented in the prototype.');
  },
};
