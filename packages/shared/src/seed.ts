import pilotLeadsJson from './data/pilot-leads.json' with { type: 'json' };
import type { PilotLead } from './state-machine.js';

/**
 * Pilot seed — READ ONLY. The 10 Logroño leads with score >= 70 from the
 * Fase A pilot, generated from docs/feasibility-data.csv (see
 * scripts/generate-pilot-seed.mjs). No invented businesses: any other
 * business must come from a real Researcher run (Phase 1).
 */
export const PILOT_LEADS: readonly PilotLead[] = pilotLeadsJson as PilotLead[];

export function getPilotLead(id: number): PilotLead | undefined {
  return PILOT_LEADS.find((lead) => lead.id === id);
}
