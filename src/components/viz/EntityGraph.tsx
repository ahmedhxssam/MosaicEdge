import { useMemo, useRef, useState } from 'react';
import type { EvidenceGraph, GraphEdge, GraphNode } from '@/types';
import { SEVERITY_META, SOURCE_META } from '@/lib/format';
import {
  applyNodeDrag,
  clampZoom,
  screenDeltaToGraphDelta,
  zoomAtPoint,
  type GraphPoint,
  type GraphViewport,
  type NodePositions,
} from '@/lib/graphViewport';
import { cn } from '@/lib/cn';
import { Maximize2, Minus, Move, Plus, RotateCcw } from 'lucide-react';
import { Button, Chip } from '@/components/ui';

const EDGE_STYLE: Record<GraphEdge['kind'], { stroke: string; dash?: string; w: number }> = {
  mentions: { stroke: '#475569', w: 1 },
  supports: { stroke: '#34d399', w: 1.5 },
  contradicts: { stroke: '#c084fc', dash: '5 4', w: 2 },
  'shares-location': { stroke: '#38bdf8', w: 1 },
  'shares-time': { stroke: '#64748b', dash: '2 4', w: 1 },
  'alias-of': { stroke: '#7dd3fc', w: 1 },
  'depends-on': { stroke: '#fb923c', dash: '6 5', w: 2 },
  'requires-verification': { stroke: '#fbbf24', dash: '3 3', w: 1.5 },
};

export interface GraphFilters {
  showReports: boolean;
  riskChainOnly: boolean;
  contradictionsOnly: boolean;
  highConfidenceOnly: boolean;
}

export function EntityGraph({
  graph,
  filters,
  riskPathEntityIds,
  onSelect,
  selectedId,
}: {
  graph: EvidenceGraph;
  filters: GraphFilters;
  riskPathEntityIds?: string[];
  onSelect?: (node: GraphNode) => void;
  selectedId?: string | null;
}) {
  const [hover, setHover] = useState<GraphNode | null>(null);
  const [viewport, setViewport] = useState<GraphViewport>({ zoom: 1, pan: { x: 0, y: 0 } });
  const [nodePositions, setNodePositions] = useState<NodePositions>({});
  const [drag, setDrag] = useState<{ kind: 'pan' | 'node'; nodeId?: string; last: GraphPoint } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const { nodes, edges } = useMemo(() => {
    const pathSet = new Set(riskPathEntityIds ?? []);
    let nodes = graph.nodes;
    let edges = graph.edges;

    if (!filters.showReports) nodes = nodes.filter((n) => n.kind !== 'report');
    if (filters.contradictionsOnly) {
      const keep = new Set<string>();
      edges = edges.filter((e) => e.kind === 'contradicts');
      edges.forEach((e) => { keep.add(e.source); keep.add(e.target); });
      nodes = nodes.filter((n) => keep.has(n.id) || n.kind === 'event');
    }
    if (filters.riskChainOnly && pathSet.size) {
      edges = edges.filter((e) => e.kind === 'depends-on' && (pathSet.has(e.source) || pathSet.has(e.target)));
      const keep = new Set(pathSet);
      edges.forEach((e) => { keep.add(e.source); keep.add(e.target); });
      nodes = nodes.filter((n) => keep.has(n.id));
    }
    const nodeIds = new Set(nodes.map((n) => n.id));
    edges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
    if (filters.highConfidenceOnly) {
      edges = edges.filter((e) => e.kind !== 'mentions');
    }
    return { nodes, edges };
  }, [graph, filters, riskPathEntityIds]);

  const displayNodes = useMemo(
    () =>
      nodes.map((n) => {
        const moved = nodePositions[n.id];
        return moved ? { ...n, x: moved.x, y: moved.y } : n;
      }),
    [nodes, nodePositions],
  );
  const byId = new Map(displayNodes.map((n) => [n.id, n]));
  const pathSet = new Set(riskPathEntityIds ?? []);
  const nodeCount = Object.keys(nodePositions).length;

  const screenPoint = (e: React.PointerEvent<SVGElement>): GraphPoint => ({ x: e.clientX, y: e.clientY });

  const graphPoint = (e: React.WheelEvent<SVGSVGElement>): GraphPoint => {
    const svg = svgRef.current;
    if (!svg) return { x: 500, y: 330 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / Math.max(1, rect.width)) * 1000,
      y: ((e.clientY - rect.top) / Math.max(1, rect.height)) * 660,
    };
  };

  const updateZoom = (nextZoom: number, anchor: GraphPoint = { x: 500, y: 330 }) => {
    setViewport((v) => zoomAtPoint(v, nextZoom, anchor));
  };

  const resetLayout = () => {
    setViewport({ zoom: 1, pan: { x: 0, y: 0 } });
    setNodePositions({});
  };

  const startNodeDrag = (e: React.PointerEvent<SVGElement>, node: GraphNode) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const current = nodePositions[node.id] ?? { x: node.x, y: node.y };
    setNodePositions((p) => ({ ...p, [node.id]: current }));
    setDrag({ kind: 'node', nodeId: node.id, last: screenPoint(e) });
    onSelect?.(node);
  };

  const startPan = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ kind: 'pan', last: screenPoint(e) });
  };

  const moveDrag = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const next = screenPoint(e);
    const rawDelta = { dx: next.x - drag.last.x, dy: next.y - drag.last.y };
    if (drag.kind === 'pan') {
      const delta = screenDeltaToGraphDelta(rawDelta, 1);
      setViewport((v) => ({ ...v, pan: { x: v.pan.x + delta.dx, y: v.pan.y + delta.dy } }));
    } else if (drag.nodeId) {
      const delta = screenDeltaToGraphDelta(rawDelta, viewport.zoom);
      setNodePositions((p) => applyNodeDrag(p, drag.nodeId!, delta));
    }
    setDrag({ ...drag, last: next });
  };

  const endDrag = () => setDrag(null);

  return (
    <div className="relative h-full w-full">
      <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-1.5">
        <Chip tone="slate"><Move size={11} /> Drag nodes or background</Chip>
        <Button size="sm" variant="subtle" onClick={() => updateZoom(viewport.zoom * 1.18)} title="Zoom in" aria-label="Zoom in">
          <Plus size={13} />
        </Button>
        <Button size="sm" variant="subtle" onClick={() => updateZoom(viewport.zoom / 1.18)} title="Zoom out" aria-label="Zoom out">
          <Minus size={13} />
        </Button>
        <Button size="sm" variant="subtle" onClick={() => setViewport({ zoom: 1, pan: { x: 0, y: 0 } })} title="Reset view" aria-label="Reset view">
          <Maximize2 size={13} />
        </Button>
        <Button size="sm" variant="ghost" onClick={resetLayout} title="Reset moved nodes" aria-label="Reset moved nodes">
          <RotateCcw size={13} /> {nodeCount ? nodeCount : ''}
        </Button>
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 1000 660"
        className={cn('h-full w-full touch-none', drag?.kind === 'pan' ? 'cursor-grabbing' : 'cursor-grab')}
        onPointerDown={startPan}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={(e) => {
          e.preventDefault();
          const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
          setViewport((v) => zoomAtPoint(v, clampZoom(v.zoom * factor), graphPoint(e)));
        }}
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g transform={`translate(${viewport.pan.x} ${viewport.pan.y}) scale(${viewport.zoom})`}>
          {edges.map((e) => {
            const s = byId.get(e.source);
            const t = byId.get(e.target);
            if (!s || !t) return null;
            const st = EDGE_STYLE[e.kind];
            const onPath = pathSet.has(e.source) && pathSet.has(e.target) && e.kind === 'depends-on';
            return (
              <line
                key={e.id}
                x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                stroke={st.stroke}
                strokeWidth={onPath ? st.w + 1.5 : st.w}
                strokeDasharray={st.dash}
                opacity={onPath ? 1 : 0.55}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          {displayNodes.map((n) => {
            const sel = selectedId === n.id;
            const onPath = pathSet.has(n.id);
            if (n.kind === 'report') {
              const hex = SOURCE_META[(n.meta?.sourceType as keyof typeof SOURCE_META) ?? 'OSINT'].hex;
              return (
                <g
                  key={n.id}
                  onPointerDown={(e) => startNodeDrag(e, n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(null)}
                  className={cn('cursor-move', sel && 'drop-shadow-[0_0_10px_rgba(56,189,248,0.8)]')}
                >
                  <circle cx={n.x} cy={n.y} r={sel ? 8 : 5.5} fill={hex} opacity={0.9} stroke="#0b111d" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                  {sel && <circle cx={n.x} cy={n.y} r="13" fill="none" stroke={hex} strokeWidth="1.25" opacity="0.65" vectorEffect="non-scaling-stroke" />}
                </g>
              );
            }
            if (n.kind === 'event') {
              return (
                <g key={n.id} onPointerDown={(e) => startNodeDrag(e, n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(null)} className="cursor-move">
                  <rect x={n.x - 6} y={n.y - 6} width="12" height="12" fill="#c084fc" transform={`rotate(45 ${n.x} ${n.y})`} stroke="#0b111d" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                </g>
              );
            }
            const m = SEVERITY_META[n.severity ?? 'low'];
            return (
              <g key={n.id} onPointerDown={(e) => startNodeDrag(e, n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(null)} className="cursor-move">
                <circle cx={n.x} cy={n.y} r={sel ? 14 : 11} fill={m.hex} stroke={onPath ? '#fff' : '#0b111d'} strokeWidth={onPath ? 2.5 : 2}
                  filter={n.riskGlow ? 'url(#glow)' : undefined} opacity={0.95} vectorEffect="non-scaling-stroke" />
                <text x={n.x} y={n.y - 18} fill="#e2e8f0" fontSize="12" fontWeight={600} textAnchor="middle" className="select-none">{n.label}</text>
                <text x={n.x} y={n.y + 26} fill="#64748b" fontSize="9.5" textAnchor="middle" className="select-none uppercase">{n.sublabel}</text>
              </g>
            );
          })}
        </g>
      </svg>

      {hover && (
        <div className="pointer-events-none absolute bottom-3 left-3 max-w-xs rounded-lg border border-white/10 bg-ink-850/95 p-3 text-xs shadow-panel">
          <div className="font-semibold text-slate-100">{hover.label}</div>
          {hover.sublabel && <div className="text-[10px] uppercase tracking-wide text-slate-500">{hover.sublabel}</div>}
          {hover.meta?.confidence != null && <div className="mt-1 text-slate-400">Confidence: {typeof hover.meta.confidence === 'number' && hover.meta.confidence <= 1 ? Math.round((hover.meta.confidence as number) * 100) : (hover.meta.confidence as number)}%</div>}
          {hover.meta?.aliases != null && <div className="text-slate-400">Aliases resolved: {String(hover.meta.aliases)}</div>}
          {hover.meta?.reliability != null && <div className="text-slate-400">Reliability: {Math.round((hover.meta.reliability as number) * 100)}%</div>}
        </div>
      )}
    </div>
  );
}

export function GraphLegend() {
  const items: { label: string; kind: GraphEdge['kind'] }[] = [
    { label: 'Supports', kind: 'supports' },
    { label: 'Contradicts', kind: 'contradicts' },
    { label: 'Depends on', kind: 'depends-on' },
    { label: 'Mentions', kind: 'mentions' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
      {items.map((it) => (
        <span key={it.kind} className="flex items-center gap-1.5">
          <svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke={EDGE_STYLE[it.kind].stroke} strokeWidth={EDGE_STYLE[it.kind].w + 0.5} strokeDasharray={EDGE_STYLE[it.kind].dash} /></svg>
          {it.label}
        </span>
      ))}
      <span className={cn('flex items-center gap-1.5')}><span className="h-2.5 w-2.5 rounded-full bg-critical" /> High-risk entity</span>
    </div>
  );
}
