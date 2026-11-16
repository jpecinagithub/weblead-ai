import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@weblead/database';
import { assertQualifiedForDesign, designStatePath, designWebsite } from '../src/index.js';

function stubPrisma(state: string, found = true) {
  const calls: string[] = [];
  const businessRow = {
    id: 'biz-6',
    name: 'Santiago Ferrer Fontanería en General SL',
    slug: 'santiago-ferrer-fontaneria-en-general-sl-logrono',
    sector: 'fontanería/climatización',
    address: 'C/ Gonzalo de Berceo, 8, 3-D, 26005 Logroño',
    municipality: 'Logroño',
    province: 'La Rioja',
    phone: '941227157',
    email: 'sanfefo@terra.com',
    hasOwnWebsite: false,
    activity: 'CONFIRMED',
    state,
    pilotId: 6,
    services: [],
    consultedAt: new Date('2026-11-16'),
  };
  const stub = {
    business: {
      findUnique: vi.fn(async () => (found ? businessRow : null)),
      update: vi.fn(async (args: { data: { state: string } }) => {
        calls.push(`business.state=${args.data.state}`);
        return {};
      }),
    },
    businessSource: {
      findMany: vi.fn(async () => [{ rawData: { name: 'eInforma' } }, { rawData: { name: 'Exa Places' } }]),
    },
    opportunityScore: { findFirst: vi.fn(async () => ({ total: 100 })) },
    agent: { upsert: vi.fn(async () => ({ id: 'agent-designer' })) },
    websiteProject: {
      upsert: vi.fn(async () => ({ id: 'proj-1' })),
    },
    websiteAsset: {
      deleteMany: vi.fn(async () => ({})),
      create: vi.fn(async () => ({})),
    },
    agentExecution: { create: vi.fn(async () => ({ id: 'exec-1' })) },
    usageRecord: { create: vi.fn(async () => ({})) },
  };
  return { stub: stub as unknown as PrismaClient, calls };
}

describe('designer guards (Fase D)', () => {
  it('state path is QUALIFIED -> DESIGNING -> PREVIEW_READY, validated', () => {
    expect(designStatePath()).toEqual(['QUALIFIED', 'DESIGNING', 'PREVIEW_READY']);
    expect(designStatePath('AUDIT_FAILED')).toEqual(['AUDIT_FAILED', 'DESIGNING', 'PREVIEW_READY']);
    expect(designStatePath('PREVIEW_READY')).toEqual(['PREVIEW_READY', 'DESIGNING', 'PREVIEW_READY']);
    expect(() => assertQualifiedForDesign('QUALIFIED')).not.toThrow();
    expect(() => assertQualifiedForDesign('AUDIT_FAILED')).not.toThrow();
    expect(() => assertQualifiedForDesign('PREVIEW_READY')).not.toThrow();
    expect(() => assertQualifiedForDesign('RESEARCHED')).toThrow(/expected QUALIFIED/);
    expect(() => assertQualifiedForDesign('APPROVED')).toThrow(/expected QUALIFIED/);
    expect(() => designStatePath('RESEARCHED')).toThrow();
  });

  it('designs a QUALIFIED business and persists project + assets + PREVIEW_READY', async () => {
    const { stub, calls } = stubPrisma('QUALIFIED');
    const result = await designWebsite(stub, { businessId: 'biz-6' });
    expect(result.templateId).toBe('fontaneria-climatizacion');
    expect(result.slug).toBe('santiago-ferrer-fontaneria-en-general-sl-logrono');
    expect(result.statePath).toEqual(['QUALIFIED', 'DESIGNING', 'PREVIEW_READY']);
    expect(result.content.businessName).toBe('Santiago Ferrer Fontanería en General SL');
    expect(result.content.contact.phone).toBe('941227157');
    expect(calls).toEqual(['business.state=DESIGNING', 'business.state=PREVIEW_READY']);
    const upsert = (stub.websiteProject.upsert as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0] as {
      create: { status: string; templateId: string; content: unknown };
    };
    expect(upsert.create.status).toBe('PREVIEW_READY');
    expect(upsert.create.templateId).toBe('fontaneria-climatizacion');
    expect(upsert.create.content).toBeDefined();
    expect((stub.websiteAsset.create as unknown as { mock: { calls: unknown[][] } }).mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('re-designs an AUDIT_FAILED business (fix loop) with its own state path', async () => {
    const { stub, calls } = stubPrisma('AUDIT_FAILED');
    const result = await designWebsite(stub, { businessId: 'biz-6' });
    expect(result.statePath).toEqual(['AUDIT_FAILED', 'DESIGNING', 'PREVIEW_READY']);
    expect(calls).toEqual(['business.state=DESIGNING', 'business.state=PREVIEW_READY']);
  });

  it('refuses a non-QUALIFIED business before any write', async () => {
    const { stub } = stubPrisma('RESEARCHED');
    await expect(designWebsite(stub, { businessId: 'biz-6' })).rejects.toThrow(/expected QUALIFIED/);
    expect(stub.business.update).not.toHaveBeenCalled();
    expect(stub.websiteProject.upsert).not.toHaveBeenCalled();
  });

  it('refuses an unknown business', async () => {
    const { stub } = stubPrisma('QUALIFIED', false);
    await expect(designWebsite(stub, { businessId: 'nope' })).rejects.toThrow(/not found/);
  });

  it('records LLM usage as a UsageRecord with estimated/confirmed kept separate', async () => {
    const { stub } = stubPrisma('QUALIFIED');
    await designWebsite(stub, {
      businessId: 'biz-6',
      llmDraft: { subtitle: 'Santiago Ferrer, fontanería en Logroño.' },
      llmUsage: {
        provider: 'top-tools-ai',
        model: 'Top-Tools-Ai-Basic',
        promptTokens: 120,
        completionTokens: 90,
        estimatedCostCents: 0,
        confirmedCostCents: null,
      },
    });
    const create = (stub.usageRecord.create as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0] as {
      data: { service: string; agentKind: string; estimatedCostCents: number; confirmedCostCents: null };
    };
    expect(create.data.service).toBe('fase-d-generation');
    expect(create.data.agentKind).toBe('designer');
    expect(create.data.estimatedCostCents).toBe(0);
    expect(create.data.confirmedCostCents).toBeNull();
  });
});
