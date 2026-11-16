/**
 * WebLead AI API — Phase 0 skeleton.
 * Node + Express + TypeScript, port 4000 (API_PORT).
 * No database yet: businesses are the 10 pilot leads (read-only seed from
 * the Fase A CSV) with an in-memory orchestrator state per lead.
 * Persistence (Prisma/Postgres) lands in Phase 1.
 */
import express, { type Request, type Response } from 'express';
import { transitionBusiness } from '@weblead/agent-core';
import {
  createSpendGate,
  DEFAULT_EFFECTIVE_SPEND_LIMIT_EUR_CENTS,
  usageStore,
} from '@weblead/cost-control';
import {
  BUSINESS_STATES,
  BUSINESS_TRANSITIONS,
  getPilotLead,
  IllegalTransitionError,
  isBusinessState,
  PILOT_LEADS,
  type BusinessState,
} from '@weblead/shared';

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

// In-memory orchestrator state, seeded DISCOVERED for every pilot lead.
const states = new Map<number, BusinessState>(PILOT_LEADS.map((lead) => [lead.id, 'DISCOVERED']));

const app = express();
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'weblead-api', version: '0.1.0', phase: '0-skeleton' });
});

app.get('/api/businesses', (_req: Request, res: Response) => {
  res.json(
    PILOT_LEADS.map((lead) => ({ ...lead, state: states.get(lead.id) ?? lead.state })),
  );
});

app.get('/api/businesses/:id', (req: Request, res: Response) => {
  const lead = getPilotLead(Number(req.params.id));
  if (!lead) {
    res.status(404).json({ error: `Business ${req.params.id} not found (pilot seed has 10 leads).` });
    return;
  }
  res.json({ ...lead, state: states.get(lead.id) ?? lead.state });
});

/** The pipeline itself: states + allowed transitions (dashboard renders this). */
app.get('/api/pipeline', (_req: Request, res: Response) => {
  res.json({ states: BUSINESS_STATES, transitions: BUSINESS_TRANSITIONS });
});

/**
 * GET /api/costs/summary — the 8 cost indicators (§8): total, per agent,
 * per business, per website, per opportunity, per provider, free quotas,
 * alerts. Estimated and confirmed costs are always separate. Phase 0 data
 * is the Fase A measurement only (4 dossiers, 0.00 USD estimated).
 */
app.get('/api/costs/summary', (_req: Request, res: Response) => {
  res.json(usageStore.summary(EFFECTIVE_SPEND_LIMIT_EUR_CENTS));
});

/**
 * POST /api/businesses/:id/state { "to": "<STATE>" }
 * Validates through the shared state machine. An illegal jump
 * (e.g. DISCOVERED -> APPROVED) is rejected with 400 + IllegalTransitionError.
 */
app.post('/api/businesses/:id/state', (req: Request, res: Response) => {
  const lead = getPilotLead(Number(req.params.id));
  if (!lead) {
    res.status(404).json({ error: `Business ${req.params.id} not found.` });
    return;
  }
  const to = req.body?.to as unknown;
  if (!isBusinessState(to)) {
    res.status(400).json({ error: `"to" must be one of the 18 orchestrator states.`, states: BUSINESS_STATES });
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

app.listen(PORT, () => {
  console.log(`weblead-api listening on http://localhost:${PORT} (phase 0 skeleton, no DB yet)`);
});
