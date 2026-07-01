import type { OperationMeta, ScenarioThread } from '@/types';

/**
 * Scenario clock. T0 is the scenario "now". All report timestamps are derived
 * as T0 - minutesBeforeT0 so the dataset is fully deterministic (no wall-clock
 * drift), which keeps the demo and the unit tests stable.
 */
export const T0_ISO = '2026-06-30T14:30:00.000Z';
export const T0_MS = Date.parse(T0_ISO);

export const OPERATION: OperationMeta = {
  name: 'Venezuela Earthquake Response Exercise',
  codeName: 'QUAKE RELIEF',
  region: 'La Guaira - Caracas coastal corridor',
  classification: 'SYNTHETIC // SIMULATED FIELD REPORTS // PUBLIC-CRISIS CONTEXT',
  t0Iso: T0_ISO,
};

export const THREADS: ScenarioThread[] = [
  {
    id: 'hospital-fuel',
    title: 'Hospital Access and Generator Fuel',
    description:
      'Hospital Dr. Jose Maria Vargas is overloaded after the earthquakes, generator fuel is running low, and the Caracas-La Guaira Highway is contested as the primary resupply route.',
    civilianSafetyBase: 98,
    riskPath: ['Hospital Dr. Jose Maria Vargas', 'Generator Fuel', 'Caracas-La Guaira Highway', 'Tacagua Viaduct', 'Aftershock Damage'],
  },
  {
    id: 'evacuation-route',
    title: 'Shelter Water and Sanitation Risk',
    description:
      'Displaced families are moving between a crowded shelter and an unsafe water point while the shelter admission status is contested.',
    civilianSafetyBase: 88,
    riskPath: ['La Guaira', 'Displaced Families', 'Polideportivo Shelter', 'Catia La Mar Water Point'],
  },
  {
    id: 'misinformation',
    title: 'Unverified "Hospital Evacuated" Claim',
    description:
      'A public post claims the hospital evacuation is complete. Acting on it without confirmation could strand trauma patients.',
    civilianSafetyBase: 74,
    riskPath: ['Hospital Dr. Jose Maria Vargas', 'Evacuation Status', 'Public Claim'],
  },
  {
    id: 'logistics-depot',
    title: 'Port Aid Staging Access',
    description:
      'The port staging area reports available supplies, but movement inland depends on verified light-vehicle access.',
    civilianSafetyBase: 70,
    riskPath: ['Port of La Guaira Aid Staging Area', 'Medical Supplies', 'Access Lane', 'Hospital Resupply'],
  },
  {
    id: 'comms-gap',
    title: 'USAR Team 4 - Communications Gap',
    description:
      'USAR Team 4 has gone silent near collapsed housing. The system distinguishes no new information from a confirmed incident.',
    civilianSafetyBase: 64,
    riskPath: ['USAR Team 4', 'Collapsed Housing', 'Last Contact'],
  },
];

export const THREAD_BY_ID: Record<string, ScenarioThread> = Object.fromEntries(
  THREADS.map((t) => [t.id, t]),
);

/** Human-readable labels for claim predicates (used across the UI). */
export const PREDICATE_LABELS: Record<string, string> = {
  status: 'Status',
  fuelHoursRemaining: 'Generator fuel remaining (hrs)',
  fuelShortage: 'Fuel shortage reported',
  fuelUrgent: 'Fuel resupply urgency',
  accessible: 'Road accessibility',
  suppliesAvailable: 'Supplies available',
  secondaryRouteViable: 'Secondary route viable',
  evacuationComplete: 'Evacuation complete',
  safety: 'Route / site safety',
  congestion: 'Civilian congestion',
  incidentReported: 'Incident report',
  lastContact: 'Communications status',
  sanitationRisk: 'Sanitation risk',
  contextNote: 'Context',
};

export function predicateLabel(p: string): string {
  return PREDICATE_LABELS[p] ?? p;
}
