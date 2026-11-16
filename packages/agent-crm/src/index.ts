/**
 * CRM agent — Fase E (master prompt §5, instrucciones §7 + §11 Fase E).
 *
 * Pipeline with the 13 exact master-prompt states (NEW, QUALIFIED,
 * DEMO_CREATED, AUDITED, PROPOSAL_READY, AWAITING_APPROVAL, CONTACTED,
 * RESPONDED, INTERESTED, NEGOTIATION, CUSTOMER, LOST, SUPPRESSED),
 * derived from the orchestrator state + proposals/drafts/suppressions —
 * never stored as a second, drifting source of truth.
 *
 * Full interaction history (CRMActivity), reminders for approved-but-unsent
 * drafts, conversion stats per state, and suppression handling:
 * SUPPRESSED blocks any future draft (the sales gate checks it first).
 *
 * CONTACTED is documented as unreachable in this phase: it implies a real
 * send, and nothing is sent in Fase E.
 */
import { stubAgent, type Agent } from '@weblead/agent-core';
import type { PrismaClient } from '@weblead/database';
import { CRM_STATES, type BusinessState, type CrmState } from '@weblead/shared';

export const crmAgent: Agent = stubAgent('crm', 'CRM / Customer Success');

export { CRM_STATES };
export type { CrmState };

/**
 * Derives the CRM pipeline state from the orchestrator state.
 * Suppression overrides everything. INTERESTED / RESPONDED / NEGOTIATION /
 * CUSTOMER / LOST beyond the orchestrator's own states are reached only
 * when a real reply is recorded (see recordReply); in Fase E no reply
 * exists, so live rows land on NEW … AWAITING_APPROVAL.
 */
export function crmStateForBusiness(
  orchestratorState: BusinessState,
  opts: { suppressed: boolean; hasProposal?: boolean; hasApprovedDraft?: boolean } = { suppressed: false },
): CrmState {
  if (opts.suppressed) return 'SUPPRESSED';
  switch (orchestratorState) {
    case 'DISCOVERED':
    case 'RESEARCHING':
    case 'RESEARCHED':
      return 'NEW';
    case 'REJECTED':
    case 'LOST':
      return 'LOST';
    case 'QUALIFIED':
      return 'QUALIFIED';
    case 'DESIGNING':
    case 'PREVIEW_READY':
    case 'AUDITING':
    case 'AUDIT_FAILED':
      return 'DEMO_CREATED';
    case 'APPROVED':
      return 'AUDITED';
    case 'SALES_PENDING':
      return 'PROPOSAL_READY';
    case 'SALES_APPROVED':
      return 'AWAITING_APPROVAL';
    case 'CONTACTED':
      return 'CONTACTED';
    case 'REPLIED':
      return 'RESPONDED';
    case 'NEGOTIATION':
      return 'NEGOTIATION';
    case 'WON':
      return 'CUSTOMER';
    case 'ARCHIVED':
      return 'LOST';
    default:
      return 'NEW';
  }
}

export type PipelineRowInput = {
  businessId: string;
  name: string;
  sector: string | null;
  orchestratorState: BusinessState;
  email: string | null;
  suppressed: boolean;
  suppressionReason?: string | null;
  proposalModality?: string | null;
  proposalTotalCents?: number | null;
  draftId?: string | null;
  draftStatus?: string | null;
  legalReasonCode?: string | null;
  legalAllowed?: boolean | null;
};

export type PipelineRow = PipelineRowInput & { crmState: CrmState };

export function buildPipelineRow(input: PipelineRowInput): PipelineRow {
  return {
    ...input,
    crmState: crmStateForBusiness(input.orchestratorState, { suppressed: input.suppressed }),
  };
}

export type PipelineStats = {
  total: number;
  byState: Record<string, number>;
  /** Share of businesses that reached each funnel step (of total). */
  conversion: Record<string, number>;
  suppressed: number;
  awaitingApproval: number;
  /** Approved drafts with no send: the follow-up queue. */
  remindersDue: number;
};

/** Pure stats over pipeline rows (no DB). */
export function pipelineStats(rows: PipelineRow[]): PipelineStats {
  const byState: Record<string, number> = Object.fromEntries(CRM_STATES.map((s) => [s, 0]));
  for (const row of rows) byState[row.crmState] = (byState[row.crmState] ?? 0) + 1;
  const total = rows.length;
  const pct = (n: number): number => (total === 0 ? 0 : Math.round((n / total) * 1000) / 10);
  const atLeast = (states: CrmState[]): number => rows.filter((r) => states.includes(r.crmState)).length;
  const conversion: Record<string, number> = {
    qualified: pct(atLeast(['QUALIFIED', 'DEMO_CREATED', 'AUDITED', 'PROPOSAL_READY', 'AWAITING_APPROVAL', 'CONTACTED', 'RESPONDED', 'INTERESTED', 'NEGOTIATION', 'CUSTOMER'])),
    demoCreated: pct(atLeast(['DEMO_CREATED', 'AUDITED', 'PROPOSAL_READY', 'AWAITING_APPROVAL', 'CONTACTED', 'RESPONDED', 'INTERESTED', 'NEGOTIATION', 'CUSTOMER'])),
    audited: pct(atLeast(['AUDITED', 'PROPOSAL_READY', 'AWAITING_APPROVAL', 'CONTACTED', 'RESPONDED', 'INTERESTED', 'NEGOTIATION', 'CUSTOMER'])),
    proposalReady: pct(atLeast(['PROPOSAL_READY', 'AWAITING_APPROVAL', 'CONTACTED', 'RESPONDED', 'INTERESTED', 'NEGOTIATION', 'CUSTOMER'])),
    awaitingApproval: pct(atLeast(['AWAITING_APPROVAL', 'CONTACTED', 'RESPONDED', 'INTERESTED', 'NEGOTIATION', 'CUSTOMER'])),
    contacted: pct(atLeast(['CONTACTED', 'RESPONDED', 'INTERESTED', 'NEGOTIATION', 'CUSTOMER'])),
    customer: pct(atLeast(['CUSTOMER'])),
  };
  return {
    total,
    byState,
    conversion,
    suppressed: byState.SUPPRESSED ?? 0,
    awaitingApproval: byState.AWAITING_APPROVAL ?? 0,
    remindersDue: rows.filter((r) => r.crmState === 'AWAITING_APPROVAL').length,
  };
}

/** A follow-up reminder: an approved draft waiting for a send decision. */
export type Reminder = {
  businessId: string;
  businessName: string;
  draftId: string | null;
  dueAt: string;
  note: string;
};

export function dueReminders(
  rows: PipelineRow[],
  activities: { businessId: string; type: string; note: string | null; dueAt: Date | null }[],
): Reminder[] {
  const out: Reminder[] = [];
  for (const row of rows) {
    if (row.crmState !== 'AWAITING_APPROVAL') continue;
    const reminder = activities.find((a) => a.businessId === row.businessId && a.type === 'REMINDER');
    out.push({
      businessId: row.businessId,
      businessName: row.name,
      draftId: row.draftId ?? null,
      dueAt: (reminder?.dueAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).toISOString(),
      note:
        reminder?.note ??
        `Borrador aprobado sin enviar para ${row.name}. Decidir envío real (Jon) o archivar. CONTACTED inalcanzable hasta entonces.`,
    });
  }
  return out;
}

/** Appends one history entry for a business. */
export async function logCrmActivity(
  prisma: PrismaClient,
  businessId: string,
  type: string,
  note: string,
  dueAt?: Date | null,
): Promise<string> {
  const row = await prisma.cRMActivity.create({
    data: { businessId, type, note, dueAt: dueAt ?? null },
  });
  return row.id;
}

export type SuppressOptions = {
  businessId?: string | null;
  email?: string | null;
  reason: string;
};

/**
 * Registers an opt-out / objection (UNSUBSCRIBE, COMPLAINT, OBJECTION, ...).
 * Creates the ContactSuppression row (by business and/or email) and logs
 * the history. Any later prepareSales call for that business/email is
 * blocked by the legal gate (SUPPRESSED) — verified by test.
 */
export async function suppressContact(
  prisma: PrismaClient,
  opts: SuppressOptions,
): Promise<{ suppressionId: string; businessId: string | null; email: string | null; reason: string }> {
  if (!opts.businessId && !opts.email) {
    throw new Error('suppressContact needs businessId or email (or both).');
  }
  if (!opts.reason) throw new Error('suppressContact needs a reason (UNSUBSCRIBE, COMPLAINT, OBJECTION, ...).');
  let businessId = opts.businessId ?? null;
  let email = opts.email ?? null;
  if (businessId && !email) {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new Error(`Business ${businessId} not found.`);
    email = business.email;
  }
  if (!businessId && email) {
    const business = await prisma.business.findFirst({ where: { email } });
    businessId = business?.id ?? null;
  }
  const existing = email
    ? await prisma.contactSuppression.findUnique({ where: { email } }).catch(() => null)
    : null;
  const row =
    existing ??
    (await prisma.contactSuppression.create({
      data: { businessId, email, reason: opts.reason },
    }));
  if (businessId) {
    await logCrmActivity(
      prisma,
      businessId,
      'SUPPRESSION',
      `Baja/oposición registrada (${opts.reason})${email ? ` para ${email}` : ''}. ` +
        `SUPPRESSED: ningún borrador futuro para este contacto.`,
    );
  }
  return { suppressionId: row.id, businessId, email, reason: opts.reason };
}
