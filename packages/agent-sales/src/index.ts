/**
 * Sales agent — Phase 0 skeleton (implemented in Phase 4).
 * Gmail drafts only, never sends. Every draft needs human approval AND a
 * valid legal basis (LSSI): a public email address is NOT authorisation.
 * No mass or unsolicited email.
 */
import { stubAgent, type Agent } from '@weblead/agent-core';

export const salesAgent: Agent = stubAgent('sales', 'Sales');

export type ProposalModality = 'BASIC' | 'PRO' | 'PREMIUM';
