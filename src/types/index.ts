/**
 * Mosaic Edge — Core domain types.
 *
 * The data model is deliberately provenance-first: every conclusion the system
 * draws (a resolved entity, a contradiction, a priority alert) can be traced
 * back through claims and reports to its originating sources.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────────────────────

export type NetworkState = 'connected' | 'degraded' | 'offline';

export type UserRole = 'field-analyst' | 'operations-lead' | 'auditor';

export type Language = 'en' | 'ar' | 'es';

export type SourceType = 'HUMINT' | 'OSINT' | 'GEOINT' | 'SIGINT';

export type ReliabilityTier = 'high' | 'medium' | 'low' | 'very-low';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type EntityType =
  | 'facility'
  | 'infrastructure'
  | 'route'
  | 'location'
  | 'organization'
  | 'unit'
  | 'event'
  | 'depot';

export interface Coordinates {
  /** Decimal latitude inside the scenario operating map bounds. */
  lat: number;
  /** Decimal longitude inside the scenario operating map bounds. */
  lng: number;
  /** Human-readable local grid reference, e.g. "LG-HOSP-02". */
  gridRef: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reports & extraction
// ─────────────────────────────────────────────────────────────────────────────

export type ProcessingStage =
  | 'received'
  | 'parsed'
  | 'language-detected'
  | 'entity-extracted'
  | 'entity-resolved'
  | 'claims-analyzed'
  | 'contradictions-checked'
  | 'priority-updated'
  | 'queued'
  | 'synced';

/** A raw reference to an entity as it appears inside a report. */
export interface EntityMention {
  id: string;
  reportId: string;
  surfaceForm: string;
  language: Language;
  entityType: EntityType;
  /** Ground-truth canonical entity id. Used ONLY for evaluation, never read by the resolver. */
  canonicalId: string;
  coordinates?: Coordinates;
  contextTags: string[];
}

/** A structured assertion extracted from a report. */
export interface Claim {
  id: string;
  reportId: string;
  /** Mention this claim is about (links the claim into the resolved-entity graph). */
  subjectMentionId: string;
  /** Ground-truth canonical entity (fallback grouping key). */
  subjectCanonicalId: string;
  subjectLabel: string;
  predicate: string;
  value: string | number | boolean;
  valueText: string;
  timestamp: string;
  sourceReliability: number;
  extractedConfidence: number;
  language: Language;
  topicId: string;
}

export interface Report {
  id: string;
  sourceType: SourceType;
  sourceName: string;
  reliabilityScore: number; // 0..1
  reliabilityTier: ReliabilityTier;
  language: Language;
  /** ISO timestamp — the event time the report describes/was filed. */
  timestamp: string;
  /** Minutes before the scenario "now" (T0). Lower = more recent. */
  minutesBeforeT0: number;
  location: string;
  coordinates: Coordinates;
  rawText: string;
  translatedText?: string;
  extractedEntities: EntityMention[];
  extractedClaims: Claim[];
  sourceClassification: string;
  integrityHash: string;
  processingStatus: ProcessingStage;
  threadId: string;
  /** True when the report was ingested while disconnected and is awaiting sync. */
  unsynced: boolean;
  /** Marks reports the analyst added live during the demo. */
  userAdded?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Entity resolution
// ─────────────────────────────────────────────────────────────────────────────

export type MergeReasonKind =
  | 'name-similarity'
  | 'alias-dictionary'
  | 'shared-coordinates'
  | 'shared-context'
  | 'time-overlap'
  | 'shared-related-entity';

export interface MergeReason {
  kind: MergeReasonKind;
  detail: string;
  weight: number; // contribution to merge confidence (0..1 scaled)
}

export interface EntityAlias {
  surfaceForm: string;
  language: Language;
  normalized: string;
  reportIds: string[];
}

export type ReviewStatus = 'auto' | 'confirmed' | 'rejected' | 'needs-review';

export interface ResolvedEntity {
  id: string;
  canonicalName: string;
  entityType: EntityType;
  aliases: EntityAlias[];
  mentionIds: string[];
  reportIds: string[];
  coordinates?: Coordinates;
  contextTags: string[];
  mergeConfidence: number; // 0..1
  mergeReasons: MergeReason[];
  reviewStatus: ReviewStatus;
  riskLevel: Severity;
  /** Ground-truth canonical id of the dominant member (evaluation only). */
  dominantCanonicalId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Contradiction engine
// ─────────────────────────────────────────────────────────────────────────────

export type ConflictType =
  | 'direct'
  | 'numeric-discrepancy'
  | 'stale-superseded'
  | 'low-corroboration';

export interface CompetingClaim {
  claimId: string;
  reportId: string;
  sourceName: string;
  sourceType: SourceType;
  valueText: string;
  reliability: number;
  freshnessMinutes: number;
  corroboration: number;
  stance: 'favored' | 'contested';
}

export interface Contradiction {
  id: string;
  entityId: string;
  entityLabel: string;
  predicate: string;
  predicateLabel: string;
  conflictType: ConflictType;
  severity: Severity;
  claims: CompetingClaim[];
  favoredClaimId: string;
  favoredValueText: string;
  rationale: string;
  requiresVerification: boolean;
  verificationAction: string;
  sourceCount: number;
  mostRecentEvidence: string;
  confidence: number; // 0..100 confidence in favored interpretation
  topicId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Priority scoring
// ─────────────────────────────────────────────────────────────────────────────

export type ScoreFactorKey =
  | 'civilianSafety'
  | 'immediacy'
  | 'corroboration'
  | 'sourceConfidence'
  | 'freshness';

export interface ScoreFactor {
  key: ScoreFactorKey;
  label: string;
  weight: number; // e.g. 0.35
  rawScore: number; // 0..100
  weighted: number; // rawScore * weight
  explanation: string;
}

export interface ScoreBreakdown {
  total: number; // 0..100
  factors: ScoreFactor[];
}

export interface PriorityAlert {
  id: string;
  topicId: string;
  headline: string;
  summary: string;
  severity: Severity;
  priority: number; // 0..100
  scoreBreakdown: ScoreBreakdown;
  confidence: number; // 0..100
  entityIds: string[];
  entityLabels: string[];
  supportingReportIds: string[];
  conflictingReportIds: string[];
  contradictionIds: string[];
  recommendedVerification: string;
  lastUpdated: string;
  whyChanged?: string;
  requiresHumanReview: boolean;
  riskPath?: string[];
  informationGaps: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Graph
// ─────────────────────────────────────────────────────────────────────────────

export type GraphNodeKind = 'entity' | 'report' | 'claim' | 'event';

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
  sublabel?: string;
  entityType?: EntityType;
  severity?: Severity;
  x: number;
  y: number;
  riskGlow?: boolean;
  meta?: Record<string, unknown>;
}

export type GraphEdgeKind =
  | 'mentions'
  | 'supports'
  | 'contradicts'
  | 'shares-location'
  | 'shares-time'
  | 'alias-of'
  | 'depends-on'
  | 'requires-verification';

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: GraphEdgeKind;
  label?: string;
}

export interface EvidenceGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync & audit
// ─────────────────────────────────────────────────────────────────────────────

export type SyncStatus = 'queued' | 'syncing' | 'synced' | 'failed';

export interface SyncEvent {
  id: string;
  objectType: 'report' | 'correction' | 'note' | 'merge-decision';
  objectId: string;
  label: string;
  /** Original event timestamp — preserved across store-and-forward. */
  createdAt: string;
  queuedAt: string;
  syncedAt?: string;
  status: SyncStatus;
  networkStateAtCreation: NetworkState;
  receiptId?: string;
  bytes: number;
}

export interface SyncReceipt {
  id: string;
  timestamp: string;
  itemCount: number;
  itemIds: string[];
  totalBytes: number;
  integrityHash: string;
  durationMs: number;
  actor: UserRole;
}

export interface AuditEvent {
  eventId: string;
  sequence: number;
  timestamp: string;
  actor: UserRole;
  action: string;
  objectType: string;
  objectId: string;
  previousHash: string;
  currentHash: string;
  networkState: NetworkState;
  details: string;
  /** Demo-only flag: set when the row was deliberately tampered to prove detection. */
  tampered?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Human-in-the-loop corrections
// ─────────────────────────────────────────────────────────────────────────────

export type CorrectionType =
  | 'confirm-merge'
  | 'reject-merge'
  | 'mark-outdated'
  | 'flag-verification'
  | 'adjust-reliability'
  | 'analyst-note';

export interface Correction {
  id: string;
  type: CorrectionType;
  targetType: 'entity' | 'report' | 'source' | 'alert';
  targetId: string;
  targetLabel: string;
  actor: UserRole;
  timestamp: string;
  note?: string;
  /** For reliability adjustments. */
  reliabilityDelta?: number;
  networkState: NetworkState;
}

// ─────────────────────────────────────────────────────────────────────────────
// Evaluation
// ─────────────────────────────────────────────────────────────────────────────

export interface MetricResult {
  key: string;
  label: string;
  value: number;
  display: string;
  unit?: string;
  definition: string;
  numerator?: number;
  denominator?: number;
  status: 'good' | 'ok' | 'warn';
}

export interface ValidationMetrics {
  computedAt: string;
  results: MetricResult[];
  limitations: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Fusion state (the derived, provenance-first output of the whole pipeline)
// ─────────────────────────────────────────────────────────────────────────────

export interface FusionState {
  asOfMinutesBeforeT0: number;
  reports: Report[];
  claims: Claim[];
  entities: ResolvedEntity[];
  contradictions: Contradiction[];
  alerts: PriorityAlert[];
  graph: EvidenceGraph;
  generatedAt: string;
}

/** A scenario thread (storyline) grouping related reports. */
export interface ScenarioThread {
  id: string;
  title: string;
  description: string;
  /** Base civilian-safety weight (0..100) used by the scoring engine. */
  civilianSafetyBase: number;
  riskPath?: string[];
}

export interface OperationMeta {
  name: string;
  codeName: string;
  region: string;
  classification: string;
  t0Iso: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// "What changed" delta
// ─────────────────────────────────────────────────────────────────────────────

export interface DeltaEntry {
  kind:
    | 'new-alert'
    | 'escalated'
    | 'de-escalated'
    | 'new-entity-link'
    | 'new-contradiction'
    | 'stale-report'
    | 'sync-arrival'
    | 'analyst-decision'
    | 'suggested-verification';
  title: string;
  detail: string;
  severity?: Severity;
  refType?: 'alert' | 'entity' | 'report' | 'contradiction';
  refId?: string;
}

export interface DeltaBrief {
  fromMinutesBeforeT0: number;
  toMinutesBeforeT0: number;
  entries: DeltaEntry[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Intelligence brief product
// ─────────────────────────────────────────────────────────────────────────────

export interface IntelligenceBrief {
  id: string;
  generatedAt: string;
  operation: string;
  classification: string;
  headline: string;
  urgency: Severity;
  confidence: number;
  bottomLine: string;
  supportingSources: { reportId: string; sourceName: string; sourceType: SourceType; reliability: number; timestamp: string }[];
  contradictingSources: { reportId: string; sourceName: string; sourceType: SourceType; reliability: number; timestamp: string }[];
  keyEntities: { id: string; name: string; type: EntityType }[];
  timeline: { timestamp: string; label: string }[];
  recommendedVerification: string[];
  risksAndLimitations: string[];
  citations: { id: string; label: string }[];
  preparedBy: UserRole;
}
