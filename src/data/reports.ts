import type {
  Claim,
  Coordinates,
  EntityMention,
  EntityType,
  Language,
  Report,
  ReliabilityTier,
  SourceType,
} from '@/types';
import { sha256 } from '@/lib/sha256';
import { CANONICAL_BY_ID } from './entities';
import { T0_MS } from './scenario';

interface RawMention {
  surface: string;
  type: EntityType;
  canonicalId: string;
  lang?: Language;
  context?: string[];
}
interface RawClaim {
  subjectIdx: number;
  predicate: string;
  value: string | number | boolean;
  valueText: string;
  confidence?: number;
}
interface RawReport {
  id: string;
  sourceType: SourceType;
  sourceName: string;
  reliability: number;
  language: Language;
  minutesBeforeT0: number;
  location: string;
  coordEntity: string;
  raw: string;
  translated?: string;
  classification: string;
  thread: string;
  mentions: RawMention[];
  claims: RawClaim[];
}

function tierFromScore(score: number): ReliabilityTier {
  if (score >= 0.85) return 'high';
  if (score >= 0.6) return 'medium';
  if (score >= 0.38) return 'low';
  return 'very-low';
}

/** Small deterministic positional jitter so co-located mentions are near, not identical. */
function jitter(base: Coordinates, seed: string): Coordinates {
  const h = sha256(seed);
  const jLat = (parseInt(h.slice(0, 4), 16) / 0xffff - 0.5) * 0.0042;
  const jLng = (parseInt(h.slice(4, 8), 16) / 0xffff - 0.5) * 0.0042;
  return {
    lat: Number((base.lat + jLat).toFixed(5)),
    lng: Number((base.lng + jLng).toFixed(5)),
    gridRef: base.gridRef,
  };
}

function build(raw: RawReport): Report {
  const ts = new Date(T0_MS - raw.minutesBeforeT0 * 60_000).toISOString();
  const mentions: EntityMention[] = raw.mentions.map((m, i) => {
    const canon = CANONICAL_BY_ID[m.canonicalId];
    const mId = `${raw.id}-m${i}`;
    return {
      id: mId,
      reportId: raw.id,
      surfaceForm: m.surface,
      language: m.lang ?? raw.language,
      entityType: m.type,
      canonicalId: m.canonicalId,
      coordinates: canon ? jitter(canon.coordinates, mId) : undefined,
      contextTags: m.context ?? canon?.contextTags.slice(0, 3) ?? [],
    };
  });

  const claims: Claim[] = raw.claims.map((c, j) => {
    const subj = mentions[c.subjectIdx];
    return {
      id: `${raw.id}-c${j}`,
      reportId: raw.id,
      subjectMentionId: subj.id,
      subjectCanonicalId: subj.canonicalId,
      subjectLabel: subj.surfaceForm,
      predicate: c.predicate,
      value: c.value,
      valueText: c.valueText,
      timestamp: ts,
      sourceReliability: raw.reliability,
      extractedConfidence: c.confidence ?? 0.9,
      language: raw.language,
      topicId: raw.thread,
    };
  });

  const anchor = CANONICAL_BY_ID[raw.coordEntity];
  return {
    id: raw.id,
    sourceType: raw.sourceType,
    sourceName: raw.sourceName,
    reliabilityScore: raw.reliability,
    reliabilityTier: tierFromScore(raw.reliability),
    language: raw.language,
    timestamp: ts,
    minutesBeforeT0: raw.minutesBeforeT0,
    location: raw.location,
    coordinates: anchor ? anchor.coordinates : { lat: 10.6, lng: -66.933, gridRef: 'LG-CITY-00' },
    rawText: raw.raw,
    translatedText: raw.translated,
    extractedEntities: mentions,
    extractedClaims: claims,
    sourceClassification: raw.classification,
    integrityHash: sha256(`${raw.id}|${raw.raw}|${ts}`),
    processingStatus: 'synced',
    threadId: raw.thread,
    unsynced: false,
  };
}

const RAW_REPORTS: RawReport[] = [
  {
    id: 'R-001', sourceType: 'HUMINT', sourceName: 'Hospital Liaison Bravo', reliability: 0.9,
    language: 'en', minutesBeforeT0: 12, location: 'Hospital Dr. Jose Maria Vargas, La Guaira', coordEntity: 'ENT-HOSP',
    raw: 'Hospital Dr. Jose Maria Vargas reports generator fuel will last about three hours. Caracas-La Guaira Highway access is closed after damage near the Tacagua Viaduct.',
    classification: 'SYNTHETIC // SIMULATED // HUMINT // FIELD-LIAISON', thread: 'hospital-fuel',
    mentions: [
      { surface: 'Hospital Dr. Jose Maria Vargas', type: 'facility', canonicalId: 'ENT-HOSP', context: ['fuel', 'generator', 'trauma'] },
      { surface: 'Caracas-La Guaira Highway', type: 'route', canonicalId: 'ENT-HIGHWAY', context: ['resupply', 'closed'] },
      { surface: 'Tacagua Viaduct', type: 'infrastructure', canonicalId: 'ENT-VIADUCT', context: ['structural-damage', 'highway'] },
    ],
    claims: [
      { subjectIdx: 0, predicate: 'fuelHoursRemaining', value: 3, valueText: '3 hours of generator fuel' },
      { subjectIdx: 1, predicate: 'status', value: 'closed', valueText: 'Caracas-La Guaira Highway closed' },
      { subjectIdx: 2, predicate: 'status', value: 'closed', valueText: 'Tacagua Viaduct closed pending inspection' },
    ],
  },
  {
    id: 'R-002', sourceType: 'OSINT', sourceName: 'La Guaira Community Channel', reliability: 0.45,
    language: 'ar', minutesBeforeT0: 25, location: 'La Guaira', coordEntity: 'ENT-HOSP',
    raw: 'مستشفى فارغاس لديه نقص في الوقود، وطريق كاراكاس لا غوايرا مغلق بسبب الانهيارات.',
    translated: 'Vargas Hospital has a fuel shortage, and the Caracas-La Guaira road is closed because of landslides.',
    classification: 'SYNTHETIC // SIMULATED // OSINT // PUBLIC-CHANNEL', thread: 'hospital-fuel',
    mentions: [
      { surface: 'مستشفى فارغاس', type: 'facility', canonicalId: 'ENT-HOSP', context: ['fuel'] },
      { surface: 'طريق كاراكاس لا غوايرا', type: 'route', canonicalId: 'ENT-HIGHWAY', context: ['landslide', 'closed'] },
    ],
    claims: [
      { subjectIdx: 0, predicate: 'fuelShortage', value: true, valueText: 'Fuel shortage reported', confidence: 0.8 },
      { subjectIdx: 1, predicate: 'status', value: 'closed', valueText: 'Highway closed by landslides', confidence: 0.78 },
    ],
  },
  {
    id: 'R-003', sourceType: 'SIGINT', sourceName: 'Synthetic Relief Comms Digest', reliability: 0.7,
    language: 'es', minutesBeforeT0: 18, location: 'Caracas-La Guaira corridor', coordEntity: 'ENT-HIGHWAY',
    raw: 'Hospital Vargas necesita combustible. La Autopista Caracas-La Guaira permanece cerrada.',
    translated: 'Vargas Hospital needs fuel. The Caracas-La Guaira Highway remains closed.',
    classification: 'SYNTHETIC // SIMULATED // SIGINT // COMMS-SUMMARY', thread: 'hospital-fuel',
    mentions: [
      { surface: 'Hospital Vargas', type: 'facility', canonicalId: 'ENT-HOSP', lang: 'es', context: ['fuel'] },
      { surface: 'Autopista Caracas-La Guaira', type: 'route', canonicalId: 'ENT-HIGHWAY', lang: 'es', context: ['closed'] },
    ],
    claims: [
      { subjectIdx: 0, predicate: 'fuelShortage', value: true, valueText: 'Hospital needs generator fuel', confidence: 0.82 },
      { subjectIdx: 1, predicate: 'status', value: 'closed', valueText: 'Highway remains closed', confidence: 0.84 },
    ],
  },
  {
    id: 'R-004', sourceType: 'GEOINT', sourceName: 'Sentinel Damage Cell G-7', reliability: 0.92,
    language: 'en', minutesBeforeT0: 9, location: 'Tacagua Viaduct approach', coordEntity: 'ENT-VIADUCT',
    raw: 'Imagery shows slope failure and debris at the Tacagua Viaduct approach on the Caracas-La Guaira Highway. Vehicle transit is unlikely.',
    classification: 'SYNTHETIC // SIMULATED // GEOINT // IMAGERY', thread: 'hospital-fuel',
    mentions: [
      { surface: 'Tacagua Viaduct', type: 'infrastructure', canonicalId: 'ENT-VIADUCT', context: ['landslide', 'structural-damage'] },
      { surface: 'Caracas-La Guaira Highway', type: 'route', canonicalId: 'ENT-HIGHWAY', context: ['debris', 'closed'] },
    ],
    claims: [
      { subjectIdx: 0, predicate: 'status', value: 'closed', valueText: 'Viaduct approach impassable', confidence: 0.95 },
      { subjectIdx: 1, predicate: 'status', value: 'closed', valueText: 'Highway impassable near viaduct', confidence: 0.95 },
    ],
  },
  {
    id: 'R-005', sourceType: 'OSINT', sourceName: 'Anonymous Driver Post', reliability: 0.25,
    language: 'en', minutesBeforeT0: 87, location: 'Caracas-La Guaira Highway', coordEntity: 'ENT-HIGHWAY',
    raw: 'Caracas-La Guaira Highway appears open for limited traffic through the Tacagua Viaduct.',
    classification: 'SYNTHETIC // SIMULATED // OSINT // ANONYMOUS', thread: 'hospital-fuel',
    mentions: [
      { surface: 'Caracas-La Guaira Highway', type: 'route', canonicalId: 'ENT-HIGHWAY' },
      { surface: 'Tacagua Viaduct', type: 'infrastructure', canonicalId: 'ENT-VIADUCT' },
    ],
    claims: [
      { subjectIdx: 0, predicate: 'status', value: 'open', valueText: 'Highway open for limited traffic', confidence: 0.55 },
      { subjectIdx: 1, predicate: 'status', value: 'open', valueText: 'Viaduct passable for limited traffic', confidence: 0.5 },
    ],
  },
  {
    id: 'R-006', sourceType: 'HUMINT', sourceName: 'Hospital Logistics Officer', reliability: 0.88,
    language: 'en', minutesBeforeT0: 6, location: 'Hospital Dr. Jose Maria Vargas', coordEntity: 'ENT-HOSP',
    raw: 'Hospital Dr. Jose Maria Vargas generator fuel revised to under three hours; urgent resupply requested through a verified coastal corridor.',
    classification: 'SYNTHETIC // SIMULATED // HUMINT // HOSPITAL-LIAISON', thread: 'hospital-fuel',
    mentions: [{ surface: 'Hospital Dr. Jose Maria Vargas', type: 'facility', canonicalId: 'ENT-HOSP', context: ['fuel', 'generator'] }],
    claims: [
      { subjectIdx: 0, predicate: 'fuelHoursRemaining', value: 3, valueText: 'Under 3 hours of fuel' },
      { subjectIdx: 0, predicate: 'fuelUrgent', value: true, valueText: 'Urgent fuel resupply requested' },
    ],
  },
  {
    id: 'R-007', sourceType: 'OSINT', sourceName: 'Regional Relief Bulletin', reliability: 0.5,
    language: 'en', minutesBeforeT0: 95, location: 'Vargas Hospital', coordEntity: 'ENT-HOSP',
    raw: 'Vargas Hospital indicates roughly eight hours of generator fuel remaining.',
    classification: 'SYNTHETIC // SIMULATED // OSINT // BULLETIN', thread: 'hospital-fuel',
    mentions: [{ surface: 'Vargas Hospital', type: 'facility', canonicalId: 'ENT-HOSP', context: ['fuel'] }],
    claims: [{ subjectIdx: 0, predicate: 'fuelHoursRemaining', value: 8, valueText: '8 hours of fuel', confidence: 0.7 }],
  },
  {
    id: 'R-008', sourceType: 'OSINT', sourceName: 'Catia La Mar Neighborhood Feed', reliability: 0.45,
    language: 'en', minutesBeforeT0: 40, location: 'Catia La Mar Water Point', coordEntity: 'ENT-WATER',
    raw: 'Residents reportedly moving on foot toward the Catia La Mar Water Point; sanitation conditions described as unsafe.',
    classification: 'SYNTHETIC // SIMULATED // OSINT // PUBLIC-CHANNEL', thread: 'evacuation-route',
    mentions: [
      { surface: 'Catia La Mar Water Point', type: 'location', canonicalId: 'ENT-WATER', context: ['water', 'unsafe'] },
      { surface: 'La Guaira', type: 'location', canonicalId: 'ENT-LA-GUAIRA', context: ['displacement'] },
    ],
    claims: [
      { subjectIdx: 0, predicate: 'safety', value: 'unsafe', valueText: 'Water point unsafe; civilians moving', confidence: 0.6 },
      { subjectIdx: 0, predicate: 'sanitationRisk', value: 'high', valueText: 'High sanitation risk at water queue', confidence: 0.62 },
    ],
  },
  {
    id: 'R-009', sourceType: 'HUMINT', sourceName: 'Shelter Team Alpha', reliability: 0.85,
    language: 'en', minutesBeforeT0: 33, location: 'Polideportivo Jose Maria Vargas Shelter', coordEntity: 'ENT-SHELTER',
    raw: 'Polideportivo Jose Maria Vargas Shelter partially open; limited family intake continues.',
    classification: 'SYNTHETIC // SIMULATED // HUMINT // SHELTER-TEAM', thread: 'evacuation-route',
    mentions: [{ surface: 'Polideportivo Jose Maria Vargas Shelter', type: 'facility', canonicalId: 'ENT-SHELTER', context: ['shelter', 'capacity'] }],
    claims: [{ subjectIdx: 0, predicate: 'status', value: 'partially-open', valueText: 'Partially open for limited intake' }],
  },
  {
    id: 'R-010', sourceType: 'SIGINT', sourceName: 'Synthetic Relief Comms Digest', reliability: 0.5,
    language: 'es', minutesBeforeT0: 28, location: 'Refugio Polideportivo Vargas', coordEntity: 'ENT-SHELTER',
    raw: 'Refugio Polideportivo Vargas cerrado por hacinamiento y dano estructural.',
    translated: 'Polideportivo Vargas shelter closed because of crowding and structural damage.',
    classification: 'SYNTHETIC // SIMULATED // SIGINT // COMMS-SUMMARY', thread: 'evacuation-route',
    mentions: [{ surface: 'Refugio Polideportivo Vargas', type: 'facility', canonicalId: 'ENT-SHELTER', lang: 'es', context: ['shelter', 'crowding'] }],
    claims: [{ subjectIdx: 0, predicate: 'status', value: 'closed', valueText: 'Closed due to crowding and damage', confidence: 0.7 }],
  },
  {
    id: 'R-011', sourceType: 'GEOINT', sourceName: 'Shelter Imagery Node G-7', reliability: 0.9,
    language: 'en', minutesBeforeT0: 11, location: 'Polideportivo Jose Maria Vargas Shelter', coordEntity: 'ENT-SHELTER',
    raw: 'Imagery and gate count show the Polideportivo shelter operating at controlled capacity; new arrivals are admitted only by triage priority.',
    classification: 'SYNTHETIC // SIMULATED // GEOINT // IMAGERY', thread: 'evacuation-route',
    mentions: [{ surface: 'Polideportivo Jose Maria Vargas Shelter', type: 'facility', canonicalId: 'ENT-SHELTER', context: ['shelter', 'capacity'] }],
    claims: [{ subjectIdx: 0, predicate: 'status', value: 'capacity-only', valueText: 'Capacity-only triage admission', confidence: 0.93 }],
  },
  {
    id: 'R-012', sourceType: 'HUMINT', sourceName: 'Shelter Team Alpha', reliability: 0.8,
    language: 'ar', minutesBeforeT0: 20, location: 'Polideportivo Jose Maria Vargas Shelter', coordEntity: 'ENT-SHELTER',
    raw: 'مركز إيواء فارغاس مفتوح للعائلات ذات الأولوية فقط.',
    translated: 'Vargas shelter is open only for priority families.',
    classification: 'SYNTHETIC // SIMULATED // HUMINT // SHELTER-TEAM', thread: 'evacuation-route',
    mentions: [{ surface: 'مركز إيواء فارغاس', type: 'facility', canonicalId: 'ENT-SHELTER', context: ['shelter', 'capacity'] }],
    claims: [{ subjectIdx: 0, predicate: 'status', value: 'capacity-only', valueText: 'Priority families only', confidence: 0.85 }],
  },
  {
    id: 'R-013', sourceType: 'OSINT', sourceName: 'Social Feed Aggregator', reliability: 0.22,
    language: 'en', minutesBeforeT0: 50, location: 'Hospital Dr. Jose Maria Vargas', coordEntity: 'ENT-HOSP',
    raw: 'Social post: "Hospital Dr. Jose Maria Vargas evacuation is complete, all patients moved."',
    classification: 'SYNTHETIC // SIMULATED // OSINT // SOCIAL', thread: 'misinformation',
    mentions: [{ surface: 'Hospital Dr. Jose Maria Vargas', type: 'facility', canonicalId: 'ENT-HOSP', context: ['evacuation'] }],
    claims: [{ subjectIdx: 0, predicate: 'evacuationComplete', value: true, valueText: 'Evacuation complete (claimed)', confidence: 0.5 }],
  },
  {
    id: 'R-014', sourceType: 'HUMINT', sourceName: 'Hospital Liaison Bravo', reliability: 0.87,
    language: 'en', minutesBeforeT0: 22, location: 'Hospital Dr. Jose Maria Vargas', coordEntity: 'ENT-HOSP',
    raw: 'Hospital Dr. Jose Maria Vargas still has trauma patients on-site; no full evacuation has occurred.',
    classification: 'SYNTHETIC // SIMULATED // HUMINT // HOSPITAL-LIAISON', thread: 'misinformation',
    mentions: [{ surface: 'Hospital Dr. Jose Maria Vargas', type: 'facility', canonicalId: 'ENT-HOSP', context: ['evacuation', 'patients'] }],
    claims: [{ subjectIdx: 0, predicate: 'evacuationComplete', value: false, valueText: 'Evacuation not complete', confidence: 0.92 }],
  },
  {
    id: 'R-015', sourceType: 'GEOINT', sourceName: 'Hospital Imagery Node G-2', reliability: 0.86,
    language: 'en', minutesBeforeT0: 15, location: 'Hospital Dr. Jose Maria Vargas', coordEntity: 'ENT-HOSP',
    raw: 'Imagery shows ambulances and patient movement still at Hospital Dr. Jose Maria Vargas.',
    classification: 'SYNTHETIC // SIMULATED // GEOINT // IMAGERY', thread: 'misinformation',
    mentions: [{ surface: 'Hospital Dr. Jose Maria Vargas', type: 'facility', canonicalId: 'ENT-HOSP', context: ['patients', 'evacuation'] }],
    claims: [{ subjectIdx: 0, predicate: 'evacuationComplete', value: false, valueText: 'Patients remain on-site', confidence: 0.9 }],
  },
  {
    id: 'R-016', sourceType: 'HUMINT', sourceName: 'Port Staging Officer', reliability: 0.82,
    language: 'en', minutesBeforeT0: 44, location: 'Port of La Guaira Aid Staging Area', coordEntity: 'ENT-PORT',
    raw: 'Port of La Guaira Aid Staging Area reports fuel, water purification tablets, and trauma supplies available for dispatch.',
    classification: 'SYNTHETIC // SIMULATED // HUMINT // LOGISTICS', thread: 'logistics-depot',
    mentions: [{ surface: 'Port of La Guaira Aid Staging Area', type: 'depot', canonicalId: 'ENT-PORT', context: ['supplies', 'fuel'] }],
    claims: [{ subjectIdx: 0, predicate: 'suppliesAvailable', value: true, valueText: 'Fuel and medical supplies available' }],
  },
  {
    id: 'R-017', sourceType: 'OSINT', sourceName: 'Port Worker Chat Relay', reliability: 0.45,
    language: 'es', minutesBeforeT0: 30, location: 'Puerto de La Guaira', coordEntity: 'ENT-PORT',
    raw: 'Puerto de La Guaira mantiene suministros medicos en zona de acopio.',
    translated: 'The Port of La Guaira maintains medical supplies in the staging area.',
    classification: 'SYNTHETIC // SIMULATED // OSINT // LOCAL-RELAY', thread: 'logistics-depot',
    mentions: [{ surface: 'Puerto de La Guaira', type: 'depot', canonicalId: 'ENT-PORT', lang: 'es', context: ['supplies'] }],
    claims: [{ subjectIdx: 0, predicate: 'suppliesAvailable', value: true, valueText: 'Medical supplies staged at port', confidence: 0.72 }],
  },
  {
    id: 'R-018', sourceType: 'GEOINT', sourceName: 'Port Imagery Node G-3', reliability: 0.9,
    language: 'en', minutesBeforeT0: 13, location: 'Port of La Guaira Aid Staging Area', coordEntity: 'ENT-PORT',
    raw: 'Secondary access lane east of the port staging yard appears viable for light transport.',
    classification: 'SYNTHETIC // SIMULATED // GEOINT // IMAGERY', thread: 'logistics-depot',
    mentions: [{ surface: 'Port of La Guaira Aid Staging Area', type: 'depot', canonicalId: 'ENT-PORT', context: ['access'] }],
    claims: [{ subjectIdx: 0, predicate: 'secondaryRouteViable', value: true, valueText: 'Secondary port lane viable for light vehicles', confidence: 0.86 }],
  },
  {
    id: 'R-019', sourceType: 'HUMINT', sourceName: 'USAR Team 4', reliability: 0.85,
    language: 'en', minutesBeforeT0: 70, location: 'La Guaira collapsed housing sector', coordEntity: 'ENT-USAR4',
    raw: 'USAR Team 4 operating near collapsed housing in La Guaira; routine status normal.',
    classification: 'SYNTHETIC // SIMULATED // HUMINT // SEARCH-RESCUE', thread: 'comms-gap',
    mentions: [
      { surface: 'USAR Team 4', type: 'unit', canonicalId: 'ENT-USAR4', context: ['search-rescue', 'comms'] },
      { surface: 'La Guaira', type: 'location', canonicalId: 'ENT-LA-GUAIRA' },
    ],
    claims: [
      { subjectIdx: 0, predicate: 'incidentReported', value: false, valueText: 'No incident reported at last check', confidence: 0.8 },
      { subjectIdx: 0, predicate: 'contextNote', value: 'collapsed-housing-search', valueText: 'Team assigned to collapsed housing search', confidence: 0.9 },
    ],
  },
  {
    id: 'R-020', sourceType: 'SIGINT', sourceName: 'Synthetic Relief Comms Digest', reliability: 0.62,
    language: 'en', minutesBeforeT0: 35, location: 'La Guaira collapsed housing sector', coordEntity: 'ENT-USAR4',
    raw: 'Last contact with USAR Team 4 logged; no further transmissions received after aftershock traffic increased.',
    classification: 'SYNTHETIC // SIMULATED // SIGINT // COMMS-SUMMARY', thread: 'comms-gap',
    mentions: [{ surface: 'USAR Team 4', type: 'unit', canonicalId: 'ENT-USAR4', context: ['comms'] }],
    claims: [{ subjectIdx: 0, predicate: 'lastContact', value: 'silent', valueText: 'No transmissions after last contact', confidence: 0.76 }],
  },
  {
    id: 'R-021', sourceType: 'OSINT', sourceName: 'La Guaira Community Channel', reliability: 0.42,
    language: 'ar', minutesBeforeT0: 55, location: 'Caracas-La Guaira Highway', coordEntity: 'ENT-HIGHWAY',
    raw: 'تقارير عن أضرار على طريق كاراكاس لا غوايرا قرب جسر تاكاغوا.',
    translated: 'Reports of damage on the Caracas-La Guaira road near the Tacagua Viaduct.',
    classification: 'SYNTHETIC // SIMULATED // OSINT // PUBLIC-CHANNEL', thread: 'hospital-fuel',
    mentions: [
      { surface: 'طريق كاراكاس لا غوايرا', type: 'route', canonicalId: 'ENT-HIGHWAY', context: ['damage'] },
      { surface: 'جسر تاكاغوا', type: 'infrastructure', canonicalId: 'ENT-VIADUCT', context: ['damage'] },
    ],
    claims: [
      { subjectIdx: 0, predicate: 'status', value: 'closed', valueText: 'Damage reported; highway treated as closed', confidence: 0.6 },
      { subjectIdx: 1, predicate: 'status', value: 'closed', valueText: 'Viaduct damage reported', confidence: 0.6 },
    ],
  },
  {
    id: 'R-022', sourceType: 'GEOINT', sourceName: 'Sentinel Damage Cell G-7', reliability: 0.92,
    language: 'en', minutesBeforeT0: 16, location: 'Caracas-La Guaira Highway', coordEntity: 'ENT-HIGHWAY',
    raw: 'Imagery shows the Caracas-La Guaira Highway obstructed by debris between the port junction and the Tacagua Viaduct.',
    classification: 'SYNTHETIC // SIMULATED // GEOINT // IMAGERY', thread: 'hospital-fuel',
    mentions: [
      { surface: 'Caracas-La Guaira Highway', type: 'route', canonicalId: 'ENT-HIGHWAY', context: ['debris', 'closed'] },
      { surface: 'Tacagua Viaduct', type: 'infrastructure', canonicalId: 'ENT-VIADUCT', context: ['debris'] },
      { surface: 'Port of La Guaira Aid Staging Area', type: 'depot', canonicalId: 'ENT-PORT', context: ['port'] },
    ],
    claims: [
      { subjectIdx: 0, predicate: 'status', value: 'closed', valueText: 'Highway obstructed by debris', confidence: 0.92 },
      { subjectIdx: 1, predicate: 'status', value: 'closed', valueText: 'Viaduct approach blocked by debris', confidence: 0.9 },
    ],
  },
  {
    id: 'R-023', sourceType: 'HUMINT', sourceName: 'Field Team Costa-1', reliability: 0.84,
    language: 'es', minutesBeforeT0: 19, location: 'Autopista Caracas-La Guaira', coordEntity: 'ENT-HIGHWAY',
    raw: 'El equipo de campo confirma el cierre de la Autopista Caracas-La Guaira.',
    translated: 'The field team confirms the closure of the Caracas-La Guaira Highway.',
    classification: 'SYNTHETIC // SIMULATED // HUMINT // FIELD-TEAM', thread: 'hospital-fuel',
    mentions: [{ surface: 'Autopista Caracas-La Guaira', type: 'route', canonicalId: 'ENT-HIGHWAY', lang: 'es', context: ['corridor'] }],
    claims: [{ subjectIdx: 0, predicate: 'status', value: 'closed', valueText: 'Highway closure confirmed', confidence: 0.86 }],
  },
  {
    id: 'R-024', sourceType: 'SIGINT', sourceName: 'Synthetic Relief Comms Digest', reliability: 0.72,
    language: 'en', minutesBeforeT0: 24, location: 'Caracas Emergency Operations Center', coordEntity: 'ENT-EOC',
    raw: 'Intercept summary (synthetic): coordination net references Hospital Dr. Jose Maria Vargas fuel resupply as urgent priority.',
    classification: 'SYNTHETIC // SIMULATED // SIGINT // COMMS-SUMMARY', thread: 'hospital-fuel',
    mentions: [
      { surface: 'Hospital Dr. Jose Maria Vargas', type: 'facility', canonicalId: 'ENT-HOSP', context: ['fuel'] },
      { surface: 'Caracas Emergency Operations Center', type: 'organization', canonicalId: 'ENT-EOC', context: ['coordination'] },
    ],
    claims: [
      { subjectIdx: 0, predicate: 'fuelUrgent', value: true, valueText: 'Fuel resupply named urgent priority', confidence: 0.76 },
      { subjectIdx: 1, predicate: 'contextNote', value: 'fuel-priority', valueText: 'EOC coordinating hospital fuel priority', confidence: 0.8 },
    ],
  },
  {
    id: 'R-025', sourceType: 'HUMINT', sourceName: 'Caracas Emergency Operations Center', reliability: 0.86,
    language: 'en', minutesBeforeT0: 48, location: 'Caracas Emergency Operations Center', coordEntity: 'ENT-EOC',
    raw: 'Caracas Emergency Operations Center requests a consolidated picture of La Guaira corridor risks and shelter status.',
    classification: 'SYNTHETIC // SIMULATED // HUMINT // COORDINATION', thread: 'evacuation-route',
    mentions: [
      { surface: 'Caracas Emergency Operations Center', type: 'organization', canonicalId: 'ENT-EOC', context: ['coordination'] },
      { surface: 'La Guaira', type: 'location', canonicalId: 'ENT-LA-GUAIRA', context: ['displacement'] },
      { surface: 'Polideportivo Jose Maria Vargas Shelter', type: 'facility', canonicalId: 'ENT-SHELTER', context: ['shelter'] },
    ],
    claims: [{ subjectIdx: 0, predicate: 'contextNote', value: 'consolidated-picture-requested', valueText: 'EOC requests consolidated corridor and shelter picture', confidence: 0.9 }],
  },
  {
    id: 'R-026', sourceType: 'OSINT', sourceName: 'Local Traffic Channel', reliability: 0.4,
    language: 'en', minutesBeforeT0: 58, location: 'Caracas-La Guaira Highway', coordEntity: 'ENT-HIGHWAY',
    raw: 'Local channel claims Caracas-La Guaira Highway reopened for limited traffic.',
    classification: 'SYNTHETIC // SIMULATED // OSINT // LOCAL-CHANNEL', thread: 'hospital-fuel',
    mentions: [{ surface: 'Caracas-La Guaira Highway', type: 'route', canonicalId: 'ENT-HIGHWAY' }],
    claims: [{ subjectIdx: 0, predicate: 'status', value: 'open', valueText: 'Highway reopened (claimed)', confidence: 0.5 }],
  },
  {
    id: 'R-027', sourceType: 'GEOINT', sourceName: 'Aftershock Damage Cell', reliability: 0.89,
    language: 'en', minutesBeforeT0: 7, location: 'Tacagua Viaduct approach', coordEntity: 'ENT-VIADUCT',
    raw: 'Aftershock debris shifted at the Tacagua Viaduct approach; Caracas-La Guaira Highway remains impassable to vehicles.',
    classification: 'SYNTHETIC // SIMULATED // GEOINT // IMAGERY', thread: 'hospital-fuel',
    mentions: [
      { surface: 'Tacagua Viaduct', type: 'infrastructure', canonicalId: 'ENT-VIADUCT', context: ['aftershock', 'debris'] },
      { surface: 'Caracas-La Guaira Highway', type: 'route', canonicalId: 'ENT-HIGHWAY', context: ['aftershock', 'closed'] },
    ],
    claims: [
      { subjectIdx: 0, predicate: 'status', value: 'closed', valueText: 'Viaduct approach still impassable', confidence: 0.9 },
      { subjectIdx: 1, predicate: 'status', value: 'closed', valueText: 'Highway still impassable to vehicles', confidence: 0.9 },
    ],
  },
  {
    id: 'R-028', sourceType: 'OSINT', sourceName: 'La Guaira Community Channel', reliability: 0.48,
    language: 'ar', minutesBeforeT0: 26, location: 'La Guaira', coordEntity: 'ENT-LA-GUAIRA',
    raw: 'لا غوايرا تحتاج إلى ممر آمن للمأوى والمياه بعد الزلزال.',
    translated: 'La Guaira needs a safe corridor for shelter and water after the earthquake.',
    classification: 'SYNTHETIC // SIMULATED // OSINT // PUBLIC-CHANNEL', thread: 'evacuation-route',
    mentions: [
      { surface: 'La Guaira', type: 'location', canonicalId: 'ENT-LA-GUAIRA', context: ['displacement'] },
      { surface: 'مركز إيواء فارغاس', type: 'facility', canonicalId: 'ENT-SHELTER', context: ['shelter'] },
    ],
    claims: [{ subjectIdx: 0, predicate: 'contextNote', value: 'safe-shelter-water-corridor-needed', valueText: 'Safe shelter and water corridor needed', confidence: 0.7 }],
  },
  {
    id: 'R-029', sourceType: 'HUMINT', sourceName: 'Medical Volunteer Desk', reliability: 0.78,
    language: 'es', minutesBeforeT0: 65, location: 'Hospital Vargas', coordEntity: 'ENT-HOSP',
    raw: 'Hospital Vargas reporta pacientes de trauma y combustible bajo para el generador.',
    translated: 'Vargas Hospital reports trauma patients and low generator fuel.',
    classification: 'SYNTHETIC // SIMULATED // HUMINT // MEDICAL-VOLUNTEER', thread: 'hospital-fuel',
    mentions: [{ surface: 'Hospital Vargas', type: 'facility', canonicalId: 'ENT-HOSP', lang: 'es', context: ['trauma', 'fuel'] }],
    claims: [
      { subjectIdx: 0, predicate: 'fuelShortage', value: true, valueText: 'Generator fuel low', confidence: 0.76 },
      { subjectIdx: 0, predicate: 'contextNote', value: 'trauma-overload', valueText: 'Trauma patients remain on site', confidence: 0.78 },
    ],
  },
  {
    id: 'R-030', sourceType: 'GEOINT', sourceName: 'Shelter Imagery Node G-7', reliability: 0.9,
    language: 'en', minutesBeforeT0: 5, location: 'Polideportivo Jose Maria Vargas Shelter / Catia La Mar Water Point', coordEntity: 'ENT-SHELTER',
    raw: 'Updated imagery: Polideportivo shelter operating at capacity-only intake; civilian congestion building at Catia La Mar Water Point.',
    classification: 'SYNTHETIC // SIMULATED // GEOINT // IMAGERY', thread: 'evacuation-route',
    mentions: [
      { surface: 'Polideportivo Jose Maria Vargas Shelter', type: 'facility', canonicalId: 'ENT-SHELTER', context: ['shelter', 'capacity'] },
      { surface: 'Catia La Mar Water Point', type: 'location', canonicalId: 'ENT-WATER', context: ['congestion', 'water'] },
    ],
    claims: [
      { subjectIdx: 0, predicate: 'status', value: 'capacity-only', valueText: 'Capacity-only intake confirmed', confidence: 0.92 },
      { subjectIdx: 1, predicate: 'congestion', value: 'high', valueText: 'Civilian congestion building', confidence: 0.85 },
    ],
  },
];

export const SEED_REPORTS: Report[] = RAW_REPORTS.map(build);

/** A spare report bundle the analyst can inject live during the demo (offline ingestion). */
export const DEMO_INJECT_REPORTS: RawReport[] = [
  {
    id: 'R-101', sourceType: 'HUMINT', sourceName: 'Field Team Costa-1', reliability: 0.86,
    language: 'en', minutesBeforeT0: 1, location: 'Port of La Guaira / Highway junction', coordEntity: 'ENT-HIGHWAY',
    raw: 'New field report: Caracas-La Guaira Highway confirmed closed at the viaduct; hospital fuel convoy should use the verified light-vehicle port lane pending engineering clearance.',
    classification: 'SYNTHETIC // SIMULATED // HUMINT // FIELD-TEAM', thread: 'hospital-fuel',
    mentions: [
      { surface: 'Caracas-La Guaira Highway', type: 'route', canonicalId: 'ENT-HIGHWAY', context: ['closed'] },
      { surface: 'Tacagua Viaduct', type: 'infrastructure', canonicalId: 'ENT-VIADUCT', context: ['closed'] },
      { surface: 'Port of La Guaira Aid Staging Area', type: 'depot', canonicalId: 'ENT-PORT', context: ['access'] },
    ],
    claims: [
      { subjectIdx: 0, predicate: 'status', value: 'closed', valueText: 'Highway confirmed closed at viaduct', confidence: 0.9 },
      { subjectIdx: 2, predicate: 'secondaryRouteViable', value: true, valueText: 'Use verified light-vehicle port lane pending clearance', confidence: 0.88 },
    ],
  },
];

export function buildRawReport(raw: RawReport): Report {
  return build(raw);
}
export type { RawReport };
