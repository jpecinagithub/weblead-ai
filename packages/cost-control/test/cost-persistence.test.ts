import { describe, expect, it } from 'vitest';
import {
  HISTORICAL_MEASUREMENTS,
  historicalTotals,
  InMemoryUsageStore,
  PrismaUsageStore,
  usageRecordRowToEntry,
  type UsageRecordClient,
  type UsageRecordCreateData,
  type UsageRecordRow,
} from '../src/index.js';

/** In-memory fake of the UsageRecord delegate (no database needed). */
class FakeUsageRecordClient implements UsageRecordClient {
  rows: UsageRecordRow[] = [];
  failReads = false;
  failWrites = false;

  async create(data: UsageRecordCreateData): Promise<UsageRecordRow> {
    if (this.failWrites) throw new Error('fake DB write failure');
    const row: UsageRecordRow = {
      id: `row-${this.rows.length + 1}`,
      ...data,
    };
    this.rows.push(row);
    return row;
  }

  async findMany(): Promise<UsageRecordRow[]> {
    if (this.failReads) throw new Error('fake DB read failure');
    return [...this.rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}

function makeRow(partial: Partial<UsageRecordRow> & { service: string }): UsageRecordRow {
  return {
    id: `pre-${partial.service}-${partial.tokensPrompt}`,
    provider: 'top-tools-ai',
    service: partial.service,
    agentKind: 'researcher',
    model: 'Top-Tools-Ai-Basic',
    tokensPrompt: 0,
    tokensCompletion: 0,
    requests: 1,
    imagesGenerated: 0,
    websiteProjectId: null,
    costCents: null,
    estimatedCostCents: 0,
    confirmedCostCents: null,
    businessId: null,
    executionId: null,
    createdAt: new Date('2026-11-16T20:00:00.000Z'),
    ...partial,
  };
}

/** Resolver like the API's: pilot 1 (Godoy) has no Business row. */
const testResolver = async (ref: { pilotId?: number; slug?: string }): Promise<string | null> => {
  if (ref.pilotId === 1) return null;
  if (ref.pilotId !== undefined) return `biz-pilot-${ref.pilotId}`;
  if (ref.slug) return `biz-${ref.slug}`;
  return null;
};

describe('historical measurements (Fases A–E, the reconciliation guard)', () => {
  it('totals 14 calls / 3.375 tokens — the validation-report §4 numbers', () => {
    expect(HISTORICAL_MEASUREMENTS.length).toBe(14);
    expect(historicalTotals()).toEqual({
      calls: 14,
      promptTokens: 1703,
      completionTokens: 1672,
      totalTokens: 3375,
    });
    // The Fase E sales draft is the call the in-memory seeds were missing
    // (13 calls / 3.149 tokens): 127 prompt + 99 completion = 226.
    const faseE = HISTORICAL_MEASUREMENTS.filter((m) => m.service === 'fase-e-sales-draft');
    expect(faseE.length).toBe(1);
    expect(faseE[0]?.promptTokens).toBe(127);
    expect(faseE[0]?.completionTokens).toBe(99);
    expect(faseE[0]?.agentKind).toBe('sales');
  });
});

describe('PrismaUsageStore.seedHistorical (idempotent)', () => {
  it('inserts 14 historic rows on first run, 0 on re-run', async () => {
    const client = new FakeUsageRecordClient();
    const store = new PrismaUsageStore(client, new InMemoryUsageStore());
    const first = await store.seedHistorical(HISTORICAL_MEASUREMENTS, testResolver);
    expect(first).toEqual({ inserted: 14, skipped: 0, insertedServices: expect.any(Array) });
    expect(client.rows.length).toBe(14);
    expect(client.rows.every((r) => r.service.startsWith('historic:'))).toBe(true);
    expect(client.rows.every((r) => r.estimatedCostCents === 0)).toBe(true);
    expect(client.rows.every((r) => r.confirmedCostCents === null)).toBe(true);

    const second = await store.seedHistorical(HISTORICAL_MEASUREMENTS, testResolver);
    expect(second.inserted).toBe(0);
    expect(second.skipped).toBe(14);
    expect(client.rows.length).toBe(14);
  });

  it('skips rows the phase scripts already wrote under the plain service name', async () => {
    const client = new FakeUsageRecordClient();
    // Pre-existing rows as found in weblead_dev (Fase D ×2, Fase E ×1).
    client.rows.push(
      makeRow({ service: 'fase-d-generation', agentKind: 'designer', tokensPrompt: 232, tokensCompletion: 84, businessId: 'biz-pilot-6' }),
      makeRow({ service: 'fase-d-generation', agentKind: 'designer', tokensPrompt: 253, tokensCompletion: 88, businessId: 'biz-pilot-17' }),
      makeRow({ service: 'fase-e-sales-draft', agentKind: 'sales', tokensPrompt: 127, tokensCompletion: 99, businessId: null }),
    );
    const store = new PrismaUsageStore(client, new InMemoryUsageStore());
    const result = await store.seedHistorical(HISTORICAL_MEASUREMENTS, testResolver);
    expect(result.inserted).toBe(11);
    expect(result.skipped).toBe(3);
    expect(client.rows.length).toBe(14);
  });

  it('resolves business uuids; unresolvable businesses seed with null', async () => {
    const client = new FakeUsageRecordClient();
    const store = new PrismaUsageStore(client, new InMemoryUsageStore());
    await store.seedHistorical(HISTORICAL_MEASUREMENTS, testResolver);
    const godoy = client.rows.find((r) => r.tokensPrompt === 128 && r.tokensCompletion === 117);
    expect(godoy?.businessId).toBeNull();
    const ferrerC = client.rows.find((r) => r.tokensPrompt === 122 && r.tokensCompletion === 129);
    expect(ferrerC?.businessId).toBe('biz-pilot-6');
    const faseE = client.rows.find((r) => r.service === 'historic:fase-e-sales-draft');
    expect(faseE?.businessId).toBe('biz-verificacion-fase-e-empresa-de-prueba');
  });
});

describe('PrismaUsageStore.record (best-effort, never breaks the caller)', () => {
  it('writes the row to the DB and mirrors it to memory', async () => {
    const client = new FakeUsageRecordClient();
    const fallback = new InMemoryUsageStore();
    const store = new PrismaUsageStore(client, fallback);
    const entry = await store.record({
      provider: 'top-tools-ai',
      service: 'fase-d-generation',
      model: 'Top-Tools-Ai-Basic',
      requests: 1,
      promptTokens: 232,
      completionTokens: 84,
      imagesGenerated: 0,
      estimatedCostCents: 0,
      confirmedCostCents: null,
      agentKind: 'designer',
      businessId: 'biz-pilot-6',
      websiteProjectId: 'web-1',
    });
    expect(client.rows.length).toBe(1);
    expect(client.rows[0]).toMatchObject({
      provider: 'top-tools-ai',
      service: 'fase-d-generation',
      tokensPrompt: 232,
      tokensCompletion: 84,
      estimatedCostCents: 0,
      confirmedCostCents: null,
      businessId: 'biz-pilot-6',
      websiteProjectId: 'web-1',
    });
    expect(fallback.getEntries()).toEqual([entry]);
  });

  it('does not throw when the DB write fails; the entry survives in memory', async () => {
    const client = new FakeUsageRecordClient();
    client.failWrites = true;
    const fallback = new InMemoryUsageStore();
    const store = new PrismaUsageStore(client, fallback);
    const entry = await store.record({
      provider: 'top-tools-ai',
      service: 'fase-e-sales-draft',
      model: 'Top-Tools-Ai-Basic',
      requests: 1,
      promptTokens: 127,
      completionTokens: 99,
      imagesGenerated: 0,
      estimatedCostCents: 0,
      confirmedCostCents: null,
      agentKind: 'sales',
    });
    expect(client.rows.length).toBe(0);
    expect(fallback.getEntries()).toEqual([entry]);
  });
});

describe('PrismaUsageStore.summary (same 8 indicators as the in-memory store)', () => {
  it('reads totals from the DB: 14 calls, 3.375 tokens, estimated 0, confirmed null', async () => {
    const client = new FakeUsageRecordClient();
    const store = new PrismaUsageStore(client, new InMemoryUsageStore());
    await store.seedHistorical(HISTORICAL_MEASUREMENTS, testResolver);
    const s = await store.summary(0);
    expect(s.totalEstimatedCostCents).toBe(0);
    expect(s.totalConfirmedCostCents).toBeNull();
    const provider = s.byProvider.find((p) => p.provider === 'top-tools-ai');
    expect(provider?.requests).toBe(14);
    expect(provider?.promptTokens).toBe(1703);
    expect(provider?.completionTokens).toBe(1672);
    expect(provider?.estimatedCostCents).toBe(0);
    expect(provider?.confirmedCostCents).toBeNull();
    // Per agent: researcher 8 calls (4 A + 1 B + 3 C), designer 3, auditor 1, sales 2.
    expect(s.byAgent.researcher?.requests).toBe(8);
    expect(s.byAgent.designer?.requests).toBe(3);
    expect(s.byAgent.auditor?.requests).toBe(1);
    expect(s.byAgent.sales?.requests).toBe(2);
  });

  it('falls back to the in-memory mirror when the DB read fails', async () => {
    const client = new FakeUsageRecordClient();
    client.failReads = true;
    const fallback = new InMemoryUsageStore();
    fallback.record({
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
    });
    const store = new PrismaUsageStore(client, fallback);
    const s = await store.summary(0);
    expect(s.byProvider[0]?.promptTokens).toBe(373);
    expect(s.byProvider[0]?.completionTokens).toBe(432);
    expect(s.totalConfirmedCostCents).toBeNull();
  });
});

describe('usageRecordRowToEntry (DB row -> UsageEntry)', () => {
  it('keeps estimated and confirmed costs separate, always', () => {
    const entry = usageRecordRowToEntry(
      makeRow({
        service: 'fase-b-measurement',
        tokensPrompt: 100,
        tokensCompletion: 50,
        estimatedCostCents: 7,
        confirmedCostCents: 5,
      }),
    );
    expect(entry.estimatedCostCents).toBe(7);
    expect(entry.confirmedCostCents).toBe(5);
    expect(entry.promptTokens).toBe(100);
    expect(entry.completionTokens).toBe(50);
  });

  it('falls back to legacy costCents only when estimatedCostCents is null', () => {
    const entry = usageRecordRowToEntry(
      makeRow({ service: 'legacy', estimatedCostCents: null, costCents: 9, confirmedCostCents: null }),
    );
    expect(entry.estimatedCostCents).toBe(9);
    expect(entry.confirmedCostCents).toBeNull();
  });

  it('drops unknown agentKind values instead of inventing one', () => {
    const entry = usageRecordRowToEntry(makeRow({ service: 'x', agentKind: 'wizard' }));
    expect(entry.agentKind).toBeUndefined();
  });
});
