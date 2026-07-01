/**
 * Local Bedrock proxy — the ONLY place real AWS credentials are used.
 *
 * Mosaic Edge's browser bundle never sees an AWS secret; that would ship it to
 * every visitor's devtools. This tiny Node process reads credentials from the
 * environment (standard AWS SDK credential chain: AWS_ACCESS_KEY_ID,
 * AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN, AWS_REGION/AWS_DEFAULT_REGION) and
 * exposes a minimal HTTP contract that the Vite dev server proxies at /api/*.
 *
 * If this process is not running (or has no usable credentials), the app
 * simply stays in LocalDemoProvider mode — nothing about the offline-first
 * demo depends on it.
 *
 * Contract enforced here (matches src/services/bedrockProvider.ts):
 *   POST /api/bedrock/summarize { question, context } -> { answer, citations[], confidence }
 *   A response with an empty citations array is rejected — an answer must be grounded.
 */
import http from 'node:http';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const PORT = Number(process.env.BEDROCK_PROXY_PORT || 8787);
const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
// Model choice note (2026-07-01, this AWS Workshop Studio account): Anthropic models on Bedrock
// require a one-time AWS Marketplace subscription/EULA action per model. The workshop's
// WSParticipantRole lacks aws-marketplace:Subscribe, so Claude invocations intermittently fail
// with an access-denied error outside our control. Amazon Nova is a first-party Bedrock model
// with no marketplace step and invoked reliably in testing — used as the default so the live
// integration is dependable for a demo. Uses the Converse API, which is provider-agnostic, so
// switching back to a Claude model ID (once marketplace access is granted) needs no code change.
const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'us.amazon.nova-lite-v1:0';

const hasCreds = () => Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

const runtime = new BedrockRuntimeClient({ region: REGION });

// Health checks do a real (cheap) invoke rather than trust a static model list — ListFoundationModels
// doesn't reflect inference-profile or marketplace-subscription access, so it can't actually tell you
// whether a call will succeed. Cached briefly to limit cost.
let healthCache = null;
let healthCacheAt = 0;
const HEALTH_TTL_MS = 30_000;

async function pingModel() {
  await runtime.send(
    new ConverseCommand({
      modelId: MODEL_ID,
      messages: [{ role: 'user', content: [{ text: 'ping' }] }],
      inferenceConfig: { maxTokens: 5 },
    }),
  );
}

const SYSTEM_PROMPT = `You are the Mosaic Edge Analyst Console, a source-grounded field-intelligence assistant.
Rules:
- Answer ONLY using the provided facts. Never invent details not present in them.
- Every answer must cite at least one of the provided fact/report/alert IDs, UNLESS none of the facts are relevant to the question — in that case say so plainly and return an empty citations array.
- Be concise (2-4 sentences). This is a civilian-protection / humanitarian tool. Recommend only non-violent verification or coordination steps.
- Respond with ONLY a JSON object, no markdown fences, matching exactly:
  {"answer": string, "citations": string[], "confidence": number between 0 and 1}`;

function buildUserPrompt(question, context) {
  const facts = context.facts.map((f, i) => `[${i + 1}] ${f}`).join('\n');
  return `Question: ${question}

Available grounded facts (cite by report/alert/entity ID found inside the fact text, not by [n]):
${facts || '(no facts provided)'}

Report IDs in scope: ${context.reportIds.join(', ') || 'none'}
Alert IDs in scope: ${context.alertIds.join(', ') || 'none'}
Entity IDs in scope: ${context.entityIds.join(', ') || 'none'}`;
}

async function invokeBedrock(question, context) {
  const res = await runtime.send(
    new ConverseCommand({
      modelId: MODEL_ID,
      system: [{ text: SYSTEM_PROMPT }],
      messages: [{ role: 'user', content: [{ text: buildUserPrompt(question, context) }] }],
      inferenceConfig: { maxTokens: 500 },
    }),
  );
  const text = res.output?.message?.content?.[0]?.text ?? '';
  let parsed;
  try {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  } catch {
    throw new Error(`Bedrock returned non-JSON output: ${text.slice(0, 200)}`);
  }
  if (!Array.isArray(parsed.citations)) {
    throw new Error('Bedrock response missing citations array — rejected (contract requires provenance).');
  }
  return {
    answer: String(parsed.answer ?? ''),
    citations: parsed.citations.map(String),
    confidence: Number(parsed.confidence ?? 0.5),
    modelId: MODEL_ID,
  };
}

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  if (req.method === 'GET' && req.url === '/bedrock/health') {
    if (!hasCreds()) return send(res, 200, { configured: false, reason: 'No AWS credentials in environment.' });
    const now = Date.now();
    if (healthCache && now - healthCacheAt < HEALTH_TTL_MS) return send(res, 200, healthCache);
    try {
      await pingModel();
      healthCache = { configured: true, region: REGION, modelId: MODEL_ID, modelAvailable: true };
    } catch (err) {
      healthCache = { configured: false, region: REGION, modelId: MODEL_ID, reason: String(err?.message ?? err) };
    }
    healthCacheAt = now;
    return send(res, 200, healthCache);
  }

  if (req.method === 'POST' && req.url === '/bedrock/summarize') {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', async () => {
      try {
        const { question, context } = JSON.parse(raw);
        if (!hasCreds()) return send(res, 503, { error: 'Bedrock proxy has no AWS credentials configured.' });
        const result = await invokeBedrock(question, context);
        send(res, 200, result);
      } catch (err) {
        send(res, 502, { error: String(err?.message ?? err) });
      }
    });
    return;
  }

  send(res, 404, { error: 'not found' });
});

server.listen(PORT, () => {
  console.log(`[bedrock-proxy] listening on http://localhost:${PORT} (region=${REGION}, model=${MODEL_ID}, creds=${hasCreds()})`);
});
