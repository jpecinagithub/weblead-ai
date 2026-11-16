import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@weblead/database';
import {
  approveDraft,
  buildDraftEmail,
  checkLegalBasis,
  classifyReply,
  DEFAULT_PRICE_CONFIG,
  prepareSales,
  quoteProposal,
  suggestedReply,
  validateDraftText,
  type ReplyType,
} from '../src/index.js';

// --- Pricing -----------------------------------------------------------------

describe('pricing (PriceConfiguration, 3 modalidades orientativas)', () => {
  it('BASIC < PRO < PREMIUM with the example defaults', () => {
    const basic = quoteProposal('BASIC', DEFAULT_PRICE_CONFIG);
    const pro = quoteProposal('PRO', DEFAULT_PRICE_CONFIG);
    const premium = quoteProposal('PREMIUM', DEFAULT_PRICE_CONFIG);
    expect(basic.totalCents).toBe(49000);
    expect(pro.totalCents).toBe(99000);
    expect(premium.totalCents).toBe(199000);
    expect(basic.totalCents).toBeLessThan(pro.totalCents);
    expect(pro.totalCents).toBeLessThan(premium.totalCents);
  });

  it('add-ons add up on top of the modality base', () => {
    const q = quoteProposal('PRO', DEFAULT_PRICE_CONFIG, ['logo', 'hosting']);
    expect(q.totalCents).toBe(99000 + 15000 + 12000);
    expect(q.lines.map((l) => l.key)).toEqual(['modality-PRO', 'addon-logo', 'addon-hosting']);
  });

  it('every quote is indicative and carries the non-definitive disclaimer', () => {
    const q = quoteProposal('BASIC', DEFAULT_PRICE_CONFIG);
    expect(q.isIndicative).toBe(true);
    expect(q.disclaimer).toMatch(/NO definitivos/i);
  });

  it('unknown modality / add-on throws', () => {
    expect(() => quoteProposal('ULTRA' as 'BASIC', DEFAULT_PRICE_CONFIG)).toThrow('Unknown proposal modality');
    expect(() => quoteProposal('PRO', DEFAULT_PRICE_CONFIG, ['jetpack'])).toThrow('Unknown price add-on');
  });
});

// --- LSSI legal gate ----------------------------------------------------------

function gateInput(overrides: Record<string, unknown> = {}) {
  return {
    businessId: 'biz-6',
    businessName: 'Santiago Ferrer Fontanería en General SL',
    email: 'sanfefo@terra.com',
    suppressed: false,
    permissions: [] as { basis: string }[],
    ...overrides,
  };
}

describe('LSSI legal gate', () => {
  it('a public email with no basis blocks (public email != authorisation)', () => {
    const d = checkLegalBasis(gateInput());
    expect(d.allowed).toBe(false);
    expect(d.reasonCode).toBe('NO_LEGAL_BASIS');
    expect(d.reason).toMatch(/NO equivale a autorización/);
  });

  it('suppression blocks even with consent', () => {
    const d = checkLegalBasis(gateInput({ suppressed: true, suppressionReason: 'UNSUBSCRIBE', permissions: [{ basis: 'CONSENT' }] }));
    expect(d.allowed).toBe(false);
    expect(d.reasonCode).toBe('SUPPRESSED');
  });

  it('no email blocks with NO_EMAIL', () => {
    const d = checkLegalBasis(gateInput({ email: null }));
    expect(d.allowed).toBe(false);
    expect(d.reasonCode).toBe('NO_EMAIL');
  });

  it('consent allows, with basis CONSENT', () => {
    const d = checkLegalBasis(gateInput({ permissions: [{ basis: 'CONSENT', source: 'formulario web' }] }));
    expect(d.allowed).toBe(true);
    expect(d.basis).toBe('CONSENT');
    expect(d.reasonCode).toBe('OK');
  });

  it('existing relationship allows (LSSI art. 21 exception)', () => {
    const d = checkLegalBasis(gateInput({ permissions: [{ basis: 'EXISTING_RELATIONSHIP', source: 'contrato 2024' }] }));
    expect(d.allowed).toBe(true);
    expect(d.basis).toBe('EXISTING_RELATIONSHIP');
  });

  it('legitimate interest alone is insufficient and blocks', () => {
    const d = checkLegalBasis(gateInput({ permissions: [{ basis: 'LEGITIMATE_INTEREST' }] }));
    expect(d.allowed).toBe(false);
    expect(d.reasonCode).toBe('LEGITIMATE_INTEREST_INSUFFICIENT');
  });
});

// --- Reply classification (8/8, one real example per category) ----------------

const EXAMPLES: { text: string; type: ReplyType }[] = [
  { text: 'Hola, nos interesa mucho la propuesta, ¿cuándo podemos hablar?', type: 'INTERESTED' },
  { text: '¿Cuánto cuesta la web? Necesito un presupuesto.', type: 'REQUEST_PRICE' },
  { text: '¿Me podéis enviar más información sobre qué incluye?', type: 'REQUEST_INFORMATION' },
  { text: '¿Podéis bajar el precio o hacernos un descuento?', type: 'NEGOTIATION' },
  { text: 'Gracias, pero no nos interesa ahora mismo.', type: 'NOT_INTERESTED' },
  { text: 'Por favor, dadme de baja, no quiero recibir más correos.', type: 'UNSUBSCRIBE' },
  { text: 'Esto es spam, os voy a denunciar a la agencia de protección de datos.', type: 'COMPLAINT' },
  { text: 'Recibido, lo reviso la semana que viene y os digo algo.', type: 'OTHER' },
];

describe('reply classification (8 categories)', () => {
  it.each(EXAMPLES)('classifies "$text" as $type', ({ text, type }) => {
    expect(classifyReply(text)).toBe(type);
  });

  it('suggested replies never make economic commitments', () => {
    expect(suggestedReply('REQUEST_PRICE', 'Ferrer')).not.toMatch(/€|\d{3,}/);
    expect(suggestedReply('REQUEST_PRICE', 'Ferrer')).toMatch(/validación humana/);
    expect(suggestedReply('NEGOTIATION', 'Ferrer')).toMatch(/valida una persona/);
    expect(suggestedReply('NEGOTIATION', 'Ferrer')).not.toMatch(/descuento del|rebaja del/i);
    expect(suggestedReply('UNSUBSCRIBE', 'Ferrer')).toMatch(/baja/);
    expect(suggestedReply('COMPLAINT', 'Ferrer')).toMatch(/baja/);
  });
});

// --- Draft text validation -----------------------------------------------------

describe('draft email', () => {
  it('rejects LLM text with invented claims and falls back to deterministic copy', () => {
    expect(validateDraftText('Somos la mejor fontanería, 20 años de experiencia, desde 490 €.')).toEqual(
      expect.arrayContaining([expect.stringMatching(/superlativo/), expect.stringMatching(/años/), expect.stringMatching(/precio/)]),
    );
    const d = buildDraftEmail({
      businessName: 'Ferrer',
      sector: 'fontanería',
      municipality: 'Logroño',
      phone: '941227157',
      demoSlug: 'ferrer',
      modality: 'PRO',
      llmBody: 'Somos la mejor fontanería, 20 años de experiencia.',
    });
    expect(d.llmRejected.length).toBeGreaterThan(0);
    expect(d.body).toMatch(/propuesta conceptual/);
    expect(d.body).not.toMatch(/la mejor/);
  });

  it('accepts clean LLM text', () => {
    const d = buildDraftEmail({
      businessName: 'Ferrer',
      sector: 'fontanería',
      municipality: 'Logroño',
      phone: null,
      demoSlug: 'ferrer',
      modality: 'BASIC',
      llmBody: 'Hola, hemos preparado una demo de su web para que la revise cuando quiera.',
    });
    expect(d.llmRejected).toEqual([]);
    expect(d.body).toContain('demo de su web');
  });
});

// --- prepareSales / approveDraft (stubbed Prisma) -------------------------------

function stubPrisma(opts: { state?: string; permissions?: { basis: string }[]; suppressed?: boolean } = {}) {
  const calls: string[] = [];
  const businessRow = {
    id: 'biz-6',
    name: 'Santiago Ferrer Fontanería en General SL',
    slug: 'santiago-ferrer',
    sector: 'fontanería/climatización',
    municipality: 'Logroño',
    province: 'La Rioja',
    phone: '941227157',
    email: 'sanfefo@terra.com',
    state: opts.state ?? 'APPROVED',
  };
  const stub = {
    business: {
      findUnique: vi.fn(async () => businessRow),
      update: vi.fn(async (args: { data: { state: string } }) => {
        calls.push(`business.state=${args.data.state}`);
        return {};
      }),
    },
    websiteProject: {
      findFirst: vi.fn(async () => ({ id: 'proj-1', slug: 'santiago-ferrer', businessId: 'biz-6' })),
    },
    contactPermission: {
      findMany: vi.fn(async () => opts.permissions ?? []),
    },
    contactSuppression: {
      findMany: vi.fn(async () => (opts.suppressed ? [{ id: 'sup-1', reason: 'UNSUBSCRIBE' }] : [])),
    },
    priceConfiguration: {
      findFirst: vi.fn(async () => null),
      create: vi.fn(async (args: { data: { config: unknown } }) => ({ config: args.data.config })),
    },
    commercialProposal: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => ({ id: 'prop-1', ...args.data })),
    },
    emailDraft: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => ({ id: 'draft-1', ...args.data })),
      findUnique: vi.fn(async () => ({ id: 'draft-1', businessId: 'biz-6', status: 'DRAFT' })),
      update: vi.fn(async () => ({})),
    },
    usageRecord: { create: vi.fn(async () => ({})) },
    cRMActivity: {
      create: vi.fn(async (args: { data: { type: string } }) => {
        calls.push(`activity:${args.data.type}`);
        return { id: 'act-1' };
      }),
    },
  };
  return { stub: stub as unknown as PrismaClient, calls, businessRow };
}

describe('prepareSales (persisted, stubbed Prisma)', () => {
  it('blocks a public email with no basis: internal proposal only, NO draft, stays APPROVED', async () => {
    const { stub, calls } = stubPrisma();
    const result = await prepareSales(stub, { businessId: 'biz-6', modality: 'PRO' });
    expect(result.blocked).toBe(true);
    if (result.blocked) {
      expect(result.draftId).toBeNull();
      expect(result.decision.reasonCode).toBe('NO_LEGAL_BASIS');
      expect(result.businessState).toBe('APPROVED');
      expect(result.quote.totalCents).toBe(99000);
    }
    expect(calls).not.toContain('business.state=SALES_PENDING');
    expect(calls).toContain('activity:PROPOSAL');
  });

  it('blocks a suppressed contact even with consent', async () => {
    const { stub } = stubPrisma({ suppressed: true, permissions: [{ basis: 'CONSENT' }] });
    const result = await prepareSales(stub, { businessId: 'biz-6' });
    expect(result.blocked).toBe(true);
    if (result.blocked) expect(result.decision.reasonCode).toBe('SUPPRESSED');
  });

  it('allows with consent: local draft + APPROVED -> SALES_PENDING', async () => {
    const { stub, calls } = stubPrisma({ permissions: [{ basis: 'CONSENT', source: 'test' }] });
    const result = await prepareSales(stub, { businessId: 'biz-6', modality: 'BASIC' });
    expect(result.blocked).toBe(false);
    if (!result.blocked) {
      expect(result.draftId).toBe('draft-1');
      expect(result.statePath).toEqual(['APPROVED', 'SALES_PENDING']);
      expect(result.decision.basis).toBe('CONSENT');
    }
    expect(calls).toContain('business.state=SALES_PENDING');
    expect(calls).toContain('activity:DRAFT');
  });

  it('refuses a business that is not APPROVED', async () => {
    const { stub } = stubPrisma({ state: 'QUALIFIED' });
    await expect(prepareSales(stub, { businessId: 'biz-6' })).rejects.toThrow('expected APPROVED');
  });
});

describe('approveDraft (human approval, no send)', () => {
  it('DRAFT -> APPROVED and SALES_PENDING -> SALES_APPROVED, with a reminder', async () => {
    const { stub, calls } = stubPrisma({ state: 'SALES_PENDING' });
    const result = await approveDraft(stub, { draftId: 'draft-1' });
    expect(result.businessState).toBe('SALES_APPROVED');
    expect(result.statePath).toEqual(['SALES_PENDING', 'SALES_APPROVED']);
    expect(new Date(result.reminderDueAt).getTime()).toBeGreaterThan(Date.now());
    expect(calls).toContain('business.state=SALES_APPROVED');
    expect(calls).toContain('activity:APPROVAL');
    expect(calls).toContain('activity:REMINDER');
  });
});
