/**
 * Sales agent — Fase E (master prompt §4, instrucciones §7 + §11 Fase E).
 *
 * What it does:
 * - Configurable pricing (PriceConfiguration in Postgres) with three
 *   indicative modalities BASIC / PRO / PREMIUM. Default prices are
 *   EXAMPLE values only, clearly marked non-definitive: without validation
 *   a quote is never a final offer.
 * - CommercialProposal per APPROVED business, built from its demo + dossier.
 * - Personalised email ONLY as a LOCAL draft (EmailDraft in Postgres).
 *   NEVER sends: there is no send call anywhere in this package, and the
 *   Gmail integration (packages/integrations) is a not_connected stub.
 * - LSSI legal gate (see checkLegalBasis): a public email address is NOT
 *   authorisation. Without a valid basis the result is a documented block
 *   (internal proposal only, contact marked not authorised, NO draft).
 * - Reply classification into the 8 master-prompt categories, with
 *   suggested replies that never make economic commitments automatically.
 *
 * Flow (validated through the shared state machine):
 *   APPROVED -> SALES_PENDING (prepare: proposal + local draft ready)
 *   SALES_PENDING -> SALES_APPROVED (approve: human admin approval, no send)
 * CONTACTED is NOT reachable in this phase: it implies a real send, and
 * nothing is sent until Jon approves a real send with a legal basis.
 */
import { stubAgent, type Agent } from '@weblead/agent-core';
import type { PrismaClient } from '@weblead/database';
import { assertTransition, type BusinessState, type ReplyType } from '@weblead/shared';

export const salesAgent: Agent = stubAgent('sales', 'Sales');

export type ProposalModality = 'BASIC' | 'PRO' | 'PREMIUM';

export const PROPOSAL_MODALITIES: readonly ProposalModality[] = ['BASIC', 'PRO', 'PREMIUM'];

/** One priced line of a quote (all amounts in euro cents). */
export type QuoteLine = { key: string; label: string; cents: number };

export type PriceConfig = {
  currency: string;
  /** Shown on every quote: these are example values, not a final offer. */
  disclaimer: string;
  modalities: Record<
    ProposalModality,
    { label: string; baseCents: number; pages: number; includes: string[] }
  >;
  addons: Record<string, { label: string; cents: number }>;
};

/**
 * Default pricing — EXAMPLE values only, configurable in Postgres
 * (PriceConfiguration "default-v1"). They are NOT definitive prices and
 * must be validated by Jon before any of them is quoted as an offer.
 */
export const DEFAULT_PRICE_CONFIG: PriceConfig = {
  currency: 'EUR',
  disclaimer:
    'Precios orientativos de ejemplo, configurables y NO definitivos. ' +
    'Sin validación expresa no constituyen una oferta: la propuesta es interna ' +
    'hasta que Jon la revise y la apruebe.',
  modalities: {
    BASIC: {
      label: 'Básica',
      baseCents: 49000,
      pages: 5,
      includes: ['Web corporativa responsive (hasta 5 páginas)', 'Formulario de contacto', 'SEO básico'],
    },
    PRO: {
      label: 'Profesional',
      baseCents: 99000,
      pages: 10,
      includes: [
        'Web corporativa responsive (hasta 10 páginas)',
        'Formulario de contacto',
        'SEO local',
        'Galería y blog',
      ],
    },
    PREMIUM: {
      label: 'Premium',
      baseCents: 199000,
      pages: 20,
      includes: [
        'Web a medida (hasta 20 páginas)',
        'Reservas o presupuesto online',
        'Integraciones (WhatsApp, mapas, redes)',
        'SEO avanzado y mantenimiento 12 meses',
      ],
    },
  },
  addons: {
    logo: { label: 'Logotipo conceptual', cents: 15000 },
    images: { label: 'Banco de imágenes con licencia', cents: 9000 },
    booking: { label: 'Sistema de reservas', cents: 25000 },
    maintenance: { label: 'Mantenimiento mensual', cents: 4900 },
    hosting: { label: 'Alojamiento + dominio (anual)', cents: 12000 },
  },
};

export type Quote = {
  modality: ProposalModality;
  currency: string;
  lines: QuoteLine[];
  totalCents: number;
  /** Always true: quotes are indicative until validated. */
  isIndicative: true;
  disclaimer: string;
};

/** Pure pricing: modality base + selected add-ons, from a PriceConfiguration. */
export function quoteProposal(
  modality: ProposalModality,
  config: PriceConfig,
  addonKeys: string[] = [],
): Quote {
  const m = config.modalities[modality];
  if (!m) throw new Error(`Unknown proposal modality: ${modality}.`);
  const lines: QuoteLine[] = [
    { key: `modality-${modality}`, label: `Modalidad ${m.label} (hasta ${m.pages} páginas)`, cents: m.baseCents },
  ];
  for (const key of addonKeys) {
    const addon = config.addons[key];
    if (!addon) throw new Error(`Unknown price add-on: ${key}.`);
    lines.push({ key: `addon-${key}`, label: addon.label, cents: addon.cents });
  }
  return {
    modality,
    currency: config.currency,
    lines,
    totalCents: lines.reduce((sum, line) => sum + line.cents, 0),
    isIndicative: true,
    disclaimer: config.disclaimer,
  };
}

/** The stored default configuration row (seeded by prepareSales if absent). */
export const DEFAULT_PRICE_CONFIG_NAME = 'default-v1';

export async function ensureDefaultPriceConfig(prisma: PrismaClient): Promise<PriceConfig> {
  const existing = await prisma.priceConfiguration.findFirst({
    where: { name: DEFAULT_PRICE_CONFIG_NAME },
  });
  if (existing) return existing.config as unknown as PriceConfig;
  const created = await prisma.priceConfiguration.create({
    data: { name: DEFAULT_PRICE_CONFIG_NAME, config: DEFAULT_PRICE_CONFIG as unknown as object, active: true },
  });
  return created.config as unknown as PriceConfig;
}

// ---------------------------------------------------------------------------
// LSSI legal gate (master prompt §4, instrucciones §7)
// ---------------------------------------------------------------------------

/** Bases that authorise a commercial email under LSSI art. 21. */
export type LegalBasis = 'CONSENT' | 'EXISTING_RELATIONSHIP';

export type LegalReasonCode =
  | 'OK'
  | 'SUPPRESSED'
  | 'NO_EMAIL'
  | 'NO_LEGAL_BASIS'
  | 'LEGITIMATE_INTEREST_INSUFFICIENT';

export type LegalDecision = {
  allowed: boolean;
  basis: LegalBasis | null;
  reasonCode: LegalReasonCode;
  reason: string;
  /** Human-readable audit trail of every check the gate ran. */
  checks: string[];
};

export type LegalGateInput = {
  businessId: string;
  businessName: string;
  email: string | null;
  suppressed: boolean;
  suppressionReason?: string | null;
  permissions: { basis: string; source?: string | null; notes?: string | null }[];
};

/**
 * The legal gate. Order matters: suppression first, then contactability,
 * then the basis. A public email address is NEVER authorisation on its own
 * (LSSI art. 21: commercial email needs prior consent, except an existing
 * contractual relationship for similar products/services). Legitimate
 * interest alone does NOT authorise an unsolicited commercial email here:
 * it is recorded as insufficient and blocks, with the reason spelled out.
 */
export function checkLegalBasis(input: LegalGateInput): LegalDecision {
  const checks: string[] = [];
  if (input.suppressed) {
    checks.push(
      `Baja/oposición registrada${input.suppressionReason ? ` (${input.suppressionReason})` : ''}: contacto bloqueado.`,
    );
    return {
      allowed: false,
      basis: null,
      reasonCode: 'SUPPRESSED',
      reason:
        'La empresa (o su correo) está en la lista de bajas/oposición. No se puede preparar ningún borrador de envío.',
      checks,
    };
  }
  checks.push('Sin baja ni oposición registrada.');
  if (!input.email) {
    checks.push('Sin correo electrónico en el expediente: no hay destinatario.');
    return {
      allowed: false,
      basis: null,
      reasonCode: 'NO_EMAIL',
      reason: 'No hay correo electrónico en el expediente: no hay destinatario al que preparar un envío.',
      checks,
    };
  }
  checks.push(`Correo en el expediente: ${input.email} (un correo público NO equivale a autorización).`);
  const consent = input.permissions.find((p) => p.basis === 'CONSENT');
  if (consent) {
    checks.push(`Consentimiento registrado${consent.source ? ` (fuente: ${consent.source})` : ''}.`);
    return {
      allowed: true,
      basis: 'CONSENT',
      reasonCode: 'OK',
      reason: 'Base jurídica válida: consentimiento registrado.',
      checks,
    };
  }
  const relationship = input.permissions.find((p) => p.basis === 'EXISTING_RELATIONSHIP');
  if (relationship) {
    checks.push(
      `Relación existente registrada${relationship.source ? ` (fuente: ${relationship.source})` : ''}.`,
    );
    return {
      allowed: true,
      basis: 'EXISTING_RELATIONSHIP',
      reasonCode: 'OK',
      reason:
        'Base jurídica válida: relación contractual previa para productos/servicios similares (excepción LSSI art. 21).',
      checks,
    };
  }
  if (input.permissions.some((p) => p.basis === 'LEGITIMATE_INTEREST')) {
    checks.push('Solo hay interés legítimo registrado: insuficiente para email comercial no solicitado (LSSI art. 21).');
    return {
      allowed: false,
      basis: null,
      reasonCode: 'LEGITIMATE_INTEREST_INSUFFICIENT',
      reason:
        'El interés legítimo por sí solo no autoriza un correo comercial no solicitado según la LSSI (art. 21): hace falta consentimiento previo o una relación contractual existente. No se prepara borrador.',
      checks,
    };
  }
  checks.push('Sin consentimiento ni relación existente registrados.');
  return {
    allowed: false,
    basis: null,
    reasonCode: 'NO_LEGAL_BASIS',
    reason:
      'Sin base jurídica válida: el correo es público pero un correo público NO equivale a autorización (LSSI art. 21). ' +
      'La oportunidad y la propuesta quedan como internas; el contacto queda marcado como no autorizado y NO se prepara borrador de envío.',
    checks,
  };
}

// ---------------------------------------------------------------------------
// Draft email (deterministic; LLM text only as an optional, validated polish)
// ---------------------------------------------------------------------------

const FORBIDDEN_DRAFT_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /€\s?\d|\d+\s?€/, label: 'precio en euros (la propuesta lleva los importes orientativos, el correo no cierra precios)' },
  { pattern: /24\s?h/i, label: 'urgencia 24h' },
  { pattern: /la mejor|líder( del)?( en)?|nº ?1/i, label: 'superlativo sin respaldo' },
  { pattern: /\d+\s?años de experiencia/i, label: 'años de experiencia sin contrastar' },
  { pattern: /testimonio|nuestros clientes (dicen|opinan)|miles de clientes/i, label: 'testimonio/clientes sin fuente' },
  { pattern: /garantiz|100 ?% garantizado/i, label: 'garantía no contrastada' },
];

/** Rejects LLM-drafted text that invents claims; returns the violations. */
export function validateDraftText(text: string): string[] {
  return FORBIDDEN_DRAFT_PATTERNS.filter((f) => f.pattern.test(text)).map((f) => f.label);
}

export type DraftInput = {
  businessName: string;
  sector: string | null;
  municipality: string | null;
  phone: string | null;
  demoSlug: string;
  modality: ProposalModality;
  /** Optional LLM-polished body; rejected (with fallback) if it invents claims. */
  llmBody?: string | null;
};

export function buildDraftEmail(input: DraftInput): { subject: string; body: string; llmRejected: string[] } {
  const subject = `Propuesta web para ${input.businessName} — demo lista para revisar`;
  const demoLine = `Hemos preparado una propuesta conceptual de página web para ${input.businessName} ` +
    `(${input.sector ?? 'empresa local'}${input.municipality ? `, ${input.municipality}` : ''}), ` +
    `pensada para empresas sin web propia. Puede ver la demo aquí: /demos/${input.demoSlug}`;
  const deterministicBody =
    `Hola,\n\n${demoLine}.\n\n` +
    `La demo es una propuesta conceptual independiente, no oficial y pendiente de su autorización: ` +
    `no es su web contratada. Si le interesa, le preparamos una propuesta con la modalidad ` +
    `${input.modality} y los detalles de su negocio, sin compromiso.\n\n` +
    `${input.phone ? `Puede contactarnos respondiendo a este correo o por teléfono. Su teléfono público es ${input.phone}.\n\n` : ''}` +
    `Un saludo,\nWebLead AI — Agencia digital (propuesta pendiente de autorización de la empresa)`;
  let llmRejected: string[] = [];
  let body = deterministicBody;
  if (input.llmBody) {
    llmRejected = validateDraftText(input.llmBody);
    if (llmRejected.length === 0) body = input.llmBody;
  }
  return { subject, body, llmRejected };
}

// ---------------------------------------------------------------------------
// Reply classification (master prompt §4: 8 categories)
// ---------------------------------------------------------------------------

const REPLY_SIGNALS: { type: ReplyType; patterns: RegExp[] }[] = [
  {
    type: 'UNSUBSCRIBE',
    patterns: [/darse de baja|darme de baja|eliminadme|no quiero recibir|no me enviéis|borradme|baja de/i],
  },
  {
    type: 'COMPLAINT',
    patterns: [/denuncia|reclamaci.n|os voy a denunciar|esto es spam|spam|inaceptable|queja formal/i],
  },
  {
    type: 'NOT_INTERESTED',
    patterns: [/no (nos|me) interesa|no estamos interesados|no gracias|no nos hace falta|no lo necesitamos/i],
  },
  {
    type: 'NEGOTIATION',
    patterns: [/descuento|rebaja|negociar|podéis bajar|más barato|precio más bajo|ajustar el precio|oferta mejor/i],
  },
  {
    type: 'REQUEST_PRICE',
    patterns: [/cuánto cuesta|cuánto vale|precio|presupuesto|cuánto costaría|tarifa/i],
  },
  {
    type: 'REQUEST_INFORMATION',
    patterns: [/más información|más detalles|qué incluye|en qué consiste|cómo funciona|podéis explicarme/i],
  },
  {
    type: 'INTERESTED',
    patterns: [/me interesa|nos interesa|nos gusta|queremos|adelante|me parece bien|cuándo (podemos|empezamos)|llamadme/i],
  },
];

/** Keyword-based classifier over the 8 master-prompt categories. Deterministic; no LLM call. */
export function classifyReply(text: string): ReplyType {
  const normalised = text.toLowerCase();
  for (const signal of REPLY_SIGNALS) {
    if (signal.patterns.some((p) => p.test(normalised))) return signal.type;
  }
  return 'OTHER';
}

/**
 * Suggested reply per category. Never an economic commitment: prices,
 * discounts and contracts are never promised here — they always go back
 * to human approval. UNSUBSCRIBE / COMPLAINT always confirm removal and
 * stop contact.
 */
export function suggestedReply(type: ReplyType, businessName: string): string {
  switch (type) {
    case 'INTERESTED':
      return (
        `Gracias por su interés, ${businessName}. Le preparamos la propuesta detallada ` +
        `con la demo y los siguientes pasos, y quedamos a su disposición para resolver cualquier duda. ` +
        `(Borrador sugerido: revisar por un humano antes de enviar; sin compromisos económicos automáticos.)`
      );
    case 'REQUEST_PRICE':
      return (
        `Gracias por su mensaje, ${businessName}. Los importes de nuestra propuesta son orientativos y ` +
        `dependen del alcance final; le preparamos un presupuesto detallado para su revisión. ` +
        `Ningún precio es definitivo hasta validación humana.`
      );
    case 'REQUEST_INFORMATION':
      return (
        `Gracias por su mensaje, ${businessName}. Le enviamos más información sobre la demo y sobre ` +
        `cómo sería su web: qué incluye cada modalidad y cuáles serían los siguientes pasos.`
      );
    case 'NEGOTIATION':
      return (
        `Gracias por su mensaje, ${businessName}. Tomamos nota de su propuesta y la revisamos ` +
        `internamente: cualquier ajuste de precio o alcance lo valida una persona antes de confirmarlo.`
      );
    case 'NOT_INTERESTED':
      return (
        `Gracias por su respuesta, ${businessName}. No insistiremos: cerramos esta oportunidad ` +
        `y no volveremos a contactarle por este tema salvo que usted nos lo pida.`
      );
    case 'UNSUBSCRIBE':
      return (
        `Entendido, ${businessName}: le damos de baja de inmediato y no volverá a recibir ` +
        `comunicaciones comerciales nuestras. Lamentamos las molestias.`
      );
    case 'COMPLAINT':
      return (
        `Lamentamos mucho las molestias, ${businessName}. Damos de baja su contacto de inmediato, ` +
        `revisamos lo ocurrido y escalamos su mensaje a la persona responsable. No volveremos a contactarle.`
      );
    case 'OTHER':
    default:
      return (
        `Gracias por su mensaje, ${businessName}. Lo revisamos y le respondemos ` +
        `a la mayor brevedad.`
      );
  }
}

// ---------------------------------------------------------------------------
// Prepare + approve (persisted)
// ---------------------------------------------------------------------------

export type LlmUsageInput = {
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCostCents: number;
  confirmedCostCents: number | null;
};

export type PrepareSalesOptions = {
  businessId: string;
  modality?: ProposalModality;
  addonKeys?: string[];
  /** Optional LLM-polished draft body (validated; rejected → deterministic). */
  llmBody?: string | null;
  llmUsage?: LlmUsageInput | null;
};

export type PrepareSalesResult =
  | {
      blocked: true;
      businessId: string;
      businessState: string;
      proposalId: string;
      draftId: null;
      decision: LegalDecision;
      quote: Quote;
    }
  | {
      blocked: false;
      businessId: string;
      businessState: 'SALES_PENDING';
      proposalId: string;
      draftId: string;
      decision: LegalDecision;
      quote: Quote;
      statePath: BusinessState[];
      llmRejected: string[];
    };

async function logActivity(
  prisma: PrismaClient,
  businessId: string,
  type: string,
  note: string,
  dueAt?: Date | null,
): Promise<void> {
  await prisma.cRMActivity.create({ data: { businessId, type, note, dueAt: dueAt ?? null } });
}

/**
 * Prepares the commercial proposal for an APPROVED business.
 * Always creates the internal CommercialProposal. The local EmailDraft is
 * created ONLY when the LSSI gate allows it; otherwise the result is a
 * documented block (no draft, contact marked not authorised) and the
 * business stays APPROVED. Never sends anything.
 */
export async function prepareSales(
  prisma: PrismaClient,
  opts: PrepareSalesOptions,
): Promise<PrepareSalesResult> {
  const modality = opts.modality ?? 'PRO';
  const business = await prisma.business.findUnique({ where: { id: opts.businessId } });
  if (!business) throw new Error(`Business ${opts.businessId} not found.`);
  if (business.state !== 'APPROVED') {
    throw new Error(
      `Cannot prepare a sales proposal for a business in state ${business.state}: expected APPROVED (audited demo).`,
    );
  }
  const [project, permissions, suppressions] = await Promise.all([
    prisma.websiteProject.findFirst({
      where: { businessId: business.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.contactPermission.findMany({ where: { businessId: business.id } }),
    prisma.contactSuppression.findMany({
      where: { OR: [{ businessId: business.id }, { email: business.email ?? '' }] },
    }),
  ]);
  if (!project) throw new Error(`Business ${business.name} has no website demo yet: cannot prepare a proposal.`);

  const config = await ensureDefaultPriceConfig(prisma);
  const quote = quoteProposal(modality, config, opts.addonKeys ?? []);
  const decision = checkLegalBasis({
    businessId: business.id,
    businessName: business.name,
    email: business.email,
    suppressed: suppressions.length > 0,
    suppressionReason: suppressions[0]?.reason ?? null,
    permissions: permissions.map((p) => ({ basis: p.basis, source: p.source, notes: p.notes })),
  });

  const proposalContent = {
    quote,
    demoSlug: project.slug,
    demoUrl: `/demos/${project.slug}`,
    businessName: business.name,
    sector: business.sector,
    legal: decision,
    isIndicative: true,
  };
  const proposal = await prisma.commercialProposal.create({
    data: {
      businessId: business.id,
      modality,
      priceCents: quote.totalCents,
      currency: quote.currency,
      status: 'DRAFT',
      content: proposalContent as unknown as object,
    },
  });
  await logActivity(
    prisma,
    business.id,
    'PROPOSAL',
    `Propuesta interna ${modality} preparada (${(quote.totalCents / 100).toFixed(2)} € orientativos, no definitivos). ` +
      (decision.allowed
        ? `Base legal: ${decision.basis}.`
        : `BLOQUEO LEGAL (${decision.reasonCode}): ${decision.reason}`),
  );

  if (!decision.allowed) {
    return {
      blocked: true,
      businessId: business.id,
      businessState: business.state,
      proposalId: proposal.id,
      draftId: null,
      decision,
      quote,
    };
  }

  const draft = buildDraftEmail({
    businessName: business.name,
    sector: business.sector,
    municipality: business.municipality,
    phone: business.phone,
    demoSlug: project.slug,
    modality,
    llmBody: opts.llmBody ?? null,
  });
  const draftRow = await prisma.emailDraft.create({
    data: {
      businessId: business.id,
      subject: draft.subject,
      body: draft.body,
      status: 'DRAFT',
      legalBasis: decision.basis,
      legalReason: decision.reason,
    },
  });
  if (opts.llmUsage) {
    await prisma.usageRecord.create({
      data: {
        provider: opts.llmUsage.provider,
        service: 'fase-e-sales-draft',
        agentKind: 'sales',
        model: opts.llmUsage.model,
        tokensPrompt: opts.llmUsage.promptTokens,
        tokensCompletion: opts.llmUsage.completionTokens,
        estimatedCostCents: opts.llmUsage.estimatedCostCents,
        confirmedCostCents: opts.llmUsage.confirmedCostCents,
        businessId: business.id,
      },
    });
  }
  await logActivity(
    prisma,
    business.id,
    'DRAFT',
    `Borrador LOCAL creado (id ${draftRow.id.slice(0, 8)}…): sin envío. Base legal: ${decision.basis}.` +
      (draft.llmRejected.length > 0 ? ` Texto LLM rechazado (${draft.llmRejected.join('; ')}): usado texto determinista.` : ''),
  );
  const statePath: BusinessState[] = ['APPROVED'];
  const next = assertTransition(business.state as BusinessState, 'SALES_PENDING');
  statePath.push(next);
  await prisma.business.update({ where: { id: business.id }, data: { state: next } });
  return {
    blocked: false,
    businessId: business.id,
    businessState: 'SALES_PENDING',
    proposalId: proposal.id,
    draftId: draftRow.id,
    decision,
    quote,
    statePath,
    llmRejected: draft.llmRejected,
  };
}

export type ApproveDraftResult = {
  draftId: string;
  businessId: string;
  businessState: 'SALES_APPROVED';
  statePath: BusinessState[];
  reminderDueAt: string;
};

/**
 * Human admin approval of a local draft. Approves the draft AND moves the
 * business SALES_PENDING -> SALES_APPROVED. This is NOT a send: the draft
 * stays local, and a reminder is logged (decide on a real send later, with
 * a legal basis — CONTACTED stays unreachable until then).
 */
export async function approveDraft(
  prisma: PrismaClient,
  opts: { draftId: string; approvedBy?: string | null },
): Promise<ApproveDraftResult> {
  const draft = await prisma.emailDraft.findUnique({ where: { id: opts.draftId } });
  if (!draft) throw new Error(`Draft ${opts.draftId} not found.`);
  if (draft.status !== 'DRAFT') {
    throw new Error(`Cannot approve a draft in status ${draft.status}: expected DRAFT.`);
  }
  if (!draft.businessId) throw new Error(`Draft ${opts.draftId} has no business attached.`);
  const business = await prisma.business.findUnique({ where: { id: draft.businessId } });
  if (!business) throw new Error(`Business ${draft.businessId} not found.`);
  if (business.state !== 'SALES_PENDING') {
    throw new Error(
      `Cannot approve a draft for a business in state ${business.state}: expected SALES_PENDING.`,
    );
  }
  await prisma.emailDraft.update({
    where: { id: draft.id },
    data: { status: 'APPROVED', approvedById: opts.approvedBy ?? null },
  });
  const statePath: BusinessState[] = ['SALES_PENDING'];
  const next = assertTransition(business.state as BusinessState, 'SALES_APPROVED');
  statePath.push(next);
  await prisma.business.update({ where: { id: business.id }, data: { state: next } });
  const reminderDueAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await logActivity(
    prisma,
    business.id,
    'APPROVAL',
    `Borrador aprobado por humano (sin envío): queda pendiente decidir un envío real con base legal. CONTACTED inalcanzable hasta entonces.`,
  );
  await logActivity(
    prisma,
    business.id,
    'REMINDER',
    `Recordatorio: borrador aprobado sin enviar para ${business.name}. Decidir envío real (Jon) o archivar.`,
    reminderDueAt,
  );
  return {
    draftId: draft.id,
    businessId: business.id,
    businessState: 'SALES_APPROVED',
    statePath,
    reminderDueAt: reminderDueAt.toISOString(),
  };
}
