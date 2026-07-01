/**
 * Geographic helpers over the La Guaira - Caracas coastal operating area.
 */

import type { Coordinates } from '@/types';

// Local operating map bounds for the Venezuela earthquake response exercise.
export const MAP_BOUNDS = {
  minLat: 10.45,
  maxLat: 10.65,
  minLng: -67.08,
  maxLng: -66.86,
};

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in kilometres between two coordinates. */
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Number((2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))).toFixed(3));
}

/** Project a coordinate into [0,1] x [0,1] for the SVG basemap (y is flipped). */
export function project(c: Coordinates): { x: number; y: number } {
  const x = (c.lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng);
  const y = 1 - (c.lat - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat);
  return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
}
