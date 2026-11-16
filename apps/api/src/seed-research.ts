/**
 * Seed: the 10 pilot leads (Fase A, score >= 70) into Postgres, researched
 * through the real Researcher pipeline (not inserted as QUALIFIED by hand).
 *
 * Each lead goes DISCOVERED -> RESEARCHING -> RESEARCHED -> QUALIFIED
 * (all 10 score >= 70 with CONFIRMED/PROBABLE activity) with a full
 * dossier persisted: Business + BusinessSource + BusinessEvidence +
 * ResearchReport + OpportunityScore + AgentExecution.
 *
 * Idempotent: re-running it re-researches the same 10 leads (upsert by
 * slug, new report + score rows appended, sources/evidence replaced).
 *
 * Usage: pnpm --filter @weblead/api seed:research
 */
import dotenv from 'dotenv';
import { prisma } from '@weblead/database';
import { pilotLeadToEvidence, researchBusiness, saveDossier } from '@weblead/agent-researcher';
import { PILOT_LEADS } from '@weblead/shared';

dotenv.config({ path: new URL('../../../.env', import.meta.url) });

async function main(): Promise<void> {
  console.log(`Seeding ${PILOT_LEADS.length} pilot leads through the Researcher...`);
  for (const lead of PILOT_LEADS) {
    const { dossier, statePath } = researchBusiness(pilotLeadToEvidence(lead));
    const ids = await saveDossier(prisma, dossier, {
      executionInput: { name: lead.name, sector: lead.sector, via: 'seed-pilot' },
    });
    console.log(
      `  pilot ${lead.id} ${lead.name}: score ${dossier.score.total}/100 ` +
        `(piloto ${lead.score.total}) -> ${dossier.state} [${statePath.join(' > ')}] ` +
        `business=${ids.businessId.slice(0, 8)} report=${ids.reportId.slice(0, 8)}`,
    );
  }
  console.log('Seed complete.');
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
