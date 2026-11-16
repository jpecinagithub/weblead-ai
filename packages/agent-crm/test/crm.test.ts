import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@weblead/database';
import {
  buildPipelineRow,
  crmStateForBusiness,
  dueReminders,
  pipelineStats,
  suppressContact,
  type PipelineRow,
} from '../src/index.js';

describe('CRM pipeline mapping (13 states, master prompt §5)', () => {
  it.each([
    ['DISCOVERED', 'NEW'],
    ['RESEARCHING', 'NEW'],
    ['RESEARCHED', 'NEW'],
    ['QUALIFIED', 'QUALIFIED'],
    ['DESIGNING', 'DEMO_CREATED'],
    ['PREVIEW_READY', 'DEMO_CREATED'],
    ['AUDITING', 'DEMO_CREATED'],
    ['AUDIT_FAILED', 'DEMO_CREATED'],
    ['APPROVED', 'AUDITED'],
    ['SALES_PENDING', 'PROPOSAL_READY'],
    ['SALES_APPROVED', 'AWAITING_APPROVAL'],
    ['CONTACTED', 'CONTACTED'],
    ['REPLIED', 'RESPONDED'],
    ['NEGOTIATION', 'NEGOTIATION'],
    ['WON', 'CUSTOMER'],
    ['LOST', 'LOST'],
    ['REJECTED', 'LOST'],
  ] as const)('%s -> %s', (orchestrator, crm) => {
    expect(crmStateForBusiness(orchestrator, { suppressed: false })).toBe(crm);
  });

  it('suppression overrides every other state', () => {
    expect(crmStateForBusiness('SALES_APPROVED', { suppressed: true })).toBe('SUPPRESSED');
    expect(crmStateForBusiness('WON', { suppressed: true })).toBe('SUPPRESSED');
  });
});

function row(crmState: PipelineRow['crmState'], name: string): PipelineRow {
  const orchestrator =
    (
      {
        NEW: 'DISCOVERED',
        QUALIFIED: 'QUALIFIED',
        DEMO_CREATED: 'DESIGNING',
        AUDITED: 'APPROVED',
        PROPOSAL_READY: 'SALES_PENDING',
        AWAITING_APPROVAL: 'SALES_APPROVED',
        CONTACTED: 'CONTACTED',
        RESPONDED: 'REPLIED',
        INTERESTED: 'REPLIED',
        NEGOTIATION: 'NEGOTIATION',
        CUSTOMER: 'WON',
        LOST: 'LOST',
        SUPPRESSED: 'APPROVED',
      } as const
    )[crmState] ?? 'DISCOVERED';
  return buildPipelineRow({
    businessId: `biz-${name}`,
    name,
    sector: null,
    orchestratorState: orchestrator,
    email: null,
    suppressed: crmState === 'SUPPRESSED',
    draftId: crmState === 'AWAITING_APPROVAL' ? 'draft-1' : null,
    draftStatus: crmState === 'AWAITING_APPROVAL' ? 'APPROVED' : null,
  });
}

describe('pipeline stats', () => {
  it('counts per state and computes funnel conversion', () => {
    const rows = [
      row('NEW', 'a'),
      row('QUALIFIED', 'b'),
      row('AUDITED', 'c'),
      row('AWAITING_APPROVAL', 'd'),
      row('SUPPRESSED', 'e'),
    ];
    const stats = pipelineStats(rows);
    expect(stats.total).toBe(5);
    expect(stats.byState.NEW).toBe(1);
    expect(stats.byState.AUDITED).toBe(1);
    expect(stats.byState.SUPPRESSED).toBe(1);
    expect(stats.suppressed).toBe(1);
    expect(stats.awaitingApproval).toBe(1);
    expect(stats.remindersDue).toBe(1);
    // Funnel: 3/5 reached QUALIFIED or beyond, 2/5 AUDITED or beyond, 1/5 AWAITING_APPROVAL.
    expect(stats.conversion.qualified).toBe(60);
    expect(stats.conversion.audited).toBe(40);
    expect(stats.conversion.awaitingApproval).toBe(20);
    expect(stats.conversion.customer).toBe(0);
  });

  it('empty pipeline is 0 everywhere, no NaN', () => {
    const stats = pipelineStats([]);
    expect(stats.total).toBe(0);
    expect(Object.values(stats.conversion).every((v) => v === 0)).toBe(true);
  });
});

describe('reminders', () => {
  it('an AWAITING_APPROVAL business produces a follow-up reminder', () => {
    const rows = [row('AWAITING_APPROVAL', 'd'), row('AUDITED', 'c')];
    const reminders = dueReminders(rows, [
      { businessId: 'biz-d', type: 'REMINDER', note: 'Decidir envío.', dueAt: new Date('2026-11-23T00:00:00Z') },
    ]);
    expect(reminders).toHaveLength(1);
    expect(reminders[0].businessName).toBe('d');
    expect(reminders[0].dueAt).toBe('2026-11-23T00:00:00.000Z');
    expect(reminders[0].note).toMatch(/Decidir envío/);
  });
});

describe('suppressContact', () => {
  it('creates the suppression and logs the history', async () => {
    const calls: string[] = [];
    const stub = {
      business: { findUnique: vi.fn(async () => ({ id: 'biz-6', email: 'sanfefo@terra.com' })) },
      contactSuppression: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async (args: { data: Record<string, unknown> }) => ({ id: 'sup-1', ...args.data })),
      },
      cRMActivity: {
        create: vi.fn(async (args: { data: { type: string } }) => {
          calls.push(args.data.type);
          return { id: 'act-1' };
        }),
      },
    } as unknown as PrismaClient;
    const result = await suppressContact(stub, { businessId: 'biz-6', reason: 'UNSUBSCRIBE' });
    expect(result.suppressionId).toBe('sup-1');
    expect(result.email).toBe('sanfefo@terra.com');
    expect(result.reason).toBe('UNSUBSCRIBE');
    expect(calls).toContain('SUPPRESSION');
  });

  it('is idempotent for an already-suppressed email (no duplicate row)', async () => {
    const create = vi.fn();
    const stub = {
      business: { findFirst: vi.fn(async () => null) },
      contactSuppression: {
        findUnique: vi.fn(async () => ({ id: 'sup-old', email: 'a@b.es', reason: 'UNSUBSCRIBE' })),
        create,
      },
      cRMActivity: { create: vi.fn(async () => ({ id: 'act-1' })) },
    } as unknown as PrismaClient;
    const result = await suppressContact(stub, { email: 'a@b.es', reason: 'UNSUBSCRIBE' });
    expect(result.suppressionId).toBe('sup-old');
    expect(create).not.toHaveBeenCalled();
  });

  it('requires a target and a reason', async () => {
    const stub = {} as PrismaClient;
    await expect(suppressContact(stub, { reason: 'UNSUBSCRIBE' })).rejects.toThrow('businessId or email');
    await expect(suppressContact(stub, { email: 'a@b.es', reason: '' })).rejects.toThrow('reason');
  });
});
