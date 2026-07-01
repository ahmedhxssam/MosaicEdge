import type { ViewKey } from '@/store/useStore';

export interface JudgeModeStep {
  id: string;
  view: ViewKey;
  title: string;
  simpleExplanation: string;
  sections: string[];
  wowFactor: string;
  connection: string;
  judgeTakeaway: string;
  demoAction: string;
}

export const JUDGE_MODE_STEPS: JudgeModeStep[] = [
  {
    id: 'overview',
    view: 'overview',
    title: 'Start with the whole story',
    simpleExplanation:
      'This page is the mission dashboard. It turns many scattered reports into one current picture: top risk, active conflicts, source counts, map markers, and what changed.',
    sections: ['Top assessment banner', 'KPI row', 'Operational map', 'What changed panel', 'Top alert card'],
    wowFactor:
      'Judges immediately see that this is more than a feed. The app has already fused reports into a ranked operational picture.',
    connection:
      'Everything else in the demo explains how this overview was produced: ingestion, entity resolution, contradictions, scoring, sync, audit, and validation.',
    judgeTakeaway:
      'Mosaic Edge gives leaders a fast answer while still preserving the evidence behind that answer.',
    demoAction: 'Point at the top hospital alert and the Truth Tensions count before moving on.',
  },
  {
    id: 'feed',
    view: 'feed',
    title: 'Show the raw intake',
    simpleExplanation:
      'This page shows the incoming reports. They come from different intelligence types and languages, just like messy field information would.',
    sections: ['Source filters', 'Language filters', 'Processing pipeline', 'Report cards', 'Queued report chip'],
    wowFactor:
      'The prototype handles HUMINT, OSINT, GEOINT, and SIGINT-style reports in English, Arabic, and Spanish.',
    connection:
      'The feed is the raw material. The next pages show how Mosaic Edge turns this messy intake into resolved entities and priority alerts.',
    judgeTakeaway:
      'The system starts from fragmented reporting, not from a perfect clean spreadsheet.',
    demoAction: 'Filter by Arabic or Spanish, then show that reports still enter the same local fusion pipeline.',
  },
  {
    id: 'queue',
    view: 'queue',
    title: 'Explain the priority queue',
    simpleExplanation:
      'This page answers the question: what should the analyst look at first? Alerts are ranked with a visible 0 to 100 score.',
    sections: ['Severity filters', 'Hospital Access and Generator Fuel alert', 'Score breakdown', 'Recommended verification', 'Truth Tensions column'],
    wowFactor:
      'The priority score is inspectable: civilian safety, immediacy, corroboration, source confidence, and freshness are all shown.',
    connection:
      'The queue connects evidence to action. It does not just say something is important; it explains why it is important.',
    judgeTakeaway:
      'The scoring is transparent enough for a human to defend under pressure.',
    demoAction: 'Open the hospital alert and read the factor weights in plain language.',
  },
  {
    id: 'graph',
    view: 'graph',
    title: 'Reveal the evidence graph',
    simpleExplanation:
      'This page shows how reports, entities, and contradictions connect. It helps the analyst see relationships instead of reading every report one by one.',
    sections: ['Risk path toggle', 'Entity nodes', 'Report nodes', 'Contradiction edges', 'Selected entity side panel'],
    wowFactor:
      'Hospital Dr. Jose Maria Vargas resolves across multiple aliases and languages, and the app shows why those names were merged.',
    connection:
      'The graph explains the hidden structure behind the priority queue: hospital risk depends on the coastal highway, Tacagua Viaduct, and aftershock damage.',
    judgeTakeaway:
      'Mosaic Edge performs link analysis and makes the provenance inspectable.',
    demoAction: 'Click Hospital Dr. Jose Maria Vargas if visible, or turn on Risk path only to show the operational dependency chain.',
  },
  {
    id: 'timeline',
    view: 'timeline',
    title: 'Replay what was known over time',
    simpleExplanation:
      'This page rewinds the scenario. It recomputes the fused picture at earlier points, so the analyst can see how confidence changed.',
    sections: ['Timeline slider', 'Explain why it changed button', 'Map at cursor', 'Alerts at cursor'],
    wowFactor:
      'The same fusion engine can answer both "what do we know now?" and "what did we know 60 minutes ago?"',
    connection:
      'This is important for auditability. A team can reconstruct why a decision looked reasonable at the time.',
    judgeTakeaway:
      'The system preserves temporal reasoning, not just the final state.',
    demoAction: 'Move the slider and click Explain why it changed.',
  },
  {
    id: 'whatchanged',
    view: 'whatchanged',
    title: 'Turn reconnect into a clear delta brief',
    simpleExplanation:
      'This page tells the analyst what changed since the previous comparison window: new alerts, escalations, stale reports, sync arrivals, and verification tasks.',
    sections: ['Escalated alerts', 'New contradictions', 'Stale reports', 'Sync arrivals', 'Suggested verification tasks'],
    wowFactor:
      'After being offline, the analyst does not need to manually compare two dashboards. The app explains what moved and why.',
    connection:
      'This connects directly to the offline sync story: when the network returns, Mosaic Edge makes the change history legible.',
    judgeTakeaway:
      'Disconnected operation is useful only if reconnecting produces an understandable update.',
    demoAction: 'Point out stale reports and suggested verification tasks.',
  },
  {
    id: 'console',
    view: 'console',
    title: 'Ask source-grounded questions',
    simpleExplanation:
      'This page is a guided analyst assistant. It answers practical questions using the current fusion state and returns citations.',
    sections: ['Bedrock/local status', 'Question input', 'Suggested questions', 'Cited answer cards'],
    wowFactor:
      'The assistant is constrained by provenance. In Bedrock mode, a response without citations is rejected by the proxy contract.',
    connection:
      'This turns the fused state into a conversational interface without losing the audit and source-attribution discipline.',
    judgeTakeaway:
      'AI assistance is useful here because it is grounded, cited, and bounded.',
    demoAction: 'Ask "Why is the hospital alert critical?" and show the cited reports.',
  },
  {
    id: 'review',
    view: 'review',
    title: 'Keep the human in the loop',
    simpleExplanation:
      'This page lets analysts correct the system. They can confirm or reject merges, mark old reports outdated, flag verification, or adjust reliability.',
    sections: ['Entity merge decisions', 'Merge confidence', 'Source actions', 'Recent analyst decisions'],
    wowFactor:
      'Human decisions feed back into the fusion state and are recorded in the audit ledger.',
    connection:
      'This is the answer to "does AI replace the analyst?" No. The prototype makes human judgment part of the workflow.',
    judgeTakeaway:
      'The system supports analysts instead of bypassing them.',
    demoAction: 'Show a merge decision and explain that every correction is auditable.',
  },
  {
    id: 'sync',
    view: 'sync',
    title: 'Prove disconnected operation',
    simpleExplanation:
      'This page shows store-and-forward sync and the tamper-evident audit ledger. Reports can queue while offline and sync later with a receipt.',
    sections: ['Store-and-forward queue', 'Synchronize button', 'Sync receipt', 'Audit ledger table', 'Verify chain and Tamper buttons'],
    wowFactor:
      'The app can demonstrate offline ingestion, reconnect sync, a receipt, and tamper detection in one place.',
    connection:
      'This satisfies the edge requirement: the app keeps working locally and proves what happened when connectivity returns.',
    judgeTakeaway:
      'Offline-first is not just a claim; the demo has a visible queue, receipt, and hash-chain check.',
    demoAction: 'Go offline, add a simulated report, reconnect, synchronize, then verify the chain.',
  },
  {
    id: 'security',
    view: 'security',
    title: 'Explain trust and guardrails',
    simpleExplanation:
      'This page explains the safety posture: synthetic data, provenance, role redaction, human review, and no automatic irreversible actions.',
    sections: ['Security controls', 'Decision guardrails', 'Role-aware data segregation'],
    wowFactor:
      'The prototype is built around defensible decisions, not black-box automation.',
    connection:
      'Security and ethics are connected to the fusion design: contradictions stay visible, sources stay attached, and low-confidence claims do not become critical alone.',
    judgeTakeaway:
      'The project is positioned as defensive, humanitarian, and controlled.',
    demoAction: 'Switch to Operations Lead role and show sensitive HUMINT/SIGINT redaction.',
  },
  {
    id: 'edge',
    view: 'edge',
    title: 'Show the edge-node story',
    simpleExplanation:
      'This page explains the reference deployment profile for a ruggedized single-node system under the hackathon power constraint.',
    sections: ['Power draw meter', 'Local capacity meter', 'Hardware profile', 'Greengrass components'],
    wowFactor:
      'The app connects the software demo to an austere hardware profile: local processing, local storage, and delayed sync.',
    connection:
      'This bridges the working browser prototype to the real edge deployment concept.',
    judgeTakeaway:
      'The design is aligned with tactical-edge constraints, even though the hardware numbers are illustrative.',
    demoAction: 'Call out the under-500W profile and Greengrass component breakdown.',
  },
  {
    id: 'architecture',
    view: 'architecture',
    title: 'Separate what is real now from the production path',
    simpleExplanation:
      'This page shows the edge and cloud zones. The local demo runs on the edge; AWS services are the production integration path.',
    sections: ['Edge node card', 'Cloud environment card', 'Provider status', 'Implemented vs production path'],
    wowFactor:
      'The architecture is honest: local fusion is implemented, Bedrock is optional and real through a proxy, and other AWS services are clear roadmap surfaces.',
    connection:
      'This connects the prototype to AWS without pretending every cloud integration is fully built.',
    judgeTakeaway:
      'The system boundaries and partner integration surfaces are clearly defined.',
    demoAction: 'Use this page when judges ask where AWS fits.',
  },
  {
    id: 'evaluation',
    view: 'evaluation',
    title: 'Validate the prototype live',
    simpleExplanation:
      'This page recomputes metrics from the seeded ground truth: entity resolution, contradictions, stale reports, latency, sync, and audit.',
    sections: ['Run validation button', 'Metric cards', 'Ground truth summary', 'Limitations'],
    wowFactor:
      'The numbers are recomputed live instead of being static marketing claims.',
    connection:
      'This is how the project answers the rubric requirement for testing, validation, latency, and success metrics.',
    judgeTakeaway:
      'The prototype is candid about what the metrics prove and what they do not prove.',
    demoAction: 'Click Run validation and then read one limitation aloud.',
  },
  {
    id: 'sources',
    view: 'sources',
    title: 'Prove provenance discipline',
    simpleExplanation:
      'This page separates synthetic scenario data from real imported datasets and interoperability output.',
    sections: ['Provenance legend', 'GDELT snapshot', 'Cursor-on-Target export', 'WikiANN evaluation'],
    wowFactor:
      'Real imported data is clearly labeled and kept separate from the synthetic crisis scenario.',
    connection:
      'This supports the credibility story: the app does not mix demo fiction, real metadata, and evaluation data without labels.',
    judgeTakeaway:
      'The team is careful about provenance, data boundaries, and honest dataset claims.',
    demoAction: 'Show the provenance legend before showing GDELT or WikiANN metrics.',
  },
  {
    id: 'docs',
    view: 'docs',
    title: 'Close with the packaged story',
    simpleExplanation:
      'This page contains the demo script, differentiator, implemented features, and repository docs.',
    sections: ['3-minute demo script', 'What makes it different', 'Implemented features', 'Repository docs'],
    wowFactor:
      'The app includes its own presenter guide, so a judge can see both the product and the story behind it.',
    connection:
      'This is the wrap-up: Mosaic Edge makes uncertainty visible, works offline, cites sources, and gives humans verification tasks.',
    judgeTakeaway:
      'The prototype is coherent: product, architecture, demo, validation, and roadmap all support the same thesis.',
    demoAction: 'End by repeating the thesis: Mosaic Edge shows what it knows, what conflicts, what changed, and what must be verified.',
  },
];

export function getJudgeModeStep(index: number): JudgeModeStep {
  const safeIndex = Math.max(0, Math.min(JUDGE_MODE_STEPS.length - 1, index));
  return JUDGE_MODE_STEPS[safeIndex];
}

export function judgeModeProgress(index: number): { current: number; total: number; percent: number } {
  const current = Math.max(1, Math.min(JUDGE_MODE_STEPS.length, index + 1));
  const total = JUDGE_MODE_STEPS.length;
  return { current, total, percent: Math.round((current / total) * 100) };
}
