/**
 * WebLead AI API — Fase C (Researcher).
 * Node + Express + TypeScript, port 4000 (API_PORT).
 *
 * Fase C change: researched businesses are persisted in Postgres via
 * Prisma. GET /api/businesses and /api/businesses/:id read the DB
 * (pilot seed only as a fallback while a business has not been
 * researched yet); POST /api/research/run runs the Researcher and
 * persists the dossier; GET /api/businesses/:id/report returns the
 * full dossier. The in-memory `states` map from Fase 0 remains only
 * as a fallback for un-researched pilot leads.
 */
import dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';
import { transitionBusiness } from '@weblead/agent-core';
import {
  getProviderHealth,
  isProviderAvailable,
  PROVIDERS,
} from '@weblead/ai-engine';
import {
  createSpendGate,
  DEFAULT_EFFECTIVE_SPEND_LIMIT_EUR_CENTS,
  HISTORICAL_MEASUREMENTS,
  PrismaUsageStore,
  usageStore,
  type UsageEntry,
} from '@weblead/cost-control';
import { prisma } from '@weblead/database';
import {
  pilotLeadToEvidence,
  researchBusiness,
  saveDossier,
  type ResearcherEvidenceInput,
} from '@weblead/agent-researcher';
import { designWebsite, type DesignerLlmUsage } from '@weblead/agent-designer';
import {
  approveDraft,
  checkLegalBasis,
  classifyReply,
  prepareSales,
  suggestedReply,
  type LlmUsageInput,
  type ProposalModality,
} from '@weblead/agent-sales';
import {
  buildPipelineRow,
  dueReminders,
  pipelineStats,
  suppressContact,
  type PipelineRow,
} from '@weblead/agent-crm';
import { getGmailStatus } from '@weblead/integrations';
import {
  auditWebsiteContent,
  mergePlaywrightFindings,
  PlaywrightUnavailableError,
  runPlaywrightAudit,
  saveAudit,
  type AuditDossierFacts,
} from '@weblead/agent-auditor';
import type { GeneratedWebsiteContent, LlmDraft } from '@weblead/website-generator';
import {
  BUSINESS_STATES,
  BUSINESS_TRANSITIONS,
  getPilotLead,
  IllegalTransitionError,
  isBusinessState,
  PILOT_LEADS,
  type BusinessState,
} from '@weblead/shared';

// .env lives at the repo root (two levels above apps/api/src).
dotenv.config({ path: new URL('../../../.env', import.meta.url) });

const PORT = Number(process.env.API_PORT ?? 4000);

// Effective authorised spend (EUR cents). 0 = paid LLM calls are blocked.
const EFFECTIVE_SPEND_LIMIT_EUR_CENTS = Number(
  process.env.EFFECTIVE_SPEND_LIMIT_EUR ?? DEFAULT_EFFECTIVE_SPEND_LIMIT_EUR_CENTS,
);
export const spendGate = createSpendGate(EFFECTIVE_SPEND_LIMIT_EUR_CENTS);

// ---------------------------------------------------------------------------
// Fase F, Bloque 1 — cost persistence: UsageRecord (Postgres) is the source
// of truth; usageStore (in-memory) is the mirror/fallback. The historical
// Fase A–E measurements (14 calls, 3.375 tokens — see
// packages/cost-control/src/history.ts for the reconciliation of the
// 13-call / 3.149-token in-memory seeds vs the 14-call / 3.375-token
// validation total) are seeded into Postgres at startup, idempotently.
// ---------------------------------------------------------------------------

/** Prisma-backed cost store, adapted from prisma.usageRecord. */
export const persistentUsageStore = new PrismaUsageStore(
  {
    create: (data) => prisma.usageRecord.create({ data }),
    findMany: () => prisma.usageRecord.findMany({ orderBy: { createdAt: 'asc' } }),
  },
  usageStore,
);

/**
 * Records runtime consumption in Postgres (best-effort) and mirrors it
 * to memory. Never throws (the store logs a DB failure and keeps the
 * entry in memory), so cost recording can never break the LLM call
 * that produced the consumption.
 */
async function recordUsage(entry: Omit<UsageEntry, 'recordedAt'> & { recordedAt?: string }): Promise<void> {
  await persistentUsageStore.record(entry);
}

/**
 * Seeds the historical measurements into Postgres (idempotent) and
 * loads the in-memory mirror from the DB, so the fallback summary
 * matches the DB exactly. If the DB is unavailable at startup, seeds
 * the mirror directly from the historical measurements (pilot-id keys)
 * and keeps serving from memory; a later restart seeds the DB. Never
 * blocks server start.
 */
async function initCostPersistence(): Promise<void> {
  try {
    const { inserted, skipped } = await persistentUsageStore.seedHistorical(
      HISTORICAL_MEASUREMENTS,
      async ({ pilotId, slug }) => {
        if (pilotId !== undefined) {
          const b = await prisma.business.findUnique({ where: { pilotId } });
          return b?.id ?? null;
        }
        if (slug) {
          const b = await prisma.business.findUnique({ where: { slug } });
          return b?.id ?? null;
        }
        return null;
      },
    );
    const mirrored = await persistentUsageStore.loadMirrorFromDb();
    console.log(
      `[costs] UsageRecord seeded: ${inserted} inserted, ${skipped} already present; ` +
        `mirror loaded with ${mirrored} rows.`,
    );
  } catch (err) {
    console.warn(
      `[costs] Postgres cost seeding failed (${(err as Error).message}); ` +
        'serving costs from the in-memory historical seed.',
    );
    usageStore.clear();
    for (const m of HISTORICAL_MEASUREMENTS) {
      usageStore.record({
        provider: m.provider,
        service: `historic:${m.service}`,
        model: m.model,
        requests: m.requests,
        promptTokens: m.promptTokens,
        completionTokens: m.completionTokens,
        imagesGenerated: 0,
        estimatedCostCents: m.estimatedCostCents,
        confirmedCostCents: m.confirmedCostCents,
        agentKind: m.agentKind,
        ...(m.businessPilotId !== undefined ? { businessId: String(m.businessPilotId) } : {}),
        ...(m.businessSlug ? { businessId: m.businessSlug } : {}),
        recordedAt: m.recordedAt,
      });
    }
  }
}

// In-memory orchestrator state, seeded DISCOVERED for every pilot lead.
// Only a fallback for leads not yet researched (not yet in the DB).
const states = new Map<number, BusinessState>(PILOT_LEADS.map((lead) => [lead.id, 'DISCOVERED']));

const app = express();
app.use(express.json());

/** Cap on businesses per research call (bounded_bulk_pull: no runaway runs). */
export const MAX_BUSINESSES_PER_RESEARCH_CALL = 10;

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'weblead-api', version: '0.1.0', phase: 'E-commercial' });
});

/**
 * GET /api/providers — the provider registry (§3) with honest status and
 * runtime health (Fase B §4): only top-tools-ai is operational; xai and
 * coarena are down (credential invalid / revoked, re-verified 2026-11-16);
 * groq is pending a credential and openrouter has no keys. No key material
 * is ever returned here.
 */
app.get('/api/providers', (_req: Request, res: Response) => {
  res.json(
    Object.values(PROVIDERS).map((info) => ({
      name: info.name,
      status: info.status,
      available: isProviderAvailable(info.name),
      baseUrl: info.baseUrl,
      defaultModel: info.defaultModel,
      freeTier: info.freeTier,
      note: info.note,
      health: getProviderHealth(info.name),
    })),
  );
});

type BusinessRow = Awaited<ReturnType<typeof prisma.business.findMany>>[number] & {
  scores?: { total: number }[];
};

function serializeBusiness(row: BusinessRow) {
  return {
    id: row.pilotId ?? row.id,
    dbId: row.id,
    name: row.name,
    legalName: row.legalName,
    sector: row.sector,
    subsector: row.subsector,
    address: row.address,
    municipality: row.municipality,
    province: row.province,
    postalCode: row.postalCode,
    phone: row.phone,
    email: row.email,
    hasOwnWebsite: row.hasOwnWebsite,
    websiteUrl: row.websiteUrl,
    websiteStatus: row.websiteStatus,
    activity: row.activity,
    state: row.state,
    opportunity: row.opportunity,
    confidence: row.confidence,
    rejectionReason: row.rejectionReason,
    scoreTotal: row.scores?.[0]?.total ?? null,
    consultedAt: row.consultedAt,
  };
}

/** GET /api/businesses — researched businesses from Postgres. */
app.get('/api/businesses', async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.business.findMany({
      orderBy: { name: 'asc' },
      include: { scores: { orderBy: { computedAt: 'desc' }, take: 1 } },
    });
    if (rows.length === 0) {
      // Nothing researched yet: the read-only pilot seed, states DISCOVERED.
      res.json(PILOT_LEADS.map((lead) => ({ ...lead, state: states.get(lead.id) ?? lead.state })));
      return;
    }
    res.json(rows.map((row) => serializeBusiness(row as BusinessRow)));
  } catch (err) {
    res.status(503).json({ error: `Database unavailable: ${(err as Error).message}` });
  }
});

async function findBusinessByIdParam(idParam: string) {
  const numeric = Number(idParam);
  if (Number.isInteger(numeric)) {
    const byPilot = await prisma.business.findUnique({ where: { pilotId: numeric } });
    if (byPilot) return byPilot;
  }
  return prisma.business.findUnique({ where: { id: idParam } });
}

app.get('/api/businesses/:id', async (req: Request, res: Response) => {
  try {
    const row = await findBusinessByIdParam(req.params.id);
    if (row) {
      const latest = await prisma.opportunityScore.findFirst({
        where: { businessId: row.id },
        orderBy: { computedAt: 'desc' },
      });
      res.json(serializeBusiness({ ...row, scores: latest ? [{ total: latest.total }] : [] }));
      return;
    }
  } catch {
    // Fall through to the pilot seed below.
  }
  const lead = getPilotLead(Number(req.params.id));
  if (!lead) {
    res.status(404).json({ error: `Business ${req.params.id} not found.` });
    return;
  }
  res.json({ ...lead, state: states.get(lead.id) ?? lead.state });
});

/**
 * GET /api/businesses/:id/report — the full structured dossier
 * (master prompt §1): business + sources + per-datum evidence + latest
 * research report + latest opportunity score. Unknown fields are null.
 */
app.get('/api/businesses/:id/report', async (req: Request, res: Response) => {
  const row = await findBusinessByIdParam(req.params.id).catch(() => null);
  if (!row) {
    res.status(404).json({
      error: `Business ${req.params.id} has no research report yet (not researched in Postgres).`,
    });
    return;
  }
  const [sources, evidence, reports, scores] = await Promise.all([
    prisma.businessSource.findMany({ where: { businessId: row.id } }),
    prisma.businessEvidence.findMany({ where: { businessId: row.id } }),
    prisma.researchReport.findMany({
      where: { businessId: row.id },
      orderBy: { createdAt: 'desc' },
      take: 1,
    }),
    prisma.opportunityScore.findMany({
      where: { businessId: row.id },
      orderBy: { computedAt: 'desc' },
      take: 1,
    }),
  ]);
  const report = reports[0] ?? null;
  res.json({
    business: serializeBusiness({ ...row, scores: scores.map((s) => ({ total: s.total })) }),
    report: report
      ? {
          id: report.id,
          summary: report.summary,
          llmSummary: report.llmSummary,
          activity: report.activity,
          scoreTotal: report.scoreTotal,
          scoreBreakdown: report.scoreBreakdown,
          confidence: report.confidence,
          sourcesVerified: report.sourcesVerified,
          rejectionReason: report.rejectionReason,
          createdAt: report.createdAt,
        }
      : null,
    sources: sources.map((s) => ({
      type: s.sourceType,
      url: s.url,
      fetchedAt: s.fetchedAt,
      name: (s.rawData as { name?: string } | null)?.name ?? null,
    })),
    evidence: evidence.map((e) => ({
      field: e.field,
      value: e.value,
      source: e.source,
      sourceUrl: e.sourceUrl,
      observedAt: e.observedAt,
    })),
    score: scores[0] ?? null,
  });
});

/** The pipeline itself: states + allowed transitions (dashboard renders this). */
app.get('/api/pipeline', (_req: Request, res: Response) => {
  res.json({ states: BUSINESS_STATES, transitions: BUSINESS_TRANSITIONS });
});

/**
 * GET /api/costs/summary — the 8 cost indicators (§8): total, per agent,
 * per business, per website, per opportunity, per provider, free quotas,
 * alerts. Estimated and confirmed costs are always separate. Read from
 * Postgres (Fase F); falls back to the in-memory mirror when the DB is
 * unavailable (handled inside the store).
 */
app.get('/api/costs/summary', async (_req: Request, res: Response) => {
  res.json(await persistentUsageStore.summary(EFFECTIVE_SPEND_LIMIT_EUR_CENTS));
});

export type ResearchRequestItem = {
  name: string;
  sector: string;
  city?: string;
  /** Structured evidence (Fase A CSV row, directory data, ...). */
  evidence?: Partial<ResearcherEvidenceInput>;
};

function emptyEvidence(name: string, sector: string, city?: string): ResearcherEvidenceInput {
  return {
    name,
    sector,
    municipality: city ?? 'Logroño',
    province: 'La Rioja',
    websiteStatus: 'unknown',
    activitySignals: [],
    contact: { hasPhone: false, hasEmailOrFormOrWhatsapp: false, hasBookingOnly: false },
    economic: { employeesKnown: false, reviewCount: null, reviewsExist: false },
    sources: [],
    consultedAt: '2026-11-16',
  };
}

/**
 * POST /api/research/run { businesses: [{ name, sector, city?, evidence? }] }
 * Investigates up to MAX_BUSINESSES_PER_RESEARCH_CALL businesses per call
 * (default 1 item when the body is a single object). A pilot lead matched
 * by name (case-insensitive) is researched from the Fase A seed when no
 * evidence is supplied; any other business needs explicit evidence, and
 * without it the dossier is UNVERIFIED with nulls and is REJECTED for
 * insufficient evidence — the Researcher never invents data.
 */
app.post('/api/research/run', async (req: Request, res: Response) => {
  const body = req.body as { businesses?: ResearchRequestItem[] } | ResearchRequestItem;
  const items: ResearchRequestItem[] = Array.isArray((body as { businesses?: unknown }).businesses)
    ? (body as { businesses: ResearchRequestItem[] }).businesses
    : [body as ResearchRequestItem];
  if (items.length === 0 || items.length > MAX_BUSINESSES_PER_RESEARCH_CALL) {
    res.status(400).json({
      error: `Send between 1 and ${MAX_BUSINESSES_PER_RESEARCH_CALL} businesses per call.`,
    });
    return;
  }
  const results = [];
  for (const item of items) {
    if (!item?.name || !item?.sector) {
      res.status(400).json({ error: 'Each business needs at least { name, sector }.' });
      return;
    }
    const pilotMatch =
      !item.evidence &&
      PILOT_LEADS.find((lead) => lead.name.toLowerCase() === item.name.trim().toLowerCase());
    const evidence: ResearcherEvidenceInput = pilotMatch
      ? pilotLeadToEvidence(pilotMatch)
      : item.evidence
        ? { ...emptyEvidence(item.name, item.sector, item.city), ...item.evidence, name: item.name, sector: item.sector }
        : emptyEvidence(item.name, item.sector, item.city);
    const { dossier, statePath } = researchBusiness(evidence);
    try {
      const ids = await saveDossier(prisma, dossier, {
        executionInput: { name: item.name, sector: item.sector, via: pilotMatch ? 'pilot-seed' : 'api-evidence' },
      });
      results.push({ ...ids, name: dossier.name, slug: dossier.slug, pilotId: dossier.pilotId, scoreTotal: dossier.score.total, qualified: dossier.qualified, state: dossier.state, statePath, rejectionReason: dossier.rejectionReason });
    } catch (err) {
      res.status(503).json({ error: `Database unavailable: ${(err as Error).message}` });
      return;
    }
  }
  res.status(201).json({ researched: results });
});

/**
 * POST /api/businesses/:id/state { "to": "<STATE>" }
 * Validates through the shared state machine. An illegal jump
 * (e.g. DISCOVERED -> APPROVED) is rejected with 400 + IllegalTransitionError.
 * When the business exists in Postgres, the new state is persisted there.
 */
app.post('/api/businesses/:id/state', async (req: Request, res: Response) => {
  const to = req.body?.to as unknown;
  if (!isBusinessState(to)) {
    res.status(400).json({ error: `"to" must be one of the 18 orchestrator states.`, states: BUSINESS_STATES });
    return;
  }
  const row = await findBusinessByIdParam(req.params.id).catch(() => null);
  if (row) {
    const from = row.state as BusinessState;
    try {
      const next = transitionBusiness({ businessId: row.id, from, to });
      await prisma.business.update({ where: { id: row.id }, data: { state: next } });
      res.json(serializeBusiness({ ...row, state: next, scores: [] }));
    } catch (err) {
      if (err instanceof IllegalTransitionError) {
        res.status(400).json({ error: err.message, from: err.from, to: err.to });
        return;
      }
      throw err;
    }
    return;
  }
  const lead = getPilotLead(Number(req.params.id));
  if (!lead) {
    res.status(404).json({ error: `Business ${req.params.id} not found.` });
    return;
  }
  const from = states.get(lead.id) ?? 'DISCOVERED';
  try {
    const next = transitionBusiness({ businessId: String(lead.id), from, to });
    states.set(lead.id, next);
    res.json({ ...lead, state: next });
  } catch (err) {
    if (err instanceof IllegalTransitionError) {
      res.status(400).json({ error: err.message, from: err.from, to: err.to });
      return;
    }
    throw err;
  }
});

// ---------------------------------------------------------------------------
// Fase D — Designer + Auditor
// ---------------------------------------------------------------------------

async function findProjectByIdParam(idParam: string) {
  const bySlug = await prisma.websiteProject.findUnique({ where: { slug: idParam } }).catch(() => null);
  if (bySlug) return bySlug;
  return prisma.websiteProject.findUnique({ where: { id: idParam } }).catch(() => null);
}

function serializeProject(project: {
  id: string;
  businessId: string;
  slug: string;
  status: string;
  templateId: string | null;
  content: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: project.id,
    businessId: project.businessId,
    slug: project.slug,
    status: project.status,
    templateId: project.templateId,
    demoUrl: `/demos/${project.slug}`,
    content: project.content,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

/**
 * POST /api/websites/generate { businessId, templateId?, llmDraft?, llmUsage?, activitySignal? }
 * Runs the Designer: QUALIFIED -> DESIGNING -> PREVIEW_READY (validated).
 * businessId accepts a Postgres uuid or a pilot id (6 = Santiago Ferrer).
 */
app.post('/api/websites/generate', async (req: Request, res: Response) => {
  const body = req.body as {
    businessId?: string | number;
    templateId?: string;
    llmDraft?: LlmDraft | null;
    llmUsage?: DesignerLlmUsage | null;
    activitySignal?: string | null;
  };
  if (body.businessId === undefined || body.businessId === null || body.businessId === '') {
    res.status(400).json({ error: 'businessId is required (uuid or pilot id).' });
    return;
  }
  try {
    const business = await findBusinessByIdParam(String(body.businessId));
    if (!business) {
      res.status(404).json({ error: `Business ${body.businessId} not found.` });
      return;
    }
    const result = await designWebsite(prisma, {
      businessId: business.id,
      templateId: body.templateId,
      llmDraft: body.llmDraft ?? null,
      llmUsage: body.llmUsage ?? null,
      activitySignal: body.activitySignal ?? getPilotLead(business.pilotId ?? -1)?.activitySignal ?? null,
    });
    if (body.llmUsage) {
      // designWebsite already wrote this call as a UsageRecord (its
      // internal `if (opts.llmUsage)` write); mirror it to the
      // in-memory fallback ONLY. A second DB write here would count
      // the same LLM call twice in the summary.
      usageStore.record({
        provider: 'top-tools-ai',
        service: 'fase-d-generation',
        model: body.llmUsage.model,
        requests: 1,
        promptTokens: body.llmUsage.promptTokens,
        completionTokens: body.llmUsage.completionTokens,
        imagesGenerated: 0,
        estimatedCostCents: body.llmUsage.estimatedCostCents,
        confirmedCostCents: body.llmUsage.confirmedCostCents,
        agentKind: 'designer',
        businessId: business.id,
        websiteProjectId: result.projectId,
      });
    }
    const project = await prisma.websiteProject.findUnique({ where: { id: result.projectId } });
    res.status(201).json({ ...serializeProject(project!), statePath: result.statePath });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('expected QUALIFIED')) {
      res.status(409).json({ error: message });
      return;
    }
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
      return;
    }
    res.status(503).json({ error: `Database unavailable: ${message}` });
  }
});

/** GET /api/websites/:id — project by id or slug, with its content. */
app.get('/api/websites/:id', async (req: Request, res: Response) => {
  try {
    const project = await findProjectByIdParam(req.params.id);
    if (!project) {
      res.status(404).json({ error: `Website ${req.params.id} not found.` });
      return;
    }
    res.json(serializeProject(project));
  } catch (err) {
    res.status(503).json({ error: `Database unavailable: ${(err as Error).message}` });
  }
});

/** GET /api/websites — all generated projects (newest first). */
app.get('/api/websites', async (_req: Request, res: Response) => {
  try {
    const projects = await prisma.websiteProject.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(projects.map((p) => serializeProject(p)));
  } catch (err) {
    res.status(503).json({ error: `Database unavailable: ${(err as Error).message}` });
  }
});

/**
 * POST /api/audit/run { projectId, demoUrl? }
 * Runs the Auditor: PREVIEW_READY -> AUDITING -> APPROVED | AUDIT_FAILED
 * (validated). Content audit always runs; when demoUrl is given, the
 * Playwright runner also runs against the live demo and its findings are
 * merged. Screenshots land in docs/phase-f/screenshots/ (Fase F; las de la
 * Fase D quedan en docs/phase-d/screenshots/).
 */
app.post('/api/audit/run', async (req: Request, res: Response) => {
  const body = req.body as { projectId?: string; demoUrl?: string };
  if (!body.projectId) {
    res.status(400).json({ error: 'projectId is required (project id or slug).' });
    return;
  }
  try {
    const project = await findProjectByIdParam(body.projectId);
    if (!project) {
      res.status(404).json({ error: `Website ${body.projectId} not found.` });
      return;
    }
    const business = await prisma.business.findUnique({ where: { id: project.businessId } });
    if (!business) {
      res.status(404).json({ error: `Business for website ${body.projectId} not found.` });
      return;
    }
    if (business.state !== 'PREVIEW_READY') {
      res.status(409).json({
        error: `Cannot audit a business in state ${business.state}: expected PREVIEW_READY.`,
      });
      return;
    }
    const content = project.content as unknown as GeneratedWebsiteContent;
    if (!content || typeof content !== 'object' || !('businessName' in content)) {
      res.status(409).json({ error: `Website ${body.projectId} has no generated content to audit.` });
      return;
    }
    // PREVIEW_READY -> AUDITING (validated, persisted).
    transitionBusiness({ businessId: business.id, from: business.state as BusinessState, to: 'AUDITING' });
    await prisma.business.update({ where: { id: business.id }, data: { state: 'AUDITING' } });

    const dossier: AuditDossierFacts = {
      name: business.name,
      address: business.address,
      phone: business.phone,
      email: business.email,
      services: Array.isArray(business.services)
        ? (business.services as unknown[]).filter((s): s is string => typeof s === 'string')
        : [],
      activity: business.activity ?? 'UNVERIFIED',
      slug: business.slug,
    };
    let report = auditWebsiteContent(content, dossier);
    let runner: 'playwright' | 'content-only' | 'playwright-unavailable' = 'content-only';
    let screenshots: { desktop: string; mobile: string } | null = null;
    if (body.demoUrl) {
      const screenshotsDir = new URL(
        '../../../docs/phase-f/screenshots',
        import.meta.url,
      ).pathname;
      try {
        const pw = await runPlaywrightAudit(body.demoUrl, screenshotsDir, business.slug);
        report = mergePlaywrightFindings(report, pw.findings);
        runner = 'playwright';
        screenshots = {
          desktop: `docs/phase-f/screenshots/${business.slug}-desktop.png`,
          mobile: `docs/phase-f/screenshots/${business.slug}-mobile.png`,
        };
      } catch (err) {
        if (err instanceof PlaywrightUnavailableError) {
          runner = 'playwright-unavailable';
          report = mergePlaywrightFindings(report, [
            {
              severity: 'RECOMMENDATION',
              category: 'TECHNICAL',
              message: `Playwright pendiente (no se pudo ejecutar en esta VM): ${err.message}`,
              url: body.demoUrl,
            },
          ]);
        } else {
          throw err;
        }
      }
    }

    const auditId = await saveAudit(prisma, {
      projectId: project.id,
      report,
      runner,
      demoUrl: body.demoUrl ?? null,
      screenshots,
    });
    const nextState = report.result === 'PASSED' ? ('APPROVED' as const) : ('AUDIT_FAILED' as const);
    transitionBusiness({ businessId: business.id, from: 'AUDITING', to: nextState });
    await prisma.business.update({ where: { id: business.id }, data: { state: nextState } });
    await prisma.websiteProject.update({
      where: { id: project.id },
      data: { status: report.result === 'PASSED' ? 'APPROVED' : 'PREVIEW_READY' },
    });
    res.status(201).json({
      auditId,
      projectId: project.id,
      slug: business.slug,
      businessState: nextState,
      runner,
      scores: report.scores,
      findings: report.findings,
      result: report.result,
      summary: report.summary,
      screenshots,
    });
  } catch (err) {
    if (err instanceof IllegalTransitionError) {
      res.status(400).json({ error: err.message, from: err.from, to: err.to });
      return;
    }
    res.status(503).json({ error: `Audit failed: ${(err as Error).message}` });
  }
});

/** GET /api/websites/:id/audit — latest audit with findings for a project. */
app.get('/api/websites/:id/audit', async (req: Request, res: Response) => {
  try {
    const project = await findProjectByIdParam(req.params.id);
    if (!project) {
      res.status(404).json({ error: `Website ${req.params.id} not found.` });
      return;
    }
    const audit = await prisma.audit.findFirst({
      where: { projectId: project.id },
      orderBy: { createdAt: 'desc' },
      include: { findings: true },
    });
    if (!audit) {
      res.status(404).json({ error: `Website ${req.params.id} has no audit yet.` });
      return;
    }
    res.json(audit);
  } catch (err) {
    res.status(503).json({ error: `Database unavailable: ${(err as Error).message}` });
  }
});

// ---------------------------------------------------------------------------
// Fase E — Comercial: Sales + CRM (borradores locales, sin envío)
// ---------------------------------------------------------------------------

/**
 * POST /api/sales/prepare { businessId, modality?, addonKeys?, llmBody?, llmUsage? }
 * APPROVED -> SALES_PENDING when the LSSI gate allows a local draft;
 * when it blocks, returns the documented block (internal proposal only,
 * NO draft) and the business stays APPROVED. Never sends anything.
 * businessId accepts a Postgres uuid or a pilot id.
 */
app.post('/api/sales/prepare', async (req: Request, res: Response) => {
  const body = req.body as {
    businessId?: string | number;
    modality?: ProposalModality;
    addonKeys?: string[];
    llmBody?: string | null;
    llmUsage?: LlmUsageInput | null;
  };
  if (body.businessId === undefined || body.businessId === null || body.businessId === '') {
    res.status(400).json({ error: 'businessId is required (uuid or pilot id).' });
    return;
  }
  try {
    const business = await findBusinessByIdParam(String(body.businessId));
    if (!business) {
      res.status(404).json({ error: `Business ${body.businessId} not found.` });
      return;
    }
    const result = await prepareSales(prisma, {
      businessId: business.id,
      modality: body.modality,
      addonKeys: body.addonKeys,
      llmBody: body.llmBody ?? null,
      llmUsage: body.llmUsage ?? null,
    });
    if (body.llmUsage) {
      // prepareSales writes the UsageRecord itself when the gate allows
      // the draft; when it blocks, it writes nothing — but the LLM call
      // still happened, so record it here (DB + memory mirror). Either
      // way the call is stored exactly once: never mirror AND write.
      const entry = {
        provider: 'top-tools-ai' as const,
        service: 'fase-e-sales-draft',
        model: body.llmUsage.model,
        requests: 1,
        promptTokens: body.llmUsage.promptTokens,
        completionTokens: body.llmUsage.completionTokens,
        imagesGenerated: 0,
        estimatedCostCents: body.llmUsage.estimatedCostCents,
        confirmedCostCents: body.llmUsage.confirmedCostCents,
        agentKind: 'sales' as const,
        businessId: business.id,
      };
      if (result.blocked) {
        await recordUsage(entry);
      } else {
        usageStore.record(entry);
      }
    }
    res.status(result.blocked ? 200 : 201).json(result);
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('expected APPROVED') || message.includes('no website demo')) {
      res.status(409).json({ error: message });
      return;
    }
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
      return;
    }
    res.status(503).json({ error: `Database unavailable: ${message}` });
  }
});

/**
 * POST /api/sales/approve { draftId, approvedBy? }
 * Human approval of a local draft: DRAFT -> APPROVED, business
 * SALES_PENDING -> SALES_APPROVED. NOT a send: the draft stays local and
 * a follow-up reminder is logged. CONTACTED stays unreachable.
 */
app.post('/api/sales/approve', async (req: Request, res: Response) => {
  const body = req.body as { draftId?: string; approvedBy?: string };
  if (!body.draftId) {
    res.status(400).json({ error: 'draftId is required.' });
    return;
  }
  try {
    const result = await approveDraft(prisma, { draftId: body.draftId, approvedBy: body.approvedBy ?? null });
    res.json(result);
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('expected DRAFT') || message.includes('expected SALES_PENDING')) {
      res.status(409).json({ error: message });
      return;
    }
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
      return;
    }
    res.status(503).json({ error: `Database unavailable: ${message}` });
  }
});

/** GET /api/drafts/:id — a local draft (never sent) with its legal basis. */
app.get('/api/drafts/:id', async (req: Request, res: Response) => {
  try {
    const draft = await prisma.emailDraft.findUnique({ where: { id: req.params.id } });
    if (!draft) {
      res.status(404).json({ error: `Draft ${req.params.id} not found.` });
      return;
    }
    res.json(draft);
  } catch (err) {
    res.status(503).json({ error: `Database unavailable: ${(err as Error).message}` });
  }
});

/** GET /api/gmail/status — honest Gmail state: not_connected until Jon does the OAuth (docs/gmail-setup.md). */
app.get('/api/gmail/status', (_req: Request, res: Response) => {
  res.json(getGmailStatus());
});

/**
 * POST /api/sales/classify { text, businessName? }
 * Classifies a reply into the 8 master-prompt categories and returns the
 * suggested reply (never an economic commitment). No send, no Gmail call.
 */
app.post('/api/sales/classify', (req: Request, res: Response) => {
  const body = req.body as { text?: string; businessName?: string };
  if (!body.text) {
    res.status(400).json({ error: 'text is required.' });
    return;
  }
  const type = classifyReply(body.text);
  res.json({ type, suggestedReply: suggestedReply(type, body.businessName ?? 'la empresa') });
});

/**
 * GET /api/crm/pipeline — every business with its CRM state (13 states),
 * legal status, latest internal proposal and latest local draft, plus
 * conversion stats and due reminders.
 */
app.get('/api/crm/pipeline', async (_req: Request, res: Response) => {
  try {
    const [businesses, proposals, drafts, suppressions, activities, permissions] = await Promise.all([
      prisma.business.findMany({ orderBy: { name: 'asc' } }),
      prisma.commercialProposal.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.emailDraft.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.contactSuppression.findMany(),
      prisma.cRMActivity.findMany({ where: { type: 'REMINDER' }, orderBy: { createdAt: 'desc' } }),
      prisma.contactPermission.findMany(),
    ]);
    const rows: PipelineRow[] = businesses.map((b) => {
      const proposal = proposals.find((p) => p.businessId === b.id) ?? null;
      const draft = drafts.find((d) => d.businessId === b.id) ?? null;
      const suppression = suppressions.find((s) => s.businessId === b.id || (b.email && s.email === b.email)) ?? null;
      const legal = checkLegalBasis({
        businessId: b.id,
        businessName: b.name,
        email: b.email,
        suppressed: Boolean(suppression),
        suppressionReason: suppression?.reason ?? null,
        permissions: permissions
          .filter((p) => p.businessId === b.id)
          .map((p) => ({ basis: p.basis, source: p.source, notes: p.notes })),
      });
      return buildPipelineRow({
        businessId: b.id,
        name: b.name,
        sector: b.sector,
        orchestratorState: b.state as BusinessState,
        email: b.email,
        suppressed: Boolean(suppression),
        suppressionReason: suppression?.reason ?? null,
        proposalModality: proposal?.modality ?? null,
        proposalTotalCents: proposal?.priceCents ?? null,
        draftId: draft?.id ?? null,
        draftStatus: draft?.status ?? null,
        legalReasonCode: legal.reasonCode,
        legalAllowed: legal.allowed,
      });
    });
    const stats = pipelineStats(rows);
    res.json({ rows, stats, reminders: dueReminders(rows, activities) });
  } catch (err) {
    res.status(503).json({ error: `Database unavailable: ${(err as Error).message}` });
  }
});

/**
 * POST /api/crm/suppress { businessId?, email?, reason }
 * Registers an opt-out/objection. SUPPRESSED blocks any future draft
 * (the sales gate checks it first). No contact is made.
 */
app.post('/api/crm/suppress', async (req: Request, res: Response) => {
  const body = req.body as { businessId?: string; email?: string; reason?: string };
  if (!body.reason) {
    res.status(400).json({ error: 'reason is required (UNSUBSCRIBE, COMPLAINT, OBJECTION, ...).' });
    return;
  }
  try {
    const result = await suppressContact(prisma, {
      businessId: body.businessId ?? null,
      email: body.email ?? null,
      reason: body.reason,
    });
    res.status(201).json(result);
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes('not found') || message.includes('needs')) {
      res.status(400).json({ error: message });
      return;
    }
    res.status(503).json({ error: `Database unavailable: ${message}` });
  }
});

/** GET /api/crm/business/:id — full interaction history for one business. */
app.get('/api/crm/business/:id', async (req: Request, res: Response) => {
  try {
    const business = await findBusinessByIdParam(req.params.id);
    if (!business) {
      res.status(404).json({ error: `Business ${req.params.id} not found.` });
      return;
    }
    const [activities, proposals, drafts, suppressions] = await Promise.all([
      prisma.cRMActivity.findMany({ where: { businessId: business.id }, orderBy: { createdAt: 'asc' } }),
      prisma.commercialProposal.findMany({ where: { businessId: business.id }, orderBy: { createdAt: 'desc' } }),
      prisma.emailDraft.findMany({ where: { businessId: business.id }, orderBy: { createdAt: 'desc' } }),
      prisma.contactSuppression.findMany({ where: { businessId: business.id } }),
    ]);
    res.json({ business: serializeBusiness({ ...business, scores: [] }), activities, proposals, drafts, suppressions });
  } catch (err) {
    res.status(503).json({ error: `Database unavailable: ${(err as Error).message}` });
  }
});

await initCostPersistence();

app.listen(PORT, () => {
  console.log(`weblead-api listening on http://localhost:${PORT} (phase E-commercial, Postgres-backed)`);
});
