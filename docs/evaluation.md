# Mosaic Edge — Evaluation

All metrics are **recomputed live** from the seeded scenario by `services/evaluationService.ts` (the **Run Validation** button on the Evaluation page). Nothing is hardcoded. The numbers below describe the prototype **on this synthetic dataset**, not production accuracy.

## Scenario ground truth (`data/groundTruth.ts`)
- **30 reports** across HUMINT/OSINT/GEOINT/SIGINT, in EN/AR/ES.
- **9 canonical entities**; **12+ multilingual alias surface forms** (Arabic, Spanish, and English spelling variants).
- **5 labelled contradictions:** Caracas-La Guaira Highway `status` (open vs closed), Hospital Dr. Jose Maria Vargas `fuelHoursRemaining` (8 vs 3), Polideportivo shelter `status` (partially-open vs closed vs capacity-only), Hospital Dr. Jose Maria Vargas `evacuationComplete` (true vs false), Tacagua Viaduct `status` (open vs closed).
- **3 stale/superseded reports:** `R-005` (highway/viaduct open), `R-007` (8h fuel), `R-026` (highway reopened).
- **3 ground-truth critical risks:** hospital-fuel, evacuation-route, misinformation.

## Entity-resolution measurement
**Pair-counting** against gold clusters (each mention's `canonicalId`). For all mention pairs we count predicted-same vs truly-same → **precision = TP/(TP+FP)**, **recall = TP/(TP+FN)**. We also report **multilingual aliases resolved**: each non-English/variant surface form must land in the cluster whose dominant canonical id matches its gold id. On the seed data the resolver produces exactly the 9 canonical entities with no false merges, and resolves the Arabic/Spanish/variant aliases (Vargas Hospital → 4 aliases / 3 languages, Caracas-La Guaira Highway → 3, Tacagua Viaduct → 3, Polideportivo shelter → 3, plus the Spanish port alias).

## Contradiction-detection measurement
Detected Truth Tensions are mapped to `(dominantCanonicalId, predicate)` and compared to the labelled set → **recall** (gold conflicts surfaced) and **precision** (detected conflicts that match a gold conflict). The engine surfaces all 5 labelled contradictions and favors the correct value in each (e.g. highway **closed**, fuel **3h**, shelter **capacity-only**, evacuation **not complete**, viaduct **closed**).

## Critical-alert recall@5
Fraction of the 3 ground-truth critical risks appearing in the top-5 ranked alerts. *Limitation:* with a small candidate set, top-5 recall can saturate — the more meaningful signal is **rank fidelity** (hospital-fuel ranks **#1**). Both are shown.

## Stale-report identification
Reports that are both **contested** (a losing claim in a contradiction) and **older than the freshness threshold (70 min)** are flagged stale; compared to the 3 labelled stale reports → recall.

## Latency measurement
The full local pipeline (resolution → contradiction → scoring → graph) is timed over 7 runs and averaged. On this dataset it completes in **single-digit milliseconds** in-browser — evidence the fusion is light enough for an edge node.

## Offline & trust validation
- **Offline queue persistence:** the sync queue survives a state round-trip to `localStorage` (checked live).
- **Sync completion:** queued items flush to `synced` with a verifiable receipt on reconnect (`tests/trust.test.ts`).
- **Audit-chain validation:** `verifyChain` confirms the SHA-256 chain end-to-end; the **Tamper** demo proves detection and localizes the broken link.

## Real-dataset evaluation (Data & Sources page)
Beyond the synthetic scenario, two real datasets are decoded and evaluated live, kept strictly separate from the Venezuela earthquake response exercise:
- **WikiANN** — all 30,000 real rows across `wikiann_en_test.parquet`, `wikiann_ar_test.parquet`, and the Spanish split (`0000.parquet`, confirmed identical to `0000 (2).parquet` via `DataFrame.equals`) are decoded offline; aggregate span/type/language stats are computed over the full corpus, and 120 real rows are embedded for a live, in-browser BIO-span re-extraction demo. Cross-lingual normalization is measured against a small hand-aligned gold set (`WIKIANN_ALIGNED`): dictionary-backed Arabic terms resolve at 100% (exact transliteration lookup), Spanish fuzzy-only matching is honestly imperfect (~43%) — and Arabic terms *outside* the alias dictionary still fail to match, a real, documented limitation rather than a hidden one.
- **GDELT 2.0 Translingual** — the full captured snapshot (1,302/1,302 mentions, 570/570 events, 100% joined on GlobalEventID) is decoded per the attached V2.0 Event Codebook; the joined view surfaces real actor names, action-geo locations, CAMEO quad class and Goldstein scale — none of it fabricated, and article text is honestly labelled unavailable (GDELT metadata never includes it).

## Automated tests (`npm test`, 35 passing)
- Multilingual resolution (EN/AR/ES), no false merges, exactly 9 entities.
- Arabic→English normalization equivalence.
- Contradiction detection (coastal highway, numeric fuel, count = 5).
- Priority scoring: weights sum to 1, weighted Σ = total, documented weights, hospital-fuel ranked #1.
- Freshness decay & staleness threshold; as-of timeline behavior; corrections affect fusion.
- SHA-256 known vectors; audit chain verify + tamper localization.
- Sync queue: offline refusal, connected flush, timestamp preservation, persistence round-trip.
- Role-aware redaction across roles and source types.

## Known limitations
- Single synthetic scenario; small N.
- Curated Arabic alias dictionary — unseen scripts/spellings would reduce cross-language recall.
- Reject-merge updates review status but does not physically split a cluster in this prototype.
- JS-measured latency differs from a production edge node with batched NLP.
