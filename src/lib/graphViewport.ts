export interface GraphPoint {
  x: number;
  y: number;
}

export interface GraphDelta {
  dx: number;
  dy: number;
}

export interface GraphViewport {
  zoom: number;
  pan: GraphPoint;
}

export type NodePositions = Record<string, GraphPoint>;

export const MIN_GRAPH_ZOOM = 0.5;
export const MAX_GRAPH_ZOOM = 3;

export function clampZoom(zoom: number): number {
  return Math.max(MIN_GRAPH_ZOOM, Math.min(MAX_GRAPH_ZOOM, Number(zoom.toFixed(3))));
}

export function screenDeltaToGraphDelta(delta: GraphDelta, zoom: number): GraphDelta {
  const safeZoom = zoom === 0 ? 1 : zoom;
  return {
    dx: Number((delta.dx / safeZoom).toFixed(3)),
    dy: Number((delta.dy / safeZoom).toFixed(3)),
  };
}

export function zoomAtPoint(viewport: GraphViewport, nextZoomInput: number, point: GraphPoint): GraphViewport {
  const nextZoom = clampZoom(nextZoomInput);
  const ratio = nextZoom / viewport.zoom;
  return {
    zoom: nextZoom,
    pan: {
      x: Number((point.x - (point.x - viewport.pan.x) * ratio).toFixed(3)),
      y: Number((point.y - (point.y - viewport.pan.y) * ratio).toFixed(3)),
    },
  };
}

export function applyNodeDrag(positions: NodePositions, nodeId: string, delta: GraphDelta): NodePositions {
  const current = positions[nodeId] ?? { x: 0, y: 0 };
  return {
    ...positions,
    [nodeId]: {
      x: Number((current.x + delta.dx).toFixed(3)),
      y: Number((current.y + delta.dy).toFixed(3)),
    },
  };
}
