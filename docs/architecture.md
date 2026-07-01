# Mosaic Edge — Architecture

## Design principle
A disconnected-first tool must do all decision-critical work **on the node**. The cloud is for scale, durability and heavier reasoning — never a dependency for triage. So the fusion pipeline is a **pure, deterministic function** that runs locally and is also what powers Timeline Replay and What-Changed.

```
reports ── fuse(reports, asOf, corrections) ──▶ FusionState
                 │
   resolveEntities → detectContradictions → computeAlerts → buildGraph
```

## Edge / Disconnected Field Node — *implemented in demo*
| Component | Module | Role |
|---|---|---|
| Local report adapters & parsing | `data/reports.ts` | Ingest + validate report bundles (JSON upload supported) |
| Language normalization | `lib/normalize.ts` | Unicode/diacritic strip, Arabic alias dictionary, EN/ES synonym folding |
| Entity resolution | `services/entityResolutionEngine.ts` | Union-find clustering from name/coords/context/time signals; explainable merges |
| Contradiction engine | `services/contradictionEngine.ts` | Group by entity+predicate; favor by reliability×freshness×corroboration |
| Priority scoring | `services/priorityScoringEngine.ts` | Transparent 5-factor weighted score |
| Evidence graph | `services/graphBuilder.ts` | Geographic layout, support/contradict/depends-on edges |
| Local encrypted store + sync queue | `store/useStore.ts`, `services/syncQueueService.ts` | `localStorage` persistence; store-and-forward queue |
| Audit ledger | `services/auditLedgerService.ts` | SHA-256 hash chain (`lib/sha256.ts`) |
| Greengrass target | `services/greengrassProvider.ts` | Packaging descriptor for edge deployment |

## Cloud / Connected Environment — *production integration path*
| AWS service | Provider | Status | Purpose |
|---|---|---|---|
| Amazon S3 | (architecture) | stub | Encrypted evidence & event storage |
| Amazon Bedrock | `services/bedrockProvider.ts` + `server/bedrockServer.mjs` | **real, working** | Source-grounded NLP summaries via the Converse API — **constrained: must return citations** |
| Amazon OpenSearch | `services/opensearchProvider.ts` | stub | Entity search & cross-report correlation at scale |
| Amazon Neptune | `services/neptuneProvider.ts` | stub | Durable knowledge graph & link analysis |
| AWS DataSync / IoT Greengrass | `services/greengrassProvider.ts` | stub | Secure store-and-forward on reconnect |
| IAM · KMS · CloudWatch | (architecture) | stub | Least privilege, encryption, monitoring |

Each provider implements `FusionProvider` with `isConfigured()`. Bedrock's is a **runtime health check** (`getBedrockHealth()` in `services/awsProvider.ts`, refreshed by pinging `server/bedrockServer.mjs`'s `/bedrock/health` route) rather than a static env flag — it reflects whether the local proxy is actually reachable and able to invoke the model right now. The other three still read `VITE_AWS_*` build-time env vars. With no proxy running and no env set, only `LocalDemoProvider` is active and **the entire demo runs locally**.

The Bedrock proxy is a small standalone Node process — the *only* place a real AWS credential is used. It is never bundled into the browser build; the browser only ever talks to `/api/bedrock/*`, which Vite's dev server proxies to `localhost:8787`. See the README's "AWS integration (real, optional)" section for how to run it.

## Interfaces
- `FusionProvider { id, mode, isConfigured(), status() }`
- `BedrockProvider.summarize(req: BedrockRequest): Promise<BedrockStructuredAnswer>` — receives a *minimal* fused context (`reportIds`, `alertIds`, `entityIds`, `facts`), must return non-empty `citations`. When configured, this makes a real HTTP call to the local proxy; the proxy calls Bedrock's Converse API and rejects any model response missing a `citations` array.
- `OpenSearchProvider.correlate(query): Promise<CorrelationHit[]>`
- `NeptuneProvider.upsertGraph(graph)` / `queryRiskPath(entityId)`

## Offline behavior
Ingestion, resolution, contradiction detection and scoring run unchanged. New analyst actions append to the **sync queue** with their **original timestamps**; the **audit ledger** records every action with the network state at the time. State survives refresh via `localStorage`.

## Sync behavior
On reconnect, `synchronize()` (connected-only) flushes queued items, marks them synced, preserves `createdAt`, and emits a **SyncReceipt** with an integrity hash over the synced item set. The receipt and the flush are themselves audited.

## Data segregation (roles)
`services/roleService.ts` enforces redaction: **Field Analyst** (full), **Operations Lead** (HUMINT/SIGINT narratives + source names redacted; conclusions/provenance counts retained), **Auditor** (full ledger, hashes, receipts, merge decisions).

## Security controls
Synthetic-data labeling; tamper-evident chain (`previousHash + timestamp + actor + action + objectId + details`); provenance preserved end-to-end; classification tags; role redaction; human review for low-confidence merges; no automatic irreversible actions. Production adds KMS encryption at rest/in transit and IAM least privilege.

## Scalability approach
Edge nodes triage locally and forward to the cloud, where OpenSearch/Neptune merge many nodes' graphs and Bedrock handles heavier reasoning. The pure fusion function is embarrassingly cache-friendly and re-runs in well under a millisecond on this dataset.

## Cost-conscious deployment notes
- Forward only deltas/evidence, not raw streams (limits egress).
- Bedrock invoked on-demand with minimal context, not per-report.
- Single-node profile draws ≈180 W of a 500 W budget; ~10k report local capacity.
- Local triage means most reports never need a cloud round-trip.
