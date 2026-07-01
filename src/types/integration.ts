/**
 * Types for *imported* / external data sources, kept distinct from the synthetic
 * synthetic scenario types. Every normalized record carries a
 * SourceAttribution so the UI can always show provenance and never blur the line
 * between real imported data and synthetic demo data.
 */

import type { Claim } from '@/types';

export type NormalizedSourceType = 'GDELT_OSINT' | 'HUMINT' | 'GEOINT' | 'COT' | 'COMMS';

export type Provenance = 'real-import' | 'synthetic' | 'evaluation' | 'simulated';

export interface SourceAttribution {
  /** Short provenance label shown as a chip, e.g. "Imported GDELT 2.0 Translingual Snapshot". */
  label: string;
  provenance: Provenance;
  dataset: string;
  sourceSystem: string;
  reference?: string;
  capturedAt?: string;
  notes?: string;
}

export interface EntityRef {
  surfaceForm: string;
  type?: string;
  language?: string;
}

export interface NormalizedReport {
  id: string;
  sourceType: NormalizedSourceType;
  sourceSystem: string;
  sourceReference?: string;
  language?: string;
  timestamp: string;
  receivedAt: string;
  location?: string;
  coordinates?: { lat: number; lon: number };
  rawText?: string;
  translatedText?: string;
  extractedEntities: EntityRef[];
  extractedClaims: Claim[];
  reliabilityScore: number;
  freshnessScore: number;
  confidence?: number;
  tone?: number;
  integrityHash: string;
  syncStatus: 'SYNCED' | 'QUEUED' | 'LOCAL_ONLY';
  sourceAttribution: SourceAttribution;
}

export interface GdeltImportSummary {
  mentions: number;
  events: number;
  joinedToEvents: number;
  distinctSources: number;
  distinctLanguages: number;
  languageHistogram: Record<string, number>;
  topSources: { source: string; count: number }[];
  toneRange: { min: number; max: number; mean: number };
  capturedAt: string;
  sourceFiles: string[];
  notes: string[];
}
