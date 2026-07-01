import { describe, expect, it } from 'vitest';
import {
  applyNodeDrag,
  clampZoom,
  screenDeltaToGraphDelta,
  zoomAtPoint,
  type GraphViewport,
} from '@/lib/graphViewport';

describe('graph viewport helpers', () => {
  it('clamps zoom into the supported interaction range', () => {
    expect(clampZoom(0.1)).toBe(0.5);
    expect(clampZoom(1.25)).toBe(1.25);
    expect(clampZoom(8)).toBe(3);
  });

  it('converts screen drag movement into graph coordinates at the current zoom', () => {
    expect(screenDeltaToGraphDelta({ dx: 40, dy: -20 }, 2)).toEqual({ dx: 20, dy: -10 });
  });

  it('keeps the graph point under the cursor stable while zooming', () => {
    const viewport: GraphViewport = { zoom: 1, pan: { x: 0, y: 0 } };
    expect(zoomAtPoint(viewport, 2, { x: 250, y: 100 })).toEqual({
      zoom: 2,
      pan: { x: -250, y: -100 },
    });
  });

  it('moves only the dragged node and preserves all other positions', () => {
    const next = applyNodeDrag(
      { A: { x: 10, y: 20 }, B: { x: 100, y: 200 } },
      'A',
      { dx: 5, dy: -3 },
    );

    expect(next).toEqual({
      A: { x: 15, y: 17 },
      B: { x: 100, y: 200 },
    });
  });
});
