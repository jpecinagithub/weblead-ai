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
  usageStore,
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

// Historical Fase A measurement (real, 2026-11-16): 4 dossiers summarised
// with Top-Tools-Ai-Basic — 805 tokens total, 0.00 USD. The provider
// returns token usage only, no price, so confirmed cost stays null.
usageStore.record({
  provider: 'top-tools-ai',
  service: 'fase-a-measurement',
  model: 'Top-Tools-Ai-Basic',
  requests: 4,
  promptTokens: 373,
  completionTokens: 432,
  imagesGenerated: 0,
  estimatedCostCents: 0,
  confirmedCostCents: null,
  agentKind: 'researcher',
  recordedAt: '2026-11-16T00:00:00.000Z',
});

// Fase B measurements (real, 2026-11-16, docs/phase-b-measurements.md +
// fase-b/measurements-tta.json): 4 real agent tasks with Top-Tools-Ai-Basic
// on pilot lead 4 (Fontanería la Moderna) — 949 tokens total, 0.00 USD
// estimated, confirmed null (provider returns tokens only, no price).
for (const m of [
  { agentKind: 'researcher' as const, promptTokens: 87, completionTokens: 143 },
  { agentKind: 'designer' as const, promptTokens: 86, completionTokens: 209 },
  { agentKind: 'auditor' as const, promptTokens: 95, completionTokens: 146 },
  { agentKind: 'sales' as const, promptTokens: 80, completionTokens: 103 },
]) {
  usageStore.record({
    provider: 'top-tools-ai',
    service: 'fase-b-measurement',
    model: 'Top-Tools-Ai-Basic',
    requests: 1,
    promptTokens: m.promptTokens,
    completionTokens: m.completionTokens,
    imagesGenerated: 0,
    estimatedCostCents: 0,
    confirmedCostCents: null,
    agentKind: m.agentKind,
    businessId: '4',
    recordedAt: '2026-11-16T20:00:00.000Z',
  });
}

// Fase D measurements (real, 2026-11-16, fase-d/llm-design-drafts.json):
// 2 LLM design drafts with Top-Tools-Ai-Basic (Santiago Ferrer 232+84,
// Begoña Ruiz 253+88 = 657 tokens total, latencies 7.39/6.61 s, both HTTP
// 200) — 0.00 USD estimated, confirmed null (provider returns tokens
// only, no price). Both drafts were accepted by the generator's
// forbidden-claims validation (no rejections).
for (const m of [
  { businessId: '6', promptTokens: 232, completionTokens: 84 },
  { businessId: '17', promptTokens: 253, completionTokens: 88 },
]) {
  usageStore.record({
    provider: 'top-tools-ai',
    service: 'fase-d-generation',
    model: 'Top-Tools-Ai-Basic',
    requests: 1,
    promptTokens: m.promptTokens,
    completionTokens: m.completionTokens,
    imagesGenerated: 0,
    estimatedCostCents: 0,
    confirmedCostCents: null,
    agentKind: 'designer',
    businessId: m.businessId,
    recordedAt: '2026-11-16T21:30:00.000Z',
  });
}
// Fase C measurements (real, 2026-11-16, fase-c/llm-summaries-tta.json):
// 3 LLM summaries with Top-Tools-Ai-Basic, one per verification dossier
// (Santiago Ferrer 122+129, Hidrorioja 120+122, Fontanería Godoy 128+117
// = 738 tokens total, latencies 5.84/7.44/5.28 s, all HTTP 200) — 0.00 USD
// estimated, confirmed null (provider returns tokens only, no price).
for (const m of [
  { businessId: '6', promptTokens: 122, completionTokens: 129 },
  { businessId: '8', promptTokens: 120, completionTokens: 122 },
  { businessId: '1', promptTokens: 128, completionTokens: 117 },
]) {
  usageStore.record({
    provider: 'top-tools-ai',
    service: 'fase-c-llm-summary',
    model: 'Top-Tools-Ai-Basic',
    requests: 1,
    promptTokens: m.promptTokens,
    completionTokens: m.completionTokens,
    imagesGenerated: 0,
    estimatedCostCents: 0,
    confirmedCostCents: null,
    agentKind: 'researcher',
    businessId: m.businessId,
    recordedAt: '2026-11-16T21:00:00.000Z',
  });
}

// In-memory orchestrator state, seeded DISCOVERED for every pilot lead.
// Only a fallback for leads not yet researched (not yet in the DB).
const states = new Map<number, BusinessState>(PILOT_LEADS.map((lead) => [lead.id, 'DISCOVERED']));

const app = express();
app.use(express.json());

/** Cap on businesses per research call (bounded_bulk_pull: no runaway runs). */
export const MAX_BUSINESSES_PER_RESEARCH_CALL = 10;

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'weblead-api', version: '0.1.0', phase: 'D-design-audit' });
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
 * alerts. Estimated and confirmed costs are always separate.
 */
app.get('/api/costs/summary', (_req: Request, res: Response) => {
  res.json(usageStore.summary(EFFECTIVE_SPEND_LIMIT_EUR_CENTS));
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
 * merged. Screenshots land in docs/phase-d/screenshots/.
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
        '../../../docs/phase-d/screenshots',
        import.meta.url,
      ).pathname;
      try {
        const pw = await runPlaywrightAudit(body.demoUrl, screenshotsDir, business.slug);
        report = mergePlaywrightFindings(report, pw.findings);
        runner = 'playwright';
        screenshots = {
          desktop: `docs/phase-d/screenshots/${business.slug}-desktop.png`,
          mobile: `docs/phase-d/screenshots/${business.slug}-mobile.png`,
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

app.listen(PORT, () => {
  console.log(`weblead-api listening on http://localhost:${PORT} (phase D-design-audit, Postgres-backed)`);
});
