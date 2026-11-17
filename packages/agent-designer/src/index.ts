/**
 * Designer agent — Fase D (master prompt §2, instrucciones §5 + §11 Fase D).
 *
 * Builds the business website from the Researcher dossier and persists it.
 * Independent of the Auditor (separate code, separate criteria).
 *
 * Flow (validated step by step through the shared state machine):
 *   QUALIFIED -> DESIGNING -> PREVIEW_READY
 * The business must be QUALIFIED; anything else throws before any write.
 * The generated content is stored as JSON on WebsiteProject (brandConfig +
 * content), its assets as WebsiteAsset rows (logo SVG + stock photos, each
 * with licence + source), and any LLM consumption as a UsageRecord with
 * estimated and confirmed cost kept separate (confirmed null: Top Tools AI
 * returns tokens only, no price).
 *
 * The LLM never decides a fact: it may only draft the hero subtitle and the
 * "about" paragraph, and @weblead/website-generator validates each drafted
 * field against the dossier and the forbidden-claims list. A rejected draft
 * falls back to deterministic copy and the rejection is recorded.
 */
import { stubAgent, type Agent } from '@weblead/agent-core';
import type { PrismaClient } from '@weblead/database';
import { assertTransition, type BusinessState } from '@weblead/shared';
import {
  buildWebsiteContent,
  type GeneratedWebsiteContent,
  type GeneratorBusinessInput,
  type LlmDraft,
} from '@weblead/website-generator';
import { templateForSector } from '@weblead/website-templates';

export const designerAgent: Agent = stubAgent('designer', 'Web Designer/Developer');

export const DEMO_NOTICE =
  'Propuesta conceptual independiente, no oficial y pendiente de autorización de la empresa.';

export type DesignerLlmUsage = {
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  /** Estimated cost in euro cents (0 for the verified-free tier). */
  estimatedCostCents: number;
  /** Confirmed cost in euro cents; null when the provider reports no price. */
  confirmedCostCents: number | null;
};

export type DesignWebsiteOptions = {
  businessId: string;
  /** Template id; defaults to the sector template. */
  templateId?: string;
  /** LLM-drafted subtitle/about (validated by the generator, may be null). */
  llmDraft?: LlmDraft | null;
  /** Real LLM consumption for this generation, when a call happened. */
  llmUsage?: DesignerLlmUsage | null;
  /** Recorded activity signal text (Fase A): feeds the `verified` review/founded-year extraction. */
  activitySignal?: string | null;
};

/** Pure guard: only QUALIFIED, AUDIT_FAILED or PREVIEW_READY may enter DESIGNING.
 * QUALIFIED is the first design; AUDIT_FAILED is the re-design after a
 * failed audit (AUDIT_FAILED -> DESIGNING, master prompt §3); PREVIEW_READY
 * is rework before audit (PREVIEW_READY -> DESIGNING). */
export function assertQualifiedForDesign(state: string): void {
  if (state !== 'QUALIFIED' && state !== 'AUDIT_FAILED' && state !== 'PREVIEW_READY') {
    throw new Error(
      `Cannot design a website for a business in state ${state}: expected QUALIFIED, AUDIT_FAILED or PREVIEW_READY.`,
    );
  }
}

/** Validated state path for a design run (no jumps). */
export function designStatePath(from: BusinessState = 'QUALIFIED'): BusinessState[] {
  if (from !== 'QUALIFIED' && from !== 'AUDIT_FAILED' && from !== 'PREVIEW_READY') {
    throw new Error(`Cannot start a design run from state ${from}.`);
  }
  const path: BusinessState[] = [from];
  let current: BusinessState = from;
  for (const next of ['DESIGNING', 'PREVIEW_READY'] as const) {
    current = assertTransition(current, next);
    path.push(current);
  }
  return path;
}

async function ensureDesignerAgent(prisma: PrismaClient): Promise<string> {
  const agent = await prisma.agent.upsert({
    where: { name: 'designer' },
    update: {},
    create: {
      name: 'designer',
      kind: 'DESIGNER',
      description: 'Designer Agent (Fase D): genera la demo desde el expediente, sin inventar datos.',
    },
  });
  return agent.id;
}

export async function designWebsite(
  prisma: PrismaClient,
  opts: DesignWebsiteOptions,
): Promise<{
  projectId: string;
  businessId: string;
  slug: string;
  templateId: string;
  content: GeneratedWebsiteContent;
  statePath: BusinessState[];
}> {
  const business = await prisma.business.findUnique({ where: { id: opts.businessId } });
  if (!business) throw new Error(`Business ${opts.businessId} not found.`);
  assertQualifiedForDesign(business.state);
  const statePath = designStatePath(business.state as BusinessState);

  const sources = await prisma.businessSource.findMany({ where: { businessId: business.id } });
  const sourceNames = sources.map((s) => (s.rawData as { name?: string } | null)?.name ?? 'desconocida');
  const latestScore = await prisma.opportunityScore.findFirst({
    where: { businessId: business.id },
    orderBy: { computedAt: 'desc' },
  });

  const services = Array.isArray(business.services)
    ? (business.services as unknown[]).filter((s): s is string => typeof s === 'string')
    : [];
  const input: GeneratorBusinessInput = {
    name: business.name,
    sector: business.sector ?? '',
    address: business.address,
    phone: business.phone,
    email: business.email,
    municipality: business.municipality ?? 'Logroño',
    province: business.province ?? 'La Rioja',
    activity: business.activity ?? 'UNVERIFIED',
    activitySignal: opts.activitySignal ?? null,
    hasOwnWebsite: business.hasOwnWebsite,
    scoreTotal: latestScore?.total ?? 0,
    services,
    slug: business.slug,
    pilotId: business.pilotId,
    consultedAt: business.consultedAt ? business.consultedAt.toISOString().slice(0, 10) : '2026-11-16',
    sources: sourceNames,
  };
  // The sector template is the default when no explicit template is given.
  const templateId = opts.templateId ?? templateForSector(input.sector)?.id;
  const content = buildWebsiteContent(input, templateId, opts.llmDraft ?? null);

  const agentId = await ensureDesignerAgent(prisma);
  await prisma.business.update({ where: { id: business.id }, data: { state: 'DESIGNING' } });

  const project = await prisma.websiteProject.upsert({
    where: { slug: business.slug },
    update: {
      status: 'PREVIEW_READY',
      templateId: content.templateId,
      brandConfig: content as never,
      content: content as never,
    },
    create: {
      businessId: business.id,
      slug: business.slug,
      status: 'PREVIEW_READY',
      templateId: content.templateId,
      brandConfig: content as never,
      content: content as never,
    },
  });

  await prisma.websiteAsset.deleteMany({ where: { projectId: project.id } });
  for (const asset of content.assets) {
    await prisma.websiteAsset.create({
      data: { projectId: project.id, kind: asset.kind, url: asset.url, license: asset.license, source: asset.source },
    });
  }

  const execution = await prisma.agentExecution.create({
    data: {
      agentId,
      businessId: business.id,
      status: 'SUCCEEDED',
      input: { businessId: business.id, templateId: content.templateId, llmDraft: Boolean(opts.llmDraft) } as never,
      output: {
        slug: business.slug,
        templateId: content.templateId,
        llmUsed: content.llm.used,
        llmRejections: content.llm.rejections,
        state: 'PREVIEW_READY',
      } as never,
      startedAt: new Date(),
      finishedAt: new Date(),
    },
  });

  if (opts.llmUsage) {
    await prisma.usageRecord.create({
      data: {
        provider: opts.llmUsage.provider,
        model: opts.llmUsage.model,
        service: 'fase-d-generation',
        agentKind: 'designer',
        tokensPrompt: opts.llmUsage.promptTokens,
        tokensCompletion: opts.llmUsage.completionTokens,
        estimatedCostCents: opts.llmUsage.estimatedCostCents,
        confirmedCostCents: opts.llmUsage.confirmedCostCents,
        businessId: business.id,
        executionId: execution.id,
      },
    });
  }

  await prisma.business.update({ where: { id: business.id }, data: { state: 'PREVIEW_READY' } });

  return { projectId: project.id, businessId: business.id, slug: business.slug, templateId: content.templateId, content, statePath };
}
