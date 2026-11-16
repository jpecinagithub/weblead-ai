/**
 * Designer agent — Phase 0 skeleton (implemented in Phase 2).
 * Builds the business website from the research dossier. Every demo
 * carries the visible notice: "Propuesta conceptual independiente, no
 * oficial y pendiente de autorización de la empresa."
 */
import { stubAgent, type Agent } from '@weblead/agent-core';

export const designerAgent: Agent = stubAgent('designer', 'Web Designer/Developer');

export const DEMO_NOTICE =
  'Propuesta conceptual independiente, no oficial y pendiente de autorización de la empresa.';
