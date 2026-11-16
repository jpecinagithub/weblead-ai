/**
 * Researcher persistence — Fase C (Prisma / Postgres).
 *
 * The API stops being in-memory for researched businesses: every dossier
 * lands in Business + BusinessSource + BusinessEvidence + ResearchReport +
 * OpportunityScore + AgentExecution. LLM usage, when a real call happened,
 * lands in UsageRecord with estimated and confirmed cost kept separate
 * (confirmed stays null: Top Tools AI returns tokens only, no price).
 */
import type { PrismaClient } from '@weblead/database';
import type { BusinessDossier } from './dossier.js';

export type LlmUsageRecord = {
  provider: string;
  model: string;
  service: string;
  promptTokens: number;
  completionTokens: number;
  /** Estimated cost in euro cents (0 for the verified-free tier). */
  estimatedCostCents: number;
  /** Confirmed cost in euro cents; null when the provider reports no price. */
  confirmedCostCents: number | null;
};

export async function ensureResearcherAgent(prisma: PrismaClient): Promise<string> {
  const agent = await prisma.agent.upsert({
    where: { name: 'researcher' },
    update: {},
    create: {
      name: 'researcher',
      kind: 'RESEARCHER',
      description: 'Research Agent (Fase C): dossier estructurado, scoring 0-100, umbral 70.',
    },
  });
  return agent.id;
}

/**
 * Persists a dossier. Re-running research on the same business replaces
 * its sources/evidence (current snapshot) and appends a new report +
 * score row (history is kept). Returns the ids for the API response.
 */
export async function saveDossier(
  prisma: PrismaClient,
  dossier: BusinessDossier,
  opts: { llmUsage?: LlmUsageRecord | null; executionInput?: Record<string, unknown> } = {},
): Promise<{ businessId: string; reportId: string; executionId: string }> {
  const agentId = await ensureResearcherAgent(prisma);

  const business = await prisma.business.upsert({
    where: { slug: dossier.slug },
    update: {
      name: dossier.name,
      legalName: dossier.legalName,
      sector: dossier.sector,
      subsector: dossier.subsector,
      address: dossier.address,
      municipality: dossier.municipality,
      province: dossier.province,
      postalCode: dossier.postalCode,
      phone: dossier.phone,
      email: dossier.email,
      websiteUrl: dossier.websiteUrl,
      hasOwnWebsite: dossier.websiteStatus !== 'none' && dossier.websiteStatus !== 'social-only',
      websiteStatus: dossier.websiteStatus,
      socialProfiles: dossier.socialProfiles,
      services: dossier.services,
      targetAudience: dossier.targetAudience,
      activity: dossier.activity,
      state: dossier.state,
      opportunity: dossier.opportunity,
      confidence: dossier.confidence,
      rejectionReason: dossier.rejectionReason,
      consultedAt: new Date(dossier.consultedAt),
      pilotId: dossier.pilotId,
    },
    create: {
      name: dossier.name,
      legalName: dossier.legalName,
      sector: dossier.sector,
      subsector: dossier.subsector,
      address: dossier.address,
      municipality: dossier.municipality,
      province: dossier.province,
      postalCode: dossier.postalCode,
      phone: dossier.phone,
      email: dossier.email,
      websiteUrl: dossier.websiteUrl,
      hasOwnWebsite: dossier.websiteStatus !== 'none' && dossier.websiteStatus !== 'social-only',
      websiteStatus: dossier.websiteStatus,
      socialProfiles: dossier.socialProfiles,
      services: dossier.services,
      targetAudience: dossier.targetAudience,
      activity: dossier.activity,
      state: dossier.state,
      opportunity: dossier.opportunity,
      confidence: dossier.confidence,
      rejectionReason: dossier.rejectionReason,
      consultedAt: new Date(dossier.consultedAt),
      pilotId: dossier.pilotId,
      slug: dossier.slug,
    },
  });

  await prisma.businessSource.deleteMany({ where: { businessId: business.id } });
  for (const source of dossier.sources) {
    await prisma.businessSource.create({
      data: {
        businessId: business.id,
        sourceType: 'SEARCH',
        url: source.url ?? null,
        fetchedAt: source.fetchedAt ? new Date(source.fetchedAt) : new Date(dossier.consultedAt),
        rawData: { name: source.name },
      },
    });
  }

  await prisma.businessEvidence.deleteMany({ where: { businessId: business.id } });
  for (const [fieldName, evidence] of Object.entries(dossier.fields)) {
    await prisma.businessEvidence.create({
      data: {
        businessId: business.id,
        field: fieldName,
        value: evidence.value,
        source: evidence.source ?? 'desconocida',
        sourceUrl: evidence.sourceUrl,
        observedAt: evidence.observedAt ? new Date(evidence.observedAt) : new Date(dossier.consultedAt),
      },
    });
  }

  const execution = await prisma.agentExecution.create({
    data: {
      agentId,
      businessId: business.id,
      status: 'SUCCEEDED',
      input: (opts.executionInput ?? { name: dossier.name, sector: dossier.sector }) as never,
      output: {
        activity: dossier.activity,
        scoreTotal: dossier.score.total,
        qualified: dossier.qualified,
        state: dossier.state,
        sourcesVerified: dossier.sourcesVerified,
        summary: dossier.summary,
      } as never,
      startedAt: new Date(),
      finishedAt: new Date(),
    },
  });

  const report = await prisma.researchReport.create({
    data: {
      businessId: business.id,
      executionId: execution.id,
      summary: dossier.summary,
      activity: dossier.activity,
      scoreTotal: dossier.score.total,
      scoreBreakdown: dossier.score as never,
      confidence: dossier.confidence,
      sourcesVerified: dossier.sourcesVerified,
      rejectionReason: dossier.rejectionReason,
      llmSummary: dossier.llmSummary,
    },
  });

  await prisma.opportunityScore.create({
    data: {
      businessId: business.id,
      noWebsite: dossier.score.noWebsite,
      activity: dossier.score.activity,
      digitalNeed: dossier.score.digitalNeed,
      contactability: dossier.score.contactability,
      economicPotential: dossier.score.economicPotential,
      total: dossier.score.total,
    },
  });

  if (opts.llmUsage) {
    await recordLlmUsage(prisma, business.id, execution.id, opts.llmUsage);
  }

  return { businessId: business.id, reportId: report.id, executionId: execution.id };
}

export async function recordLlmUsage(
  prisma: PrismaClient,
  businessId: string,
  executionId: string | null,
  usage: LlmUsageRecord,
): Promise<string> {
  const record = await prisma.usageRecord.create({
    data: {
      provider: usage.provider,
      model: usage.model,
      service: usage.service,
      agentKind: 'researcher',
      tokensPrompt: usage.promptTokens,
      tokensCompletion: usage.completionTokens,
      estimatedCostCents: usage.estimatedCostCents,
      confirmedCostCents: usage.confirmedCostCents,
      businessId,
      executionId,
    },
  });
  return record.id;
}
