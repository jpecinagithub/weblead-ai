/**
 * Structured business dossier — master prompt §1 + instrucciones §4 (Fase C).
 *
 * Every datum carries its source, reference URL, consultation date and
 * confidence. Unknown is `null`, never invented. Verification requires at
 * least 2 independent sources when possible; a single source is recorded
 * as such and caps confidence at "medium".
 */
import type { ActivityStatus, BusinessState, OpportunityScore } from '@weblead/shared';

export type Confidence = 'high' | 'medium' | 'low';

/** One datum with its provenance (§4: source / date / URL / confidence). */
export type FieldEvidence = {
  value: string | null;
  source: string | null;
  sourceUrl: string | null;
  observedAt: string | null;
  confidence: Confidence | null;
};

export type SourceRef = {
  name: string;
  url?: string | null;
  fetchedAt?: string | null;
};

/** The full structured dossier (master prompt §1 fields). */
export type BusinessDossier = {
  name: string;
  legalName: string | null;
  sector: string;
  subsector: string | null;
  address: string | null;
  municipality: string;
  province: string;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  websiteStatus: string;
  socialProfiles: string[];
  services: string[];
  targetAudience: string | null;
  activity: ActivityStatus;
  activityEvidence: string | null;
  activitySignalDate: string | null;
  opportunity: string | null;
  score: OpportunityScore;
  confidence: Confidence;
  /** Distinct independent sources (by name) behind this dossier. */
  sources: SourceRef[];
  sourcesVerified: number;
  twoSourcesVerified: boolean;
  consultedAt: string;
  /** Per-datum provenance: field name -> evidence (null value = unknown). */
  fields: Record<string, FieldEvidence>;
  /** Deterministic template summary (the LLM summary, if any, is separate). */
  summary: string;
  llmSummary: string | null;
  rejectionReason: string | null;
  qualified: boolean;
  state: BusinessState;
  slug: string;
  pilotId: number | null;
  notes: string[];
};

export function slugify(name: string, municipality: string): string {
  return `${name}-${municipality}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

/**
 * Counts independent sources: distinct source names (case-insensitive,
 * trimmed). Two rows from the same directory are ONE source, not two.
 */
export function countIndependentSources(sources: readonly SourceRef[]): number {
  return new Set(sources.map((s) => s.name.trim().toLowerCase()).filter(Boolean)).size;
}

/**
 * Anti-SSRF + URL validation (architecture §10). Any URL the Researcher
 * stores as a source must be http(s) and must not point at private IP
 * ranges, localhost or cloud metadata endpoints. Returns the URL when
 * valid, null otherwise — an invalid URL is dropped, never stored.
 */
export function validateExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  const host = url.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host === 'metadata.google.internal' ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host) ||
    host === '127.0.0.1' ||
    host === '[::1]' ||
    host === '::1'
  ) {
    return null;
  }
  return url.toString();
}
