/**
 * Auditor agent — Phase 0 skeleton (implemented in Phase 3).
 * Independent from the designer. Audits with Playwright: navigation,
 * links, forms, images, console/HTTP errors, mobile/desktop, performance,
 * accessibility, SEO. No commercial step without a passed audit.
 */
import { stubAgent, type Agent } from '@weblead/agent-core';

export const auditorAgent: Agent = stubAgent('auditor', 'Auditor');

export type AuditScore = {
  business: number;
  visual: number;
  technical: number;
  content: number;
};
