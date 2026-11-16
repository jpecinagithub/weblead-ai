/**
 * CRM agent — Phase 0 skeleton (implemented in Phase 5).
 * Pipeline, follow-ups, history, conversion stats. Honours suppressions:
 * never contact anyone who asked not to be contacted.
 */
import { stubAgent, type Agent } from '@weblead/agent-core';

export const crmAgent: Agent = stubAgent('crm', 'CRM / Customer Success');
