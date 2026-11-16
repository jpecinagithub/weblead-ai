/**
 * Researcher agent — Fase C (implemented; was a Phase 0 stub).
 *
 * Deterministic core: activity classification, opportunity scoring
 * (0-100, threshold 70), structured dossier with a source per datum,
 * state path DISCOVERED -> RESEARCHING -> RESEARCHED -> QUALIFIED |
 * REJECTED, Prisma persistence. The LLM never decides a fact: it only
 * ever writes a summary, recorded separately in cost-control.
 *
 * `researcherAgent.run` researches a pilot lead by its numeric id from
 * the Fase A seed (no invented data). Any other business must come
 * through POST /api/research/run with explicit structured evidence.
 */
import { getPilotLead } from '@weblead/shared';
import { pilotLeadToEvidence, researchBusiness } from './researcher.js';
import { stubAgent, type Agent } from '@weblead/agent-core';

export const researcherAgent: Agent = {
  ...stubAgent('researcher', 'Researcher'),
  async run(ctx) {
    const lead = getPilotLead(Number(ctx.businessId));
    if (!lead) {
      return {
        status: 'failed',
        summary:
          `No evidence for business ${ctx.businessId}: only the 10 pilot leads can be ` +
          `researched from the seed. Other businesses need explicit evidence via ` +
          `POST /api/research/run — the Researcher never invents data.`,
      };
    }
    const { dossier } = researchBusiness(pilotLeadToEvidence(lead));
    return {
      status: 'succeeded',
      summary: dossier.summary,
      data: { scoreTotal: dossier.score.total, qualified: dossier.qualified, state: dossier.state },
    };
  },
};

export * from './activity.js';
export * from './dossier.js';
export * from './persistence.js';
export * from './researcher.js';
export * from './scoring.js';

export type DiscoverySource = 'web-search' | 'directory' | 'places-api' | 'overpass' | 'official-register';

export type ResearcherInput = {
  province: string;
  municipality: string;
  sectors: string[];
  source: DiscoverySource;
};
