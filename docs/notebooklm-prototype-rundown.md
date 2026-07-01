# Mosaic Edge Prototype Rundown for NotebookLM

## One-sentence explanation

Mosaic Edge is an offline-first intelligence fusion prototype that helps field analysts turn scattered, multilingual, conflicting reports into a clear, source-attributed, auditable decision picture when the network is unreliable.

## Very simple explanation

Imagine a disaster response team receives many reports at once. Some are from people in the field. Some are from public posts. Some are from imagery. Some are from communications summaries. Some are in English, some are in Arabic, and some are in Spanish. Some reports are fresh, some are old, and some disagree with each other.

Mosaic Edge is the tool that sits on a rugged computer near the field team and asks:

- Which reports are talking about the same hospital, viaduct, route, shelter, or neighborhood?
- Which reports agree?
- Which reports conflict?
- Which source is newer, more reliable, or better corroborated?
- What should the human analyst verify before anyone acts?
- Can this still work if the internet disappears?
- Can we prove later how the system reached its conclusion?

The prototype is built around one major idea: do not hide uncertainty. Instead of giving one confident answer and pretending the conflict is gone, Mosaic Edge shows the analyst what it knows, what it does not know, what sources disagree, and why a particular conclusion is currently favored.

## What problem it is solving

The hackathon use case is "Intelligence Fusion at the Tactical Edge." The problem is that forward-deployed analysts can be overwhelmed by a flood of intelligence from many sources while working in disconnected, degraded, intermittent, or low-bandwidth environments.

In that kind of environment, ordinary cloud dashboards can fail for two reasons:

1. They may require constant connectivity.
2. They may collapse conflicting reports into one answer without showing the disagreement.

That is risky. If a convoy is routed based on a stale claim that a damaged highway is open, people could be sent into danger. If a public rumor says a hospital evacuation is complete, responders might wrongly assume patients are safe. If a fuel shortage report is real but buried under noise, the response team may act too late.

Mosaic Edge is designed to support defensive, humanitarian, civilian-protection decisions. It does not target people, direct weapons, perform facial recognition, or do live surveillance. Its job is to help humans understand fragmented evidence and choose what to verify next.

## The demo scenario

The built-in scenario is the Venezuela Earthquake Response Exercise. It uses public June 2026 crisis context, but the field reports are simulated and synthetic for controlled evaluation.

The setting is the La Guaira-Caracas coastal corridor after the June 2026 Venezuela earthquakes, where aftershocks, damaged roads, disrupted communications, and overloaded medical facilities create a fast-moving civilian-protection problem.

The main issue is Hospital Dr. Jose Maria Vargas in La Guaira. The hospital has only a few hours of generator fuel left. Its primary resupply corridor depends on the Caracas-La Guaira Highway and the Tacagua Viaduct. Multiple reports say the corridor is closed or impassable, but older public reports claim it may still be open.

The analyst must answer:

- Is the hospital fuel situation critical?
- Is the Caracas-La Guaira Highway usable?
- Is the Tacagua Viaduct open or closed?
- Which reports are stale?
- Which routes need verification?
- What changed as new evidence arrived?
- Can the system keep working offline?

## What the app actually does

The app starts with 30 synthetic reports. The reports come from four source types:

- HUMINT: human field reports.
- OSINT: public or open-source reports.
- GEOINT: imagery/geographic observations.
- SIGINT: synthetic communications summaries.

The reports use three languages:

- English.
- Arabic.
- Spanish.

Each report has structured fields for source type, source name, reliability, language, timestamp, raw text, extracted entities, extracted claims, classification tags, and an integrity hash.

The core fusion engine then performs five major jobs:

1. Entity resolution.
2. Contradiction detection.
3. Priority scoring.
4. Evidence graph building.
5. Timeline and delta explanation.

## Entity resolution in simple terms

Entity resolution means recognizing that different names can refer to the same real-world thing.

For example, the app knows these are all the same hospital:

- Hospital Dr. Jose Maria Vargas.
- Vargas Hospital.
- Hospital Vargas.
- The Arabic name for Vargas Hospital.

It does not just merge them silently. It explains why the merge happened.

The merge engine uses signals like:

- Name similarity.
- Arabic alias dictionary matches.
- Shared coordinates.
- Shared context words like fuel, generator, route, or flood.
- Time overlap.
- Same entity type.

This matters because field reports are messy. Different teams may use different spellings, languages, transliterations, or local names. The app needs to know that they are talking about the same hospital before it can reason about the risk.

## Contradiction detection in simple terms

The app calls contradictions "Truth Tensions."

A Truth Tension happens when reports make competing claims about the same entity and predicate.

Example:

- One report says the Tacagua Viaduct is open.
- Several newer reports say the Tacagua Viaduct and coastal highway are closed or impassable.

Mosaic Edge keeps both sides visible. It chooses a currently favored interpretation, but it does not delete the dissenting source.

The contradiction engine looks at:

- Source reliability.
- Freshness.
- Number of independent supporting sources.
- Whether the competing claim is stale.
- Whether a high-reliability source supports one side.

Then it explains the rationale in plain language.

For example, the app can say that highway closure is favored because multiple newer independent reports support closure, including a high-reliability GEOINT observation, while the open-status reports are older, low-reliability, and uncorroborated.

## Priority scoring in simple terms

The app ranks alerts from 0 to 100. The score is not an opaque AI score. It is a weighted formula that the analyst can inspect.

The scoring weights are:

- 35 percent civilian safety impact.
- 20 percent immediacy.
- 20 percent corroboration.
- 15 percent source confidence.
- 10 percent freshness.

The top alert is usually Hospital Access and Generator Fuel. It is critical because:

- The hospital has limited generator fuel.
- The primary resupply route is disrupted.
- Multiple sources corroborate the highway and viaduct problem.
- The newest reports are recent.
- The impact on civilians is high.

The important judge-facing point is that the app does not just say "critical." It shows why the alert is critical and which factors produced the score.

## Evidence graph in simple terms

The evidence graph shows how reports, entities, contradictions, and risks connect.

Instead of reading 30 reports one by one, the analyst can see relationships:

- This report mentions the hospital.
- This report supports the highway-closed interpretation.
- This report contradicts the current assessment.
- The hospital depends on the Caracas-La Guaira Highway.
- The highway depends on the Tacagua Viaduct.
- The viaduct is affected by aftershock damage.

The graph includes a risk path mode. For the hospital scenario, the important chain is:

Hospital Dr. Jose Maria Vargas -> Caracas-La Guaira Highway -> Tacagua Viaduct -> Aftershock Damage.

This is one of the strongest demo moments because it shows the app understands operational dependency, not just isolated keywords.

## Offline-first behavior

Mosaic Edge is built to keep working when disconnected.

In the demo, you can switch the link state to Offline. Then you can add a simulated report. The report is ingested locally, processed locally, and queued locally for later synchronization.

When you switch back to Connected and click Synchronize, the queued item is marked as synced and the app produces a receipt. The receipt includes item count, bytes, duration, actor, and an integrity hash.

This proves the app is not just a cloud dashboard pretending to be edge-ready. The core fusion work still runs in the browser/local edge environment.

## Audit ledger in simple terms

Every important action is appended to a tamper-evident audit ledger.

Each audit event includes:

- Timestamp.
- Actor.
- Action.
- Object type.
- Object ID.
- Network state.
- Details.
- Previous hash.
- Current hash.

The current hash depends on the previous hash and the event contents. That means if someone changes an old record without recomputing the chain, verification fails.

The demo includes a Tamper button. When pressed, it alters an event. Then Verify Chain catches the integrity break.

The judge-facing point is that the prototype can explain not only what it concluded, but how the record changed over time and whether the record was altered.

## Analyst Console in simple terms

The Analyst Console is not meant to be an open-ended chatbot. It is a guided, source-grounded assistant.

It can answer questions like:

- Why is the hospital alert critical?
- Which route has conflicting reports?
- Which sources are stale?
- What needs verification?
- What changed in the last 30 minutes?

In local mode, it uses deterministic intent matching and answers from the current fusion state. When the optional Bedrock proxy is running with AWS credentials, the same console can call Amazon Bedrock. The contract requires citations. If a model response does not include citations, the proxy rejects it.

This is important because the app treats source attribution as a requirement, not a nice-to-have.

## Human review

The Human Review page lets the analyst interact with uncertain or contested information.

The analyst can:

- Confirm an entity merge.
- Reject an entity merge.
- Mark a report outdated.
- Flag a report for verification.
- Increase or decrease source reliability.

Every correction is recorded and affects the future fusion state. This is another key judge point: the system is not trying to replace the analyst. It is designed to keep the human in the loop.

## Role-aware redaction

The app supports three roles:

- Field Analyst.
- Operations Lead.
- Auditor.

The Operations Lead role redacts sensitive HUMINT and SIGINT narratives while keeping conclusions and provenance counts visible. The Auditor role can see full provenance, audit details, hashes, receipts, and decisions.

This supports the data segregation requirement in the hackathon use case. It is prototype-level role logic, not a complete production identity system, but it demonstrates the intended control model.

## Evaluation page

The Evaluation page recomputes metrics live from the seeded scenario. The app does not just show hardcoded success claims.

The validation checks include:

- Reports processed.
- Average local processing latency.
- Entity-resolution precision.
- Entity-resolution recall.
- Multilingual aliases resolved.
- Contradiction recall.
- Contradiction precision.
- Critical alert recall at top 5.
- Stale-report identification.
- Offline queue persistence.
- Sync completion.
- Audit-chain validation.

The methodology is honest about limitations. The synthetic scenario is small, so the metrics prove the prototype works on the demo dataset, not that it is production-ready.

## Data and Sources page

The Data and Sources page separates synthetic scenario data from real imported data.

The synthetic scenario powers the core Venezuela Earthquake Response demo.

The app also includes real imported datasets for evaluation and provenance demonstration:

- A GDELT 2.0 Translingual snapshot.
- A WikiANN multilingual NER sample.
- Cursor-on-Target compatible XML export.

The important judge point is that real imported data is clearly labeled and not mixed into the synthetic crisis scenario. The app avoids pretending imported metadata includes article text when it does not.

## Architecture in simple terms

Mosaic Edge has two zones:

1. Edge or disconnected node.
2. Cloud or connected environment.

The edge node is the implemented demo. It performs:

- Local ingestion.
- Language normalization.
- Entity resolution.
- Contradiction detection.
- Priority scoring.
- Evidence graph building.
- Local storage.
- Sync queue.
- Audit ledger.

The cloud zone is the production path. It maps to AWS services:

- AWS IoT Greengrass for edge packaging.
- Amazon Bedrock for source-grounded NLP and summaries.
- Amazon Neptune for durable graph and link analysis.
- Amazon OpenSearch for search and correlation.
- Amazon S3 for encrypted evidence storage.
- AWS DataSync for store-and-forward synchronization.
- IAM, KMS, and CloudWatch for security, encryption, and monitoring.

The honest status is:

- The local edge demo is implemented.
- Bedrock has a real optional proxy.
- Greengrass, Neptune, OpenSearch, S3, DataSync, KMS, IAM, and CloudWatch are architecture or roadmap surfaces in this prototype.

## Why the prototype is innovative

The innovation is not that it can display reports on a dashboard. The innovation is conflict-aware, provenance-first fusion for disconnected environments.

Most dashboards try to give a clean answer. Mosaic Edge gives the answer plus the disagreement behind it.

The app's thesis is:

Most intelligence platforms produce a confident answer. Mosaic Edge shows what it knows, what it does not know, what sources conflict, what changed, and what must be verified before action.

This is valuable because high-stakes decisions often fail when uncertainty is hidden. Mosaic Edge makes uncertainty operational.

## What it can be good for

Mosaic Edge can be useful for:

- Disaster response.
- Humanitarian field coordination.
- Civilian protection operations.
- Emergency logistics.
- Search and rescue planning.
- Infrastructure damage assessment.
- Medical resupply coordination.
- Situational awareness in disconnected environments.
- Intelligence analysis where source provenance matters.
- Any workflow where reports are multilingual, conflicting, and time-sensitive.

It is especially good for cases where:

- Connectivity is unreliable.
- Teams need to work on local hardware.
- Reports arrive from many source types.
- Old reports can be dangerous.
- Human verification is required before action.
- Auditability matters.

## What it is not

Mosaic Edge is not a production intelligence platform.

It is not a weapons targeting system.

It is not a facial recognition tool.

It is not live surveillance.

It is not a full arbitrary NLP extraction pipeline yet.

It is not a complete cloud deployment.

It is a working prototype that demonstrates the fusion, confidence, offline sync, audit, and explainability concepts.

## Page-by-page guide for a podcast

### Command Overview

This is the executive summary screen. It shows the current operational picture: reports processed, resolved entities, priority alerts, truth tensions, queued sync items, and entity resolution confidence.

The top alert is the main story. It usually says Hospital Access and Generator Fuel is at risk. This lets a judge immediately understand the stakes.

The map and KPIs show that the system is not just storing reports. It is fusing them into a current decision picture.

### Live Feed

This page shows the raw intake. It proves the app can ingest multiple source types and languages. The filters show HUMINT, OSINT, GEOINT, SIGINT, English, Arabic, and Spanish.

The key teaching point is that the app starts from messy reporting, not from a perfect final answer.

### Priority Queue

This page ranks the most important alerts. The important factor is the transparent score breakdown. Judges should understand that the score is not mysterious. It is a visible weighted formula.

The right side shows Truth Tensions. This is where the app proves it does not hide contradictions.

### Entity Graph

This page shows resolved entities and supporting evidence. Click Hospital Dr. Jose Maria Vargas to show multilingual aliases and merge reasons.

The wow factor is that the app can connect English, Arabic, and Spanish names to one entity and explain why.

### Timeline Replay

This page shows how the assessment changed over time. Dragging the timeline recomputes the fusion state at earlier moments.

The teaching point is that Mosaic Edge can reconstruct what was known at the time, not just what is known now.

### What Changed

This page turns a before-and-after comparison into a readable delta brief. It explains new alerts, escalations, stale reports, sync arrivals, analyst decisions, and verification tasks.

This matters after reconnecting from an offline period.

### Analyst Console

This page lets the analyst ask source-grounded questions. The answer includes citations.

The important point is that the console is constrained. It is not a generic chatbot inventing answers. It answers from the current fusion state.

### Human Review

This page shows human-in-the-loop control. The analyst can confirm or reject merges, mark reports outdated, flag verification tasks, and adjust reliability.

The connection is that every decision feeds the fusion state and the audit ledger.

### Sync and Audit

This page proves disconnected operation. Go offline, add a report, reconnect, synchronize, and show the receipt.

Then verify the audit chain. Optionally tamper with it and verify again to show detection.

### Security and Trust

This page explains guardrails. It shows synthetic data labeling, role redaction, provenance, human review, no irreversible automatic actions, and no targeting.

This helps judges understand that the prototype is defensive and controlled.

### Edge Readiness

This page explains the reference edge-node deployment profile. It shows the system conceptually fits on austere hardware under the 500W requirement.

The local latency metric from the Evaluation page supports this story.

### Architecture

This page explains the edge/cloud split. Everything decision-critical runs locally. The cloud is for scale, durability, search, graph persistence, and heavier reasoning.

This is the page to use when judges ask about AWS.

### Evaluation

This page validates the prototype. Click Run Validation and explain that metrics are recomputed live from ground truth.

The strongest point is honesty: metrics characterize this synthetic dataset, not production accuracy.

### Data and Sources

This page proves provenance discipline. It shows synthetic scenario data, real GDELT metadata, WikiANN evaluation data, and CoT export, all clearly labeled.

The key point is that the app avoids mixing real imported data with the synthetic demo scenario.

### Documentation

This page contains the demo script and feature summary. It is a useful reset point for presenters.

## Suggested podcast structure

1. Start with a simple story: a hospital is running out of fuel and reports disagree about the route.
2. Explain why conflicting information is dangerous.
3. Introduce Mosaic Edge as an offline-first fusion workstation.
4. Explain the five core ideas: entities, contradictions, priority, provenance, offline sync.
5. Walk through the app pages in order.
6. Explain how the scoring works.
7. Explain why "Truth Tensions" are the differentiator.
8. Explain how the AWS architecture maps from prototype to production.
9. Explain what is real now versus roadmap.
10. End with improvement opportunities and what the next build should add.

## Questions judges may ask

### Is this actually offline?

The core demo is offline-capable. Entity resolution, contradiction detection, priority scoring, graph building, sync queue, and audit ledger run locally. The app can ingest a report while offline and queue it for later sync.

### Where is AWS used?

The core prototype is local by design. Bedrock has an optional real proxy for source-grounded summaries. Greengrass, Neptune, OpenSearch, S3, DataSync, IAM, KMS, and CloudWatch are represented as the production integration path.

### Is the AI making decisions?

No. The system supports human analysts. It ranks and explains, but it does not take irreversible action. Contradictions require verification.

### How do you prevent hallucinations?

The local analyst console is deterministic and answers from current fusion state. The optional Bedrock proxy requires citations and rejects responses without citation arrays.

### How do you know the entity resolution works?

The Evaluation page recomputes precision and recall against hand-labeled ground truth. The demo also shows specific multilingual aliases resolving into the correct entities.

### What is the biggest limitation?

The biggest limitation is that the scenario reports are synthetic and already include structured extracted claims. The next major step is a real extraction pipeline from raw text using Bedrock or another NLP component.

### Why is this better than a normal dashboard?

A normal dashboard often hides uncertainty. Mosaic Edge makes uncertainty visible, keeps dissenting sources attached, explains confidence, preserves provenance, and keeps working offline.

## Best improvement opportunities

1. Add real raw-text extraction using Bedrock.
2. Add a real Greengrass package for edge deployment.
3. Persist evidence to S3 on sync.
4. Store the graph in Neptune for durable link analysis.
5. Index reports/entities in OpenSearch for scalable search.
6. Replace localStorage with encrypted local storage.
7. Add a complete authentication and authorization model.
8. Expand from one synthetic scenario to many scenario packs.
9. Improve multilingual normalization beyond the curated Arabic dictionary.
10. Make reject-merge physically split entity clusters.
11. Add live hardware telemetry for the edge-readiness page.
12. Add code splitting to reduce the production bundle size.

## Final simple summary

Mosaic Edge helps a field analyst answer one hard question: "Given many messy, conflicting reports, what should I believe right now, why should I believe it, what disagrees, and what must I verify before acting?"

It is valuable because it treats uncertainty as something to expose and manage, not something to hide. That makes it a strong hackathon prototype for edge intelligence fusion, civilian protection, and disconnected operations.
