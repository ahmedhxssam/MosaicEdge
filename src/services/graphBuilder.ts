/**
 * Builds the provenance evidence graph from fusion output. Entity nodes are laid
 * out using their geographic projection (so the graph spatially echoes the map),
 * reports ring their primary entity, and contradictions appear as distinct
 * tension nodes. Layout is fully deterministic.
 */

import type {
  Contradiction,
  EvidenceGraph,
  GraphEdge,
  GraphNode,
  Report,
  ResolvedEntity,
  Severity,
} from '@/types';
import { project } from '@/lib/geo';
import { sha256 } from '@/lib/sha256';
import { RISK_CATALOG } from './priorityScoringEngine';

const VB_W = 1000;
const VB_H = 660;

function hashUnit(s: string): number {
  return parseInt(sha256(s).slice(0, 6), 16) / 0xffffff;
}

export function buildGraph(params: {
  entities: ResolvedEntity[];
  reports: Report[];
  contradictions: Contradiction[];
  mentionIndex: Map<string, string>;
}): EvidenceGraph {
  const { entities, reports, contradictions, mentionIndex } = params;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const entityById = new Map(entities.map((e) => [e.id, e]));
  const entityPos = new Map<string, { x: number; y: number }>();

  // Entity nodes positioned by geographic projection.
  for (const e of entities) {
    const p = e.coordinates ? project(e.coordinates) : { x: hashUnit(e.id), y: hashUnit(e.id + 'y') };
    const x = 110 + p.x * (VB_W - 220);
    const y = 70 + p.y * (VB_H - 200);
    entityPos.set(e.id, { x, y });
    nodes.push({
      id: e.id,
      kind: 'entity',
      label: e.canonicalName,
      sublabel: e.entityType,
      entityType: e.entityType,
      severity: e.riskLevel,
      x,
      y,
      riskGlow: e.riskLevel === 'critical' || e.riskLevel === 'high',
      meta: { aliases: e.aliases.length, confidence: e.mergeConfidence },
    });
  }

  // Report nodes ring their primary entity.
  const ringCount = new Map<string, number>();
  for (const r of reports) {
    const firstMention = r.extractedEntities[0];
    const primaryEntityId = firstMention ? mentionIndex.get(firstMention.id) : undefined;
    const base = primaryEntityId ? entityPos.get(primaryEntityId) : undefined;
    const idx = ringCount.get(primaryEntityId ?? '') ?? 0;
    ringCount.set(primaryEntityId ?? '', idx + 1);
    const angle = hashUnit(r.id) * Math.PI * 2 + idx * 1.1;
    const radius = 64 + (idx % 3) * 16;
    const x = base ? base.x + Math.cos(angle) * radius : hashUnit(r.id) * VB_W;
    const y = base ? base.y + Math.sin(angle) * radius : hashUnit(r.id + 'y') * VB_H;
    nodes.push({
      id: r.id,
      kind: 'report',
      label: r.id,
      sublabel: r.sourceType,
      severity: 'low',
      x,
      y,
      meta: { sourceType: r.sourceType, reliability: r.reliabilityScore, unsynced: r.unsynced },
    });
  }

  // Report → entity edges (mentions / supports / contradicts).
  const contestedByReportEntity = new Set<string>();
  const favoredByReportEntity = new Set<string>();
  for (const c of contradictions) {
    for (const cc of c.claims) {
      const key = `${cc.reportId}::${c.entityId}`;
      if (cc.stance === 'contested') contestedByReportEntity.add(key);
      else favoredByReportEntity.add(key);
    }
  }

  for (const r of reports) {
    const linkedEntities = new Set<string>();
    for (const m of r.extractedEntities) {
      const eid = mentionIndex.get(m.id);
      if (eid) linkedEntities.add(eid);
    }
    for (const eid of linkedEntities) {
      const key = `${r.id}::${eid}`;
      let kind: GraphEdge['kind'] = 'mentions';
      if (contestedByReportEntity.has(key)) kind = 'contradicts';
      else if (favoredByReportEntity.has(key)) kind = 'supports';
      edges.push({ id: `e-${r.id}-${eid}`, source: r.id, target: eid, kind });
    }
  }

  // Entity → entity depends-on edges from the risk catalog (causal chains).
  const canonToEntity = new Map<string, ResolvedEntity>();
  for (const e of entities) if (!canonToEntity.has(e.dominantCanonicalId)) canonToEntity.set(e.dominantCanonicalId, e);
  for (const def of RISK_CATALOG) {
    for (let i = 0; i < def.entityCanonicalIds.length - 1; i++) {
      const a = canonToEntity.get(def.entityCanonicalIds[i]);
      const b = canonToEntity.get(def.entityCanonicalIds[i + 1]);
      if (a && b) {
        edges.push({ id: `dep-${def.id}-${i}`, source: a.id, target: b.id, kind: 'depends-on', label: 'depends on' });
      }
    }
  }

  // Contradiction (event) nodes.
  for (const c of contradictions) {
    const base = entityPos.get(c.entityId);
    if (!base) continue;
    const x = base.x + 8;
    const y = base.y - 58;
    const sev: Severity = 'medium';
    nodes.push({
      id: c.id,
      kind: 'event',
      label: 'Truth Tension',
      sublabel: c.predicateLabel,
      severity: sev,
      x,
      y,
      meta: { confidence: c.confidence, conflictType: c.conflictType },
    });
    edges.push({ id: `ct-${c.id}`, source: c.id, target: c.entityId, kind: 'contradicts', label: 'conflict' });
  }

  void entityById;
  return { nodes, edges };
}
