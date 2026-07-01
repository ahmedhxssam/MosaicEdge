/**
 * Cursor-on-Target (CoT) adapter — MITRE CoT 2.0 event schema (the attached
 * reference). Mosaic Edge can emit a *CoT-compatible simulated edge event* for
 * any geolocated entity/alert so the picture is interoperable with TAK-style
 * field tooling. Markers are civilian/neutral by design — no targeting types.
 */

import type { EntityType, PriorityAlert, Severity } from '@/types';
import type { NormalizedReport } from '@/types/integration';

export interface CotEvent {
  uid: string;
  type: string;
  how: string;
  time: string;
  start: string;
  stale: string;
  lat: number;
  lon: number;
  hae: number;
  ce: number;
  le: number;
  callsign: string;
  remarks: string;
  provenance: string;
}

/** Neutral/friendly civil CoT type codes (no hostile / targeting affiliations). */
export function cotTypeForEntity(type: EntityType): string {
  switch (type) {
    case 'facility':
    case 'infrastructure':
    case 'depot':
      return 'a-n-G-I'; // neutral ground installation
    case 'unit':
      return 'a-f-G-U-C-I'; // friendly civil/medical unit
    case 'organization':
      return 'a-n-G-I-U'; // neutral installation, unknown
    default:
      return 'a-n-G'; // neutral ground (location / route / event)
  }
}

function addMinutesIso(iso: string, minutes: number): string {
  const d = new Date(Date.parse(iso) + minutes * 60000);
  return d.toISOString();
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const SEV_CE: Record<Severity, number> = { critical: 25, high: 50, medium: 100, low: 250 };

export function buildCotXml(e: CotEvent): string {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    `<event version="2.0" uid="${esc(e.uid)}" type="${esc(e.type)}" how="${esc(e.how)}" time="${e.time}" start="${e.start}" stale="${e.stale}">`,
    `  <point lat="${e.lat}" lon="${e.lon}" hae="${e.hae}" ce="${e.ce}" le="${e.le}"/>`,
    '  <detail>',
    `    <contact callsign="${esc(e.callsign)}"/>`,
    `    <remarks>${esc(e.remarks)}</remarks>`,
    '    <__group name="Cyan" role="Team Member"/>',
    `    <mosaicedge provenance="${esc(e.provenance)}" classification="SYNTHETIC // SIMULATED"/>`,
    '  </detail>',
    '</event>',
  ].join('\n');
}

/** Build a CoT-compatible simulated edge event from a Mosaic priority alert. */
export function alertToCot(
  alert: PriorityAlert,
  coord: { lat: number; lng: number } | undefined,
  entityType: EntityType,
  nowIso: string,
): { event: CotEvent; xml: string } {
  const lat = coord?.lat ?? 0;
  const lon = coord?.lng ?? 0;
  const event: CotEvent = {
    uid: `MOSAIC.${alert.id}`,
    type: cotTypeForEntity(entityType),
    how: 'm-g', // machine-generated
    time: nowIso,
    start: nowIso,
    stale: addMinutesIso(nowIso, 30),
    lat,
    lon,
    hae: 9999999.0,
    ce: SEV_CE[alert.severity],
    le: 9999999.0,
    callsign: alert.entityLabels[0] ?? alert.headline,
    remarks: `${alert.headline} — priority ${alert.priority}, confidence ${alert.confidence}%. ${alert.recommendedVerification}`,
    provenance: 'Mosaic Edge · CoT-Compatible Simulated Edge Event',
  };
  return { event, xml: buildCotXml(event) };
}

export function reportToCot(report: NormalizedReport, nowIso: string): { event: CotEvent; xml: string } | null {
  if (!report.coordinates) return null;
  const event: CotEvent = {
    uid: `MOSAIC.${report.id}`,
    type: 'a-n-G',
    how: 'm-g',
    time: report.timestamp,
    start: report.timestamp,
    stale: addMinutesIso(nowIso, 30),
    lat: report.coordinates.lat,
    lon: report.coordinates.lon,
    hae: 9999999.0,
    ce: 100,
    le: 9999999.0,
    callsign: report.location ?? report.id,
    remarks: `Imported ${report.sourceSystem} signal · tone ${report.tone ?? 0}`,
    provenance: report.sourceAttribution.label,
  };
  return { event, xml: buildCotXml(event) };
}

/** Parse a CoT XML string back into a partial event (regex-based; works in Node + browser). */
export function fromCotXml(xml: string): Partial<CotEvent> {
  const attr = (tag: string, name: string): string | undefined => {
    const re = new RegExp(`<${tag}[^>]*\\b${name}="([^"]*)"`, 'i');
    return re.exec(xml)?.[1];
  };
  const remarks = /<remarks>([\s\S]*?)<\/remarks>/i.exec(xml)?.[1];
  const numA = (v?: string) => (v != null ? Number(v) : undefined);
  return {
    uid: attr('event', 'uid'),
    type: attr('event', 'type'),
    how: attr('event', 'how'),
    time: attr('event', 'time'),
    start: attr('event', 'start'),
    stale: attr('event', 'stale'),
    lat: numA(attr('point', 'lat')),
    lon: numA(attr('point', 'lon')),
    hae: numA(attr('point', 'hae')),
    ce: numA(attr('point', 'ce')),
    le: numA(attr('point', 'le')),
    callsign: attr('contact', 'callsign'),
    remarks: remarks?.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'),
  };
}
