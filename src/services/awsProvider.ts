/**
 * AWS provider umbrella.
 *
 * Demo mode runs entirely on the LocalDemoProvider — no credentials, no network.
 * These interfaces describe the production integration surface; each concrete
 * AWS provider reports `isConfigured()` and is only used when credentials are
 * present in the environment. Nothing here is invoked during the local demo.
 */

export type ProviderMode = 'local-demo' | 'aws';

export interface ProviderStatus {
  id: string;
  service: string;
  configured: boolean;
  mode: ProviderMode;
  note: string;
}

/** Reads (optional) Vite env vars without ever requiring them. */
function env(key: string): string | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = (import.meta as any)?.env;
    return e ? e[key] : undefined;
  } catch {
    return undefined;
  }
}

export const AWS_REGION = env('VITE_AWS_REGION');
/** Used by the still-stub providers (Neptune, OpenSearch, Greengrass) — unchanged. */
export const AWS_CONFIGURED = Boolean(env('VITE_AWS_REGION') && env('VITE_AWS_ENABLED') === 'true');

/**
 * Bedrock availability is determined at RUNTIME by pinging the local proxy
 * (server/bedrockServer.mjs), never by a build-time flag. The browser bundle
 * never holds an AWS secret; the proxy is the only place credentials live.
 * Until the first health check resolves (or if the proxy isn't running),
 * this is false and the app runs entirely on LocalDemoProvider — unchanged
 * offline-first behavior.
 */
export interface BedrockHealth {
  configured: boolean;
  region?: string;
  modelId?: string;
  modelAvailable?: boolean;
  reason?: string;
}

let bedrockHealth: BedrockHealth = { configured: false, reason: 'not checked yet' };

export function getBedrockHealth(): BedrockHealth {
  return bedrockHealth;
}

export async function checkBedrockHealth(): Promise<BedrockHealth> {
  try {
    const res = await fetch('/api/bedrock/health', { signal: AbortSignal.timeout(3000) });
    bedrockHealth = await res.json();
  } catch {
    bedrockHealth = { configured: false, reason: 'Bedrock proxy unreachable (run `npm run bedrock-proxy`).' };
  }
  return bedrockHealth;
}

export interface FusionProvider {
  readonly id: string;
  readonly mode: ProviderMode;
  isConfigured(): boolean;
  status(): ProviderStatus;
}

export const LocalDemoProvider: FusionProvider = {
  id: 'local-demo',
  mode: 'local-demo',
  isConfigured: () => true,
  status: () => ({
    id: 'local-demo',
    service: 'Edge Local Fusion (LocalDemoProvider)',
    configured: true,
    mode: 'local-demo',
    note: 'Powers the entire demo: ingestion, resolution, contradiction, scoring, queue, audit — all on-device.',
  }),
};
