/**
 * Researcher agent — Phase 0 skeleton (implemented in Phase 1).
 * Provisional discovery source (Fase A): web search + directories, one
 * source + date per datum. Overpass was unreachable from this VM and the
 * Google Places API is untested (needs a key) — this package only holds
 * the interface, it does not implement any search yet.
 */
import { stubAgent, type Agent } from '@weblead/agent-core';

export const researcherAgent: Agent = stubAgent('researcher', 'Researcher');

export type DiscoverySource = 'web-search' | 'directory' | 'places-api' | 'overpass' | 'official-register';

export type ResearcherInput = {
  province: string;
  municipality: string;
  sectors: string[];
  source: DiscoverySource;
};
