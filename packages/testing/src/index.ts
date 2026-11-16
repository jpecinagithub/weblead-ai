/**
 * Testing helpers — shared fixtures for the repo's test suites.
 * Uses the MockProvider from @weblead/ai-engine (no network, no cost).
 */
import { MockProvider } from '@weblead/ai-engine';
import { PILOT_LEADS } from '@weblead/shared';

export const mockLlm = new MockProvider();

export function firstPilotLead() {
  const lead = PILOT_LEADS[0];
  if (!lead) throw new Error('Pilot seed is empty — regenerate it (scripts/generate-pilot-seed.mjs).');
  return lead;
}

export function pilotLeadCount(): number {
  return PILOT_LEADS.length;
}
