# Mosaic Edge

### Disconnected Intelligence Fusion for Civilian Protection

> Turn fragmented reports into verifiable, time-sensitive field intelligence — even when the network disappears.

Mosaic Edge is an **offline-first, provenance-first intelligence-fusion workstation** for field analysts working in disconnected or degraded environments. It ingests fragmented, multi-source, multilingual reporting; resolves people, places, assets and events across languages and naming variations; detects contradictions; assigns transparent confidence; prioritizes urgent civilian-safety risks; and produces explainable, source-attributed intelligence products — all on a single edge node with **no AWS credentials, API keys or internet connection required**.

---

## The thesis

> Most intelligence platforms produce a confident answer.
> **Mosaic Edge shows the analyst what it knows, what it does not know, what sources conflict, what changed, and what must be verified before action.**

The differentiator is not entity extraction. It is **conflict-aware, provenance-first fusion**: Mosaic Edge does not silently merge conflicting reports. It surfaces uncertainty, freshness, reliability, corroboration and information gaps so humans can make defensible decisions under time pressure.

## Problem statement

In a disaster or crisis, field teams receive a flood of conflicting, multilingual reports (HUMINT, OSINT, GEOINT, comms summaries) while connectivity is intermittent. Conventional dashboards either (a) require the cloud, or (b) collapse everything into one confident answer that hides the disagreement. Acting on a stale or uncorroborated claim can strand patients or route a convoy into danger.

## Scenario — *Venezuela Earthquake Response Exercise*

The core demo is a **simulated edge-fusion exercise based on the June 2026 Venezuela earthquake response**. Public crisis facts provide context; the 30 field reports are controlled synthetic data for repeatable evaluation. The analyst must triage overloaded hospital capacity in La Guaira, contested Caracas-La Guaira Highway access, shelter and sanitation risk, stale route claims, and misinformation about hospital evacuation status.

Context anchors include public reporting from [AP](https://apnews.com/article/de59847a5afb28f799d693501f2385aa), [The Guardian](https://www.theguardian.com/world/2026/jun/30/tonnes-and-tonnes-of-rubble-more-than-58000-buildings-estimated-to-have-been-destroyed-in-venezuela-earthquakes), and [WIRED](https://www.wired.com/story/space-lasers-show-venezuela-earthquakes-reshaped-earth-crust). The app does **not** claim the synthetic reports are real on-the-ground reports.

## Why Mosaic Edge differs from a conventional fusion dashboard

| Conventional dashboard | Mosaic Edge |
|---|---|
| One confident answer | Favored interpretation **+ the dissenting sources** |
| Opaque AI score | **Transparent 0–100 breakdown** (5 weighted factors) |
| Cloud-dependent | **Runs fully offline** on the edge node |
| Silent entity merges | **Explainable merges** you can confirm / reject / undo |
| Static snapshot | **Timeline replay** + "what changed and why" |
| No provenance | **Every conclusion cites its sources**; tamper-evident ledger |

## Features (all implemented and working)

- **Multi-source ingestion** — 30 synthetic reports across HUMINT / OSINT / GEOINT / SIGINT.
- **Multilingual entity resolution** — English, Arabic, Spanish, with an Arabic alias dictionary; every merge shows *why* (name similarity, shared coordinates, shared context, time overlap, dictionary hit) and its confidence.
- **Conflict-aware confidence ("Truth Tensions")** — competing claims with the favored one chosen from reliability × freshness × corroboration, and a plain-English rationale.
- **Transparent priority queue** — 35% civilian safety · 20% immediacy · 20% corroboration · 15% source confidence · 10% freshness, with full per-alert breakdown.
- **Source-attributed, exportable intelligence brief** — Markdown / print, with supporting *and* contradicting sources, timeline, recommended verification, risks & limitations, citations.
- **Offline mode + sync queue** — go Offline, ingest a report, watch it queue locally; reconnect and run a verifiable store-and-forward sync that preserves original timestamps and issues a receipt.
- **Tamper-evident audit chain** — SHA-256 hash chain over every event; a one-click **Verify** (and a **Tamper** demo that the verifier catches).
- **Interactive evidence graph** with a **Risk Path** mode (Hospital → coastal highway → Tacagua Viaduct → aftershock damage).
- **Timeline replay** with *"explain why the assessment changed."*
- **What-Changed delta brief** — new/escalated alerts, new links, new contradictions, stale reports, sync arrivals, analyst decisions, verification tasks.
- **Analyst console** — guided, source-grounded answers with clickable citations; deterministic by default, and backed by a **real, live Amazon Bedrock call** (Converse API, citations required) when `npm run bedrock-proxy` is running with AWS credentials — see [AWS integration (real, optional)](#aws-integration-real-optional) below.
- **Real imported datasets, honestly labelled** — the full captured GDELT 2.0 Translingual snapshot (1,302 mentions + 570 events, 100% joined — real actors, geo, CAMEO, Goldstein scale) and the full WikiANN test set (30,000 real rows decoded across en/ar/es) power the **Data & Sources** page evaluation metrics, kept strictly separate from the synthetic scenario.
- **Human-in-the-loop corrections** — confirm/reject merges, mark outdated, adjust reliability, flag for verification; everything feeds confidence, the ledger and What-Changed.
- **Role-aware redaction** — Field Analyst / Operations Lead / Auditor.
- **Edge readiness**, **AWS architecture**, **Security & guardrails**, **Evaluation** (metrics computed live from ground truth), **Presentation Mode**.

## Tech stack

React 18 · TypeScript · Vite · Tailwind CSS · Zustand · Recharts · Lucide · Vitest. Deterministic custom fuzzy matching and a self-contained SHA-256 (no native crypto dependency). Pure client-side — the architecture *is* the thesis: a disconnected-first tool needs no server.

> **Why Vite SPA instead of Next.js?** Mosaic Edge is offline-first and runs entirely in the browser/edge runtime — there is no server tier to render, so a pure client bundle is the most faithful (and most robust) architecture for "works with zero network."

## Local setup

```bash
cd mosaic-edge
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # production bundle
npm run typecheck  # tsc --noEmit
npm test           # vitest (35 tests)
```

No `.env`, AWS credentials, or network access needed for the core demo. State persists in `localStorage`; **Load Demo** resets to a clean baseline.

### AWS integration (real, optional)

The Analyst Console can be backed by a genuine Amazon Bedrock call. Nothing else in the app depends on this — it's purely additive.

```bash
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_SESSION_TOKEN=...       # if using temporary/STS credentials
export AWS_DEFAULT_REGION=us-east-1
npm run bedrock-proxy               # starts a local proxy on :8787 — the ONLY place credentials are used
npm run dev                          # in a second terminal — Vite proxies /api to the proxy above
```

The browser bundle never sees an AWS secret. `server/bedrockServer.mjs` reads credentials from the process environment only, calls Bedrock's provider-agnostic Converse API, and enforces the same contract as the local engine: **every answer must include citations** or it's rejected. Open **Analyst Console** — a green "LIVE · Amazon Bedrock" badge means it's connected; without the proxy running, it falls back to the deterministic local engine with no errors.

Default model is **Amazon Nova** (`us.amazon.nova-lite-v1:0`) — Anthropic Claude models on Bedrock require a one-time AWS Marketplace subscription per model/account, which some restricted IAM roles (e.g. workshop/temporary accounts) lack permission to complete; Nova needs no such step. Override with `BEDROCK_MODEL_ID` once Claude marketplace access is confirmed for your account — no code change needed, since the proxy uses the model-agnostic Converse API.

## Demo workflow (≈3 min)

See [`docs/demo-script.md`](docs/demo-script.md). In short: open **Command Overview** → **Entity Graph** (multilingual resolution + risk path) → **Priority Queue / Truth Tensions** (coastal highway closure favored over stale open-route reports) → set **Offline**, add a report on **Live Feed** (it queues) → set **Connected**, **Sync & Audit → Synchronize** (receipt) → **What Changed?** → **Verify audit chain**.

## Architecture summary

Two zones (see [`docs/architecture.md`](docs/architecture.md)):

- **Edge / disconnected node (implemented):** local adapters, language normalization, entity resolution, priority scoring, encrypted local store, sync queue, audit ledger — all offline-capable. Packaged conceptually as AWS IoT Greengrass components.
- **Cloud / connected (production path):** S3 (encrypted evidence), Bedrock (source-grounded summaries), OpenSearch (correlation), Neptune (graph), DataSync (store-and-forward), IAM/KMS/CloudWatch.

The demo is powered entirely by the **LocalDemoProvider** and needs no cloud dependency to run. Bedrock is the one cloud provider wired to a **real, working** implementation (`server/bedrockServer.mjs` + `services/bedrockProvider.ts`) — see [AWS integration (real, optional)](#aws-integration-real-optional). Neptune, OpenSearch and Greengrass remain interface stubs that report `isConfigured()` and describe the production integration surface, matching this hackathon's timeframe.

## AWS integration roadmap

Greengrass deployment → ~~Bedrock structured extraction~~ **(real, see above)** → Neptune knowledge graph → OpenSearch correlation → S3 encrypted persistence → DataSync store-and-forward → KMS encryption → IAM least privilege → CloudWatch monitoring.

## Security principles

Synthetic data labeling · local-first operation · tamper-evident audit chain · source provenance · classification tags · role-aware redaction · least-privilege concept · encryption (production) · human review for low-confidence merges & contradictions · **no automatic irreversible actions** · no real-world targeting.

**Decision guardrails:** low-confidence claims cannot create a Critical alert alone · contradictions are shown, never hidden · unverified reports are labeled · no recommendation omits provenance · corrections are auditable · information gaps are surfaced.

## Limitations

- Single synthetic scenario (30 reports); metrics characterize the prototype on this dataset, **not production accuracy**.
- Resolution uses a curated Arabic alias dictionary; unseen scripts/spellings would lower cross-language recall.
- Reject-merge records the decision and updates review status but does not physically split a cluster in this prototype.
- Latency is measured in JS; a production edge node with batched NLP differs.

## Ethical use constraints

Mosaic Edge is a **defensive, humanitarian, civilian-protection** prototype on synthetic data. It deliberately excludes weapons targeting, facial recognition, real surveillance/interception, and real SIGINT collection. "SIGINT" here means simulated, lawful, synthetic communications summaries only. Recommended actions are non-violent verification/coordination steps.

## Evaluation methodology

See [`docs/evaluation.md`](docs/evaluation.md). Precision/recall by pair-counting against gold entity clusters; contradiction recall/precision vs labelled conflicts; critical-alert recall@5; stale-report identification; measured local latency; audit-chain and sync validation. **Run Validation** recomputes everything live.

## Repository layout

```
src/
  types/        domain types
  data/         synthetic scenario, entities, reports, ground truth
  lib/          sha256, normalize, fuzzy, geo, freshness, format
  services/     fusion engines + sync/audit/brief/console/eval + AWS provider stubs
  store/        Zustand store (persistence, corrections, sync, audit)
  hooks/        useFusion / useDelta / useTimelineSeries
  components/   ui, common (cards/chips), viz (basemap/graph/charts), layout
  features/     14 pages (overview, feed, queue, graph, timeline, …)
tests/          vitest specs
docs/           demo-script, architecture, evaluation
```

## Future roadmap

Pluggable extractors (Bedrock/Comprehend) · real Greengrass deployment & DataSync · multi-node graph merge via Neptune · richer multilingual dictionaries & transliteration · configurable scoring policies · per-source reliability learning from analyst feedback.

---

*Synthetic/simulated demo reports. Public crisis facts are contextual anchors only. Non-operational. Built as a hackathon prototype.*
