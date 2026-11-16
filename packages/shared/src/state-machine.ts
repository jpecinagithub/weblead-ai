/**
 * Orchestrator state machine — the 18 states from master-prompt-v1.md §0.
 * The transition table is the single source of truth: the API validates
 * every state change through `canTransition` / `assertTransition`.
 * ARCHIVED is terminal. No state may jump the pipeline (e.g. DISCOVERED
 * can never go straight to APPROVED).
 */
export const BUSINESS_STATES = [
  'DISCOVERED',
  'RESEARCHING',
  'RESEARCHED',
  'QUALIFIED',
  'REJECTED',
  'DESIGNING',
  'PREVIEW_READY',
  'AUDITING',
  'AUDIT_FAILED',
  'APPROVED',
  'SALES_PENDING',
  'SALES_APPROVED',
  'CONTACTED',
  'REPLIED',
  'NEGOTIATION',
  'WON',
  'LOST',
  'ARCHIVED',
] as const;

export type BusinessState = (typeof BUSINESS_STATES)[number];

/**
 * Allowed transitions. Read as: from -> [to, ...].
 * Design decisions (documented in docs/architecture.md):
 * - RESEARCHED may go back to RESEARCHING (re-research with new sources).
 * - PREVIEW_READY may go back to DESIGNING (design rework before audit).
 * - AUDIT_FAILED may go back to DESIGNING (fix and re-audit) or REJECTED.
 * - REJECTED is not terminal: a rejected business can be ARCHIVED only.
 *   (Re-qualification of a rejected business, if ever needed, is a new
 *   discovery — a deliberate product decision, not an oversight.)
 * - WON / LOST may only go to ARCHIVED.
 */
export const BUSINESS_TRANSITIONS: Readonly<Record<BusinessState, readonly BusinessState[]>> = {
  DISCOVERED: ['RESEARCHING', 'REJECTED', 'ARCHIVED'],
  RESEARCHING: ['RESEARCHED', 'REJECTED'],
  RESEARCHED: ['QUALIFIED', 'REJECTED', 'RESEARCHING'],
  QUALIFIED: ['DESIGNING', 'REJECTED'],
  DESIGNING: ['PREVIEW_READY', 'REJECTED'],
  PREVIEW_READY: ['AUDITING', 'DESIGNING'],
  AUDITING: ['APPROVED', 'AUDIT_FAILED'],
  AUDIT_FAILED: ['DESIGNING', 'REJECTED'],
  APPROVED: ['SALES_PENDING', 'REJECTED'],
  SALES_PENDING: ['SALES_APPROVED', 'REJECTED'],
  SALES_APPROVED: ['CONTACTED'],
  CONTACTED: ['REPLIED', 'LOST'],
  REPLIED: ['NEGOTIATION', 'LOST'],
  NEGOTIATION: ['WON', 'LOST'],
  WON: ['ARCHIVED'],
  LOST: ['ARCHIVED'],
  REJECTED: ['ARCHIVED'],
  ARCHIVED: [],
};

export function isBusinessState(value: unknown): value is BusinessState {
  return typeof value === 'string' && (BUSINESS_STATES as readonly string[]).includes(value);
}

export function canTransition(from: BusinessState, to: BusinessState): boolean {
  return BUSINESS_TRANSITIONS[from].includes(to);
}

export class IllegalTransitionError extends Error {
  readonly from: BusinessState;
  readonly to: BusinessState;

  constructor(from: BusinessState, to: BusinessState) {
    super(
      `Illegal business transition: ${from} -> ${to}. Allowed from ${from}: ` +
        `${BUSINESS_TRANSITIONS[from].join(', ') || '(none — terminal state)'}.`,
    );
    this.name = 'IllegalTransitionError';
    this.from = from;
    this.to = to;
  }
}

/** Throws IllegalTransitionError on an illegal jump; returns `to` otherwise. */
export function assertTransition(from: BusinessState, to: BusinessState): BusinessState {
  if (!canTransition(from, to)) throw new IllegalTransitionError(from, to);
  return to;
}

/** CRM pipeline states (master prompt §5) — kept separate from the orchestrator machine. */
export const CRM_STATES = [
  'NEW',
  'QUALIFIED',
  'DEMO_CREATED',
  'AUDITED',
  'PROPOSAL_READY',
  'AWAITING_APPROVAL',
  'CONTACTED',
  'RESPONDED',
  'INTERESTED',
  'NEGOTIATION',
  'CUSTOMER',
  'LOST',
  'SUPPRESSED',
] as const;

export type CrmState = (typeof CRM_STATES)[number];

/** Activity status from the Researcher (master prompt §1). */
export const ACTIVITY_STATUSES = ['CONFIRMED', 'PROBABLE', 'UNVERIFIED', 'INACTIVE'] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

/** Sales reply classification (master prompt §4). */
export const REPLY_TYPES = [
  'INTERESTED',
  'REQUEST_PRICE',
  'REQUEST_INFORMATION',
  'NEGOTIATION',
  'NOT_INTERESTED',
  'UNSUBSCRIBE',
  'COMPLAINT',
  'OTHER',
] as const;
export type ReplyType = (typeof REPLY_TYPES)[number];

export type OpportunityScore = {
  noWebsite: number;
  activity: number;
  digitalNeed: number;
  contactability: number;
  economicPotential: number;
  total: number;
};

export type PilotLead = {
  id: number;
  name: string;
  sector: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  hasOwnWebsite: boolean;
  websiteUrl: string | null;
  alternativePresence: string | null;
  activity: ActivityStatus;
  activitySignal: string;
  signalDate: string | null;
  signalSource: string;
  score: OpportunityScore;
  state: BusinessState;
  consultedAt: string;
};
