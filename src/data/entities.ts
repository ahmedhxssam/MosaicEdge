import type { Coordinates, EntityType, Language } from '@/types';

/**
 * Canonical (ground-truth) entities for the Venezuela earthquake response
 * exercise. The resolver does NOT read this table. It is the gold standard the
 * evaluation harness scores against, plus a display fallback and source of
 * risk-path labels.
 */
export interface CanonicalEntity {
  id: string;
  canonicalName: string;
  entityType: EntityType;
  coordinates: Coordinates;
  contextTags: string[];
  /** Distinct multilingual surface forms that should resolve to this entity. */
  aliases: { surfaceForm: string; language: Language }[];
}

export const CANONICAL_ENTITIES: CanonicalEntity[] = [
  {
    id: 'ENT-HOSP',
    canonicalName: 'Hospital Dr. Jose Maria Vargas',
    entityType: 'facility',
    coordinates: { lat: 10.604, lng: -66.936, gridRef: 'LG-HOSP-02' },
    contextTags: ['fuel', 'generator', 'medical', 'patients', 'evacuation', 'trauma'],
    aliases: [
      { surfaceForm: 'Hospital Dr. Jose Maria Vargas', language: 'en' },
      { surfaceForm: 'Vargas Hospital', language: 'en' },
      { surfaceForm: 'Hospital Vargas', language: 'es' },
      { surfaceForm: 'مستشفى فارغاس', language: 'ar' },
    ],
  },
  {
    id: 'ENT-HIGHWAY',
    canonicalName: 'Caracas-La Guaira Highway',
    entityType: 'route',
    coordinates: { lat: 10.548, lng: -66.952, gridRef: 'LG-ROAD-05' },
    contextTags: ['access', 'landslide', 'resupply', 'corridor', 'aftershock'],
    aliases: [
      { surfaceForm: 'Caracas-La Guaira Highway', language: 'en' },
      { surfaceForm: 'Autopista Caracas-La Guaira', language: 'es' },
      { surfaceForm: 'طريق كاراكاس لا غوايرا', language: 'ar' },
    ],
  },
  {
    id: 'ENT-VIADUCT',
    canonicalName: 'Tacagua Viaduct',
    entityType: 'infrastructure',
    coordinates: { lat: 10.525, lng: -66.962, gridRef: 'LG-VIAD-01' },
    contextTags: ['bridge', 'viaduct', 'structural-damage', 'highway'],
    aliases: [
      { surfaceForm: 'Tacagua Viaduct', language: 'en' },
      { surfaceForm: 'Viaducto Tacagua', language: 'es' },
      { surfaceForm: 'جسر تاكاغوا', language: 'ar' },
    ],
  },
  {
    id: 'ENT-SHELTER',
    canonicalName: 'Polideportivo Jose Maria Vargas Shelter',
    entityType: 'facility',
    coordinates: { lat: 10.612, lng: -66.929, gridRef: 'LG-SHLT-03' },
    contextTags: ['shelter', 'evacuation', 'capacity', 'sanitation'],
    aliases: [
      { surfaceForm: 'Polideportivo Jose Maria Vargas Shelter', language: 'en' },
      { surfaceForm: 'Refugio Polideportivo Vargas', language: 'es' },
      { surfaceForm: 'مركز إيواء فارغاس', language: 'ar' },
    ],
  },
  {
    id: 'ENT-PORT',
    canonicalName: 'Port of La Guaira Aid Staging Area',
    entityType: 'depot',
    coordinates: { lat: 10.603, lng: -66.905, gridRef: 'LG-PORT-07' },
    contextTags: ['aid', 'supplies', 'fuel', 'staging', 'port'],
    aliases: [
      { surfaceForm: 'Port of La Guaira Aid Staging Area', language: 'en' },
      { surfaceForm: 'Puerto de La Guaira', language: 'es' },
    ],
  },
  {
    id: 'ENT-LA-GUAIRA',
    canonicalName: 'La Guaira',
    entityType: 'location',
    coordinates: { lat: 10.6, lng: -66.933, gridRef: 'LG-CITY-01' },
    contextTags: ['population', 'earthquake', 'coastal-zone', 'displacement'],
    aliases: [{ surfaceForm: 'La Guaira', language: 'es' }],
  },
  {
    id: 'ENT-EOC',
    canonicalName: 'Caracas Emergency Operations Center',
    entityType: 'organization',
    coordinates: { lat: 10.5, lng: -66.917, gridRef: 'CCS-EOC-04' },
    contextTags: ['coordination', 'tasking', 'humanitarian-response'],
    aliases: [
      { surfaceForm: 'Caracas Emergency Operations Center', language: 'en' },
      { surfaceForm: 'Centro de Operaciones de Emergencia Caracas', language: 'es' },
    ],
  },
  {
    id: 'ENT-WATER',
    canonicalName: 'Catia La Mar Water Point',
    entityType: 'location',
    coordinates: { lat: 10.605, lng: -67.032, gridRef: 'LG-WATR-11' },
    contextTags: ['water', 'sanitation', 'queue', 'disease-risk'],
    aliases: [
      { surfaceForm: 'Catia La Mar Water Point', language: 'en' },
      { surfaceForm: 'Punto de agua Catia La Mar', language: 'es' },
    ],
  },
  {
    id: 'ENT-USAR4',
    canonicalName: 'USAR Team 4',
    entityType: 'unit',
    coordinates: { lat: 10.615, lng: -66.941, gridRef: 'LG-USAR-12' },
    contextTags: ['search-rescue', 'rubble', 'comms', 'thermal-camera'],
    aliases: [{ surfaceForm: 'USAR Team 4', language: 'en' }],
  },
];

export const CANONICAL_BY_ID: Record<string, CanonicalEntity> = Object.fromEntries(
  CANONICAL_ENTITIES.map((e) => [e.id, e]),
);

export function canonicalCoords(id: string): Coordinates | undefined {
  return CANONICAL_BY_ID[id]?.coordinates;
}
