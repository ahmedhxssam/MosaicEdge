/**
 * Amazon Bedrock provider. When the local proxy (server/bedrockServer.mjs) is
 * running with real AWS credentials, this backs the Analyst Console with a
 * genuine Bedrock (Claude) invocation. The contract is intentionally
 * constrained: it receives ONLY the relevant fused context and is required to
 * return citations — a model answer without provenance is rejected, same as
 * the deterministic local engine's guarantee.
 *
 * In demo mode (no proxy / no credentials) this is NOT configured; the
 * deterministic console engine (analystConsoleEngine.ts) is used instead.
 */

import type { FusionProvider, ProviderStatus } from './awsProvider';
import { getBedrockHealth } from './awsProvider';

export interface BedrockRequest {
  question: string;
  /** Pre-selected, minimal context — never the full dataset. */
  context: { reportIds: string[]; alertIds: string[]; entityIds: string[]; facts: string[] };
}

export interface BedrockStructuredAnswer {
  answer: string;
  citations: string[]; // required, non-empty unless genuinely no facts apply
  confidence: number;
  modelId?: string;
}

export const BedrockProvider: FusionProvider & {
  modelId: string;
  summarize(req: BedrockRequest): Promise<BedrockStructuredAnswer>;
} = {
  id: 'bedrock',
  mode: 'aws',
  modelId: getBedrockHealth().modelId ?? 'anthropic.claude-3-5-sonnet (configurable)',
  isConfigured: () => getBedrockHealth().configured,
  status: (): ProviderStatus => {
    const h = getBedrockHealth();
    return {
      id: 'bedrock',
      service: 'Amazon Bedrock — source-grounded summaries',
      configured: h.configured,
      mode: 'aws',
      note: h.configured
        ? `Live — ${h.modelId} in ${h.region}. Receives minimal fused context; must return citations.`
        : h.reason ?? 'Not configured. Demo uses the deterministic console engine.',
    };
  },
  async summarize(req: BedrockRequest): Promise<BedrockStructuredAnswer> {
    const h = getBedrockHealth();
    if (!h.configured) {
      throw new Error(h.reason ?? 'Bedrock provider not configured — running in local demo mode.');
    }
    const res = await fetch('/api/bedrock/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(20000),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? `Bedrock call failed (${res.status})`);
    return body as BedrockStructuredAnswer;
  },
};
