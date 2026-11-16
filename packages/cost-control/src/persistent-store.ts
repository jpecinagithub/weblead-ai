/**
 * Prisma-backed cost store (Fase F, Bloque 1) — UsageRecord is the source
 * of truth; InMemoryUsageStore stays as the mirror/fallback.
 *
 * Design decisions (see docs/phase-f/cost-persistence.md):
 * - The store never imports Prisma: it talks to a minimal
 *   `UsageRecordClient` delegate ({ create, findMany }) that the API
 *   adapts from prisma.usageRecord. Tests pass a fake delegate, so the
 *   store is unit-testable without a database.
 * - `record()` is BEST-EFFORT and never throws: a DB failure is logged
 *   and the entry is kept in the in-memory mirror, so recording can
 *   never break the LLM call that produced the consumption.
 * - Every record is mirrored to memory (whether the DB write succeeded
 *   or not), so the fallback summary stays complete during a DB outage.
 * - `summary()` reads from the DB with the same pure aggregation as the
 *   in-memory store (`summarizeUsageEntries`), so the 8 indicators and
 *   their shape are identical; on a DB read failure it falls back to
 *   the in-memory mirror. Estimated and confirmed costs are always
 *   separate; confirmed stays null while no provider confirms a charge.
 * - Historical rows are marked with the `historic:` service prefix
 *   (e.g. `historic:fase-a-measurement`); `seedHistorical` is
 *   idempotent and also recognises rows the phase scripts wrote
 *   themselves under the plain service name (Fase D generation, Fase E
 *   sales draft), so re-seeding never double-counts them.
 */
import {
  DEFAULT_EFFECTIVE_SPEND_LIMIT_EUR_CENTS,
  InMemoryUsageStore,
  summarizeUsageEntries,
  type CostsSummary,
  type UsageEntry,
} from './index.js';
import type { HistoricalMeasurement } from './history.js';

/** Prefix marking a UsageRecord row as a seeded historical measurement. */
export const HISTORIC_SERVICE_PREFIX = 'historic:';

/** One UsageRecord row, as read back from the database. */
export type UsageRecordRow = {
  id: string;
  provider: string;
  service: string | null;
  agentKind: string | null;
  model: string | null;
  tokensPrompt: number;
  tokensCompletion: number;
  requests: number;
  imagesGenerated: number;
  websiteProjectId: string | null;
  costCents: number | null;
  estimatedCostCents: number | null;
  confirmedCostCents: number | null;
  businessId: string | null;
  executionId: string | null;
  createdAt: Date;
};

/** Data for one UsageRecord insert. */
export type UsageRecordCreateData = {
  provider: string;
  service: string;
  agentKind: string | null;
  model: string;
  tokensPrompt: number;
  tokensCompletion: number;
  requests: number;
  imagesGenerated: number;
  websiteProjectId: string | null;
  costCents: number | null;
  estimatedCostCents: number;
  confirmedCostCents: number | null;
  businessId: string | null;
  executionId: string | null;
  createdAt: Date;
};

/**
 * Minimal UsageRecord delegate. The API adapts `prisma.usageRecord` to
 * this shape (create with a data object, findMany returning all rows
 * oldest-first); tests pass a fake. No Prisma import here on purpose.
 */
export interface UsageRecordClient {
  create(data: UsageRecordCreateData): Promise<UsageRecordRow>;
  findMany(): Promise<UsageRecordRow[]>;
}

/** Resolves a historical measurement's business to a Business uuid. */
export type BusinessResolver = (ref: { pilotId?: number; slug?: string }) => Promise<string | null>;

export type SeedResult = {
  inserted: number;
  skipped: number;
  insertedServices: string[];
};

const AGENT_KINDS: readonly string[] = [
  'orchestrator',
  'researcher',
  'designer',
  'auditor',
  'sales',
  'crm',
];

/**
 * Maps a UsageRecord row to a UsageEntry. Estimated cost falls back to
 * the legacy `costCents` column only when `estimatedCostCents` is null
 * (existing writers leave costCents null and set estimatedCostCents).
 * `businessId` keeps the Business uuid; rows without a business (e.g.
 * the Fase C Godoy row — pilot 1 was never seeded — and the Fase E
 * row, orphaned when its fixture was re-seeded) simply have no
 * businessId and do not appear in the per-business breakdown.
 */
export function usageRecordRowToEntry(row: UsageRecordRow): UsageEntry {
  const agentKind =
    row.agentKind && AGENT_KINDS.includes(row.agentKind)
      ? (row.agentKind as UsageEntry['agentKind'])
      : undefined;
  return {
    provider: row.provider as UsageEntry['provider'],
    service: row.service ?? '',
    model: row.model ?? '',
    requests: row.requests ?? 1,
    promptTokens: row.tokensPrompt ?? 0,
    completionTokens: row.tokensCompletion ?? 0,
    imagesGenerated: row.imagesGenerated ?? 0,
    estimatedCostCents: row.estimatedCostCents ?? row.costCents ?? 0,
    confirmedCostCents: row.confirmedCostCents ?? null,
    ...(row.businessId ? { businessId: row.businessId } : {}),
    ...(agentKind ? { agentKind } : {}),
    ...(row.websiteProjectId ? { websiteProjectId: row.websiteProjectId } : {}),
    recordedAt: (row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt)).toISOString(),
  };
}

export class PrismaUsageStore {
  private readonly client: UsageRecordClient;
  private readonly fallback: InMemoryUsageStore;

  constructor(client: UsageRecordClient, fallback: InMemoryUsageStore) {
    this.client = client;
    this.fallback = fallback;
  }

  /**
   * Records one consumption event in Postgres (best-effort) and always
   * mirrors it to the in-memory fallback. NEVER throws: a DB failure is
   * logged with console.warn and the entry survives in memory, so the
   * LLM call that produced it is never broken by cost recording.
   * Callers must pass a real Business uuid as businessId (a pilot-id
   * string would violate the FK and fall back to memory only).
   */
  async record(entry: Omit<UsageEntry, 'recordedAt'> & { recordedAt?: string }): Promise<UsageEntry> {
    const full: UsageEntry = { ...entry, recordedAt: entry.recordedAt ?? new Date().toISOString() };
    try {
      await this.client.create({
        provider: full.provider,
        service: full.service,
        agentKind: full.agentKind ?? null,
        model: full.model,
        tokensPrompt: full.promptTokens,
        tokensCompletion: full.completionTokens,
        requests: full.requests,
        imagesGenerated: full.imagesGenerated,
        websiteProjectId: full.websiteProjectId ?? null,
        // Existing writers (agent-researcher/designer/sales) leave the
        // legacy costCents null and set estimatedCostCents; follow them.
        costCents: null,
        estimatedCostCents: full.estimatedCostCents,
        confirmedCostCents: full.confirmedCostCents,
        businessId: full.businessId ?? null,
        executionId: null,
        createdAt: new Date(full.recordedAt),
      });
    } catch (err) {
      console.warn(
        `[cost-control] UsageRecord write failed (${(err as Error).message}); ` +
          'keeping the entry in the in-memory fallback only.',
      );
    }
    this.fallback.record(full);
    return full;
  }

  /** All entries, oldest first; falls back to the in-memory mirror on a DB read failure. */
  async getEntries(): Promise<UsageEntry[]> {
    try {
      const rows = await this.client.findMany();
      return rows.map(usageRecordRowToEntry);
    } catch (err) {
      console.warn(
        `[cost-control] UsageRecord read failed (${(err as Error).message}); ` +
          'serving costs from the in-memory fallback.',
      );
      return [...this.fallback.getEntries()];
    }
  }

  /**
   * The 8 cost indicators (§8) from Postgres, same shape and aggregation
   * as the in-memory store. Falls back to the mirror when the DB is
   * unavailable (via getEntries).
   */
  async summary(
    effectiveSpendLimitEurCents: number = DEFAULT_EFFECTIVE_SPEND_LIMIT_EUR_CENTS,
  ): Promise<CostsSummary> {
    const entries = await this.getEntries();
    return summarizeUsageEntries(entries, effectiveSpendLimitEurCents);
  }

  /**
   * Replaces the in-memory mirror with the current DB contents.
   * Called at startup after seeding, so the fallback summary matches
   * the DB exactly. Throws on a DB failure (caller falls back to the
   * in-memory historical seed instead).
   */
  async loadMirrorFromDb(): Promise<number> {
    const rows = await this.client.findMany();
    this.fallback.clear();
    for (const row of rows) this.fallback.record(usageRecordRowToEntry(row));
    return rows.length;
  }

  /**
   * Seeds historical measurements into UsageRecord, idempotently.
   * Rows are stored with service `historic:<service>`. A measurement is
   * skipped when a row already matches it by provider + model +
   * agentKind + prompt/completion tokens, under either the historic
   * service name or the plain one — the plain-name match covers rows
   * the phase scripts wrote themselves before Fase F (Fase D
   * 'fase-d-generation' ×2, Fase E 'fase-e-sales-draft' ×1), so a
   * re-run never double-counts them. Business uuids are resolved
   * through `resolveBusiness` (pilot id or slug); unresolvable
   * businesses seed with businessId null. Throws on a DB failure so
   * the caller can fall back to the in-memory seed; partial progress
   * (rows inserted before the failure) is still skipped on retry.
   */
  async seedHistorical(
    entries: readonly HistoricalMeasurement[],
    resolveBusiness?: BusinessResolver,
  ): Promise<SeedResult> {
    const existing = await this.client.findMany();
    let inserted = 0;
    let skipped = 0;
    const insertedServices: string[] = [];
    for (const m of entries) {
      const historicService = `${HISTORIC_SERVICE_PREFIX}${m.service}`;
      const alreadyThere = existing.some(
        (r) =>
          r.provider === m.provider &&
          r.model === m.model &&
          (r.agentKind ?? null) === m.agentKind &&
          r.tokensPrompt === m.promptTokens &&
          r.tokensCompletion === m.completionTokens &&
          (r.service === historicService || r.service === m.service),
      );
      if (alreadyThere) {
        skipped += 1;
        continue;
      }
      const businessId = resolveBusiness
        ? await resolveBusiness({ pilotId: m.businessPilotId, slug: m.businessSlug }).catch(() => null)
        : null;
      const row = await this.client.create({
        provider: m.provider,
        service: historicService,
        agentKind: m.agentKind,
        model: m.model,
        tokensPrompt: m.promptTokens,
        tokensCompletion: m.completionTokens,
        requests: m.requests,
        imagesGenerated: 0,
        websiteProjectId: null,
        costCents: null,
        estimatedCostCents: m.estimatedCostCents,
        confirmedCostCents: m.confirmedCostCents,
        businessId,
        executionId: null,
        createdAt: new Date(m.recordedAt),
      });
      existing.push(row);
      inserted += 1;
      insertedServices.push(historicService);
    }
    return { inserted, skipped, insertedServices };
  }
}
