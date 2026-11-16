/**
 * Historical LLM measurements (Fases A–E, 2026-11-16) — the seed for the
 * persistent cost store. One entry per real LLM call, taken verbatim from
 * the measurement JSONs (never re-typed from memory):
 *
 * - Fase A: fase-a/cost-measure-tta.json (4 calls, 805 tokens)
 * - Fase B: fase-b/measurements-tta.json (4 calls, 949 tokens)
 * - Fase C: fase-c/llm-summaries-tta.json (3 calls, 738 tokens)
 * - Fase D: fase-d/llm-design-drafts.json (2 calls, 657 tokens)
 * - Fase E: fase-e/llm-draft-tta.json (1 call, 226 tokens)
 *
 * Total: 14 calls, 3.375 tokens. All Top-Tools-Ai-Basic, estimated
 * 0 cents, confirmed null (the provider returns tokens only, no price).
 *
 * RECONCILIATION (Fase F, Bloque 1): the in-memory seeds in the API
 * summed 13 calls / 3.149 tokens while docs/validation-report.md §4
 * claimed 14 calls / 3.375 tokens. The missing call is the Fase E
 * sales draft (fase-e/llm-draft-tta.json): 1 call, 127 prompt + 99
 * completion = 226 tokens, for the synthetic verification fixture
 * "verificacion-fase-e-empresa-de-prueba". It was never seeded in
 * memory (the API had no usageStore.record for Fase E), but the
 * validation total counted it — and it is also the one call already
 * persisted in UsageRecord (service 'fase-e-sales-draft', written by
 * prepareSales at 2026-11-16 20:14:31). 3.149 + 226 = 3.375, 13 + 1 = 14.
 * Discrepancy CLOSED, not open: see docs/phase-f/cost-persistence.md.
 *
 * Business linkage: entries carry a pilot id (or the Fase E fixture
 * slug) so the seeder can resolve the real Business uuid in Postgres.
 * Pilot 1 (Fontanería Godoy, Fase C) has no Business row — it was
 * REJECTED in Fase C and never seeded — so that row seeds with
 * businessId null. The Fase E fixture row likewise seeds with null
 * when the fixture is absent.
 */
import type { AgentKind, ServiceProvider } from './index.js';

export type HistoricalMeasurement = {
  provider: ServiceProvider;
  /** Base service name; the seeder stores it as `historic:<service>`. */
  service: string;
  model: string;
  agentKind: AgentKind;
  /** Pilot id in docs/feasibility-data.csv, when the business is a pilot lead. */
  businessPilotId?: number;
  /** Business slug, when the business is not a pilot lead (Fase E fixture). */
  businessSlug?: string;
  promptTokens: number;
  completionTokens: number;
  requests: number;
  estimatedCostCents: number;
  confirmedCostCents: number | null;
  recordedAt: string;
};

export const HISTORICAL_MEASUREMENTS: readonly HistoricalMeasurement[] = [
  // Fase A — 4 calls, 805 tokens (fase-a/cost-measure-tta.json).
  // Per-call rows (the old in-memory seed aggregated them into one
  // entry: requests 4, 373 prompt + 432 completion).
  {
    provider: 'top-tools-ai', service: 'fase-a-measurement', model: 'Top-Tools-Ai-Basic',
    agentKind: 'researcher', businessPilotId: 4, promptTokens: 87, completionTokens: 70,
    requests: 1, estimatedCostCents: 0, confirmedCostCents: null,
    recordedAt: '2026-11-16T00:00:00.000Z',
  },
  {
    provider: 'top-tools-ai', service: 'fase-a-measurement', model: 'Top-Tools-Ai-Basic',
    agentKind: 'researcher', businessPilotId: 6, promptTokens: 95, completionTokens: 133,
    requests: 1, estimatedCostCents: 0, confirmedCostCents: null,
    recordedAt: '2026-11-16T00:00:00.000Z',
  },
  {
    provider: 'top-tools-ai', service: 'fase-a-measurement', model: 'Top-Tools-Ai-Basic',
    agentKind: 'researcher', businessPilotId: 24, promptTokens: 99, completionTokens: 121,
    requests: 1, estimatedCostCents: 0, confirmedCostCents: null,
    recordedAt: '2026-11-16T00:00:00.000Z',
  },
  {
    provider: 'top-tools-ai', service: 'fase-a-measurement', model: 'Top-Tools-Ai-Basic',
    agentKind: 'researcher', businessPilotId: 25, promptTokens: 92, completionTokens: 108,
    requests: 1, estimatedCostCents: 0, confirmedCostCents: null,
    recordedAt: '2026-11-16T00:00:00.000Z',
  },
  // Fase B — 4 calls, 949 tokens (fase-b/measurements-tta.json), pilot lead 4.
  {
    provider: 'top-tools-ai', service: 'fase-b-measurement', model: 'Top-Tools-Ai-Basic',
    agentKind: 'researcher', businessPilotId: 4, promptTokens: 87, completionTokens: 143,
    requests: 1, estimatedCostCents: 0, confirmedCostCents: null,
    recordedAt: '2026-11-16T20:00:00.000Z',
  },
  {
    provider: 'top-tools-ai', service: 'fase-b-measurement', model: 'Top-Tools-Ai-Basic',
    agentKind: 'designer', businessPilotId: 4, promptTokens: 86, completionTokens: 209,
    requests: 1, estimatedCostCents: 0, confirmedCostCents: null,
    recordedAt: '2026-11-16T20:00:00.000Z',
  },
  {
    provider: 'top-tools-ai', service: 'fase-b-measurement', model: 'Top-Tools-Ai-Basic',
    agentKind: 'auditor', businessPilotId: 4, promptTokens: 95, completionTokens: 146,
    requests: 1, estimatedCostCents: 0, confirmedCostCents: null,
    recordedAt: '2026-11-16T20:00:00.000Z',
  },
  {
    provider: 'top-tools-ai', service: 'fase-b-measurement', model: 'Top-Tools-Ai-Basic',
    agentKind: 'sales', businessPilotId: 4, promptTokens: 80, completionTokens: 103,
    requests: 1, estimatedCostCents: 0, confirmedCostCents: null,
    recordedAt: '2026-11-16T20:00:00.000Z',
  },
  // Fase C — 3 calls, 738 tokens (fase-c/llm-summaries-tta.json).
  {
    provider: 'top-tools-ai', service: 'fase-c-llm-summary', model: 'Top-Tools-Ai-Basic',
    agentKind: 'researcher', businessPilotId: 6, promptTokens: 122, completionTokens: 129,
    requests: 1, estimatedCostCents: 0, confirmedCostCents: null,
    recordedAt: '2026-11-16T21:00:00.000Z',
  },
  {
    provider: 'top-tools-ai', service: 'fase-c-llm-summary', model: 'Top-Tools-Ai-Basic',
    agentKind: 'researcher', businessPilotId: 8, promptTokens: 120, completionTokens: 122,
    requests: 1, estimatedCostCents: 0, confirmedCostCents: null,
    recordedAt: '2026-11-16T21:00:00.000Z',
  },
  {
    provider: 'top-tools-ai', service: 'fase-c-llm-summary', model: 'Top-Tools-Ai-Basic',
    agentKind: 'researcher', businessPilotId: 1, promptTokens: 128, completionTokens: 117,
    requests: 1, estimatedCostCents: 0, confirmedCostCents: null,
    recordedAt: '2026-11-16T21:00:00.000Z',
  },
  // Fase D — 2 calls, 657 tokens (fase-d/llm-design-drafts.json).
  // Both already exist in UsageRecord (service 'fase-d-generation',
  // written by generate-designs.ts); the seeder skips them as duplicates.
  {
    provider: 'top-tools-ai', service: 'fase-d-generation', model: 'Top-Tools-Ai-Basic',
    agentKind: 'designer', businessPilotId: 6, promptTokens: 232, completionTokens: 84,
    requests: 1, estimatedCostCents: 0, confirmedCostCents: null,
    recordedAt: '2026-11-16T21:30:00.000Z',
  },
  {
    provider: 'top-tools-ai', service: 'fase-d-generation', model: 'Top-Tools-Ai-Basic',
    agentKind: 'designer', businessPilotId: 17, promptTokens: 253, completionTokens: 88,
    requests: 1, estimatedCostCents: 0, confirmedCostCents: null,
    recordedAt: '2026-11-16T21:30:00.000Z',
  },
  // Fase E — 1 call, 226 tokens (fase-e/llm-draft-tta.json). THE call
  // missing from the in-memory seeds. Already in UsageRecord (service
  // 'fase-e-sales-draft', written by prepareSales 2026-11-16 20:14:31);
  // the seeder skips it as a duplicate. recordedAt matches that write.
  {
    provider: 'top-tools-ai', service: 'fase-e-sales-draft', model: 'Top-Tools-Ai-Basic',
    agentKind: 'sales', businessSlug: 'verificacion-fase-e-empresa-de-prueba',
    promptTokens: 127, completionTokens: 99,
    requests: 1, estimatedCostCents: 0, confirmedCostCents: null,
    recordedAt: '2026-11-16T20:14:31.000Z',
  },
];

/** Total calls / tokens in HISTORICAL_MEASUREMENTS (test guard). */
export function historicalTotals(): { calls: number; promptTokens: number; completionTokens: number; totalTokens: number } {
  let calls = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  for (const m of HISTORICAL_MEASUREMENTS) {
    calls += m.requests;
    promptTokens += m.promptTokens;
    completionTokens += m.completionTokens;
  }
  return { calls, promptTokens, completionTokens, totalTokens: promptTokens + completionTokens };
}
