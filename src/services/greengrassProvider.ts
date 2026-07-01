/**
 * AWS IoT Greengrass provider (optional) — the edge deployment & store-and-forward
 * target. Describes how the local fusion components are packaged as Greengrass
 * components and how the queue forwards to the cloud on reconnect.
 */

import type { FusionProvider, ProviderStatus } from './awsProvider';
import { AWS_CONFIGURED } from './awsProvider';

export interface GreengrassComponent {
  name: string;
  version: string;
  role: string;
}

export const GREENGRASS_COMPONENTS: GreengrassComponent[] = [
  { name: 'com.mosaicedge.ingest', version: '1.0.0', role: 'Local report adapters & parsing' },
  { name: 'com.mosaicedge.fusion', version: '1.0.0', role: 'Resolution · contradiction · scoring' },
  { name: 'com.mosaicedge.ledger', version: '1.0.0', role: 'Tamper-evident audit chain' },
  { name: 'com.mosaicedge.syncforward', version: '1.0.0', role: 'Store-and-forward to S3 / DataSync' },
];

export const GreengrassProvider: FusionProvider & {
  components: GreengrassComponent[];
  describeDeployment(): { target: string; offlineCapable: boolean; components: number };
} = {
  id: 'greengrass',
  mode: 'aws',
  components: GREENGRASS_COMPONENTS,
  isConfigured: () => AWS_CONFIGURED,
  status: (): ProviderStatus => ({
    id: 'greengrass',
    service: 'AWS IoT Greengrass — edge deployment target',
    configured: AWS_CONFIGURED,
    mode: 'aws',
    note: 'Optional. Packages the local fusion stack as edge components with store-and-forward sync. Demo simulates this locally.',
  }),
  describeDeployment() {
    return { target: 'ruggedized single-node edge gateway', offlineCapable: true, components: GREENGRASS_COMPONENTS.length };
  },
};
