/**
 * Auditor agent — Fase D (master prompt §3, instrucciones §6 + §11 Fase D).
 *
 * INDEPENDENT from the Designer: separate code, separate criteria, and it
 * reads the generated content as data — it never trusts the Designer's own
 * claims about it. Two layers:
 *
 * 1. Content audit (pure, always runs): the demo's business facts against
 *    the Researcher dossier (name/address/phone/email/services), forbidden
 *    claims (prices, hours, testimonials, superlatives, certifications),
 *    demo notice, contact completeness (phone/email/address/Maps link, and
 *    NO form — rediseño 2026-11-17 removed the demo contact form entirely;
 *    stale content still carrying `formNote` is CRITICAL), visual coherence
 *    (palette, fonts, licensed images with provenance) and technical SEO/links.
 * 2. Playwright audit (see ./playwright-runner.js): live browser checks —
 *    console/HTTP errors, links, images, responsive overflow, performance,
 *    screenshots. When Chromium is unavailable the runner reports exactly
 *    that and the audit is recorded as 'playwright-unavailable' — it is
 *    never reported as if Playwright had passed.
 *
 * Scoring: each dimension starts at 100; CRITICAL -25, MINOR -10,
 * RECOMMENDATION -3 (floor 0). PASSED requires no CRITICAL finding and
 * every dimension >= 60. A FAILED audit sends the business back to
 * DESIGNING (AUDIT_FAILED -> DESIGNING, validated by the shared machine);
 * only AUDITING -> APPROVED opens the commercial step.
 */
import { stubAgent, type Agent } from '@weblead/agent-core';
import type { PrismaClient } from '@weblead/database';
import { validateNoInventedClaims, DEMO_NOTICE, type GeneratedWebsiteContent } from '@weblead/website-generator';

export const auditorAgent: Agent = stubAgent('auditor', 'Auditor');

// Playwright runner (live-browser layer) re-exported for the API.
export { runPlaywrightAudit, PlaywrightUnavailableError, findChromiumExecutable } from './playwright-runner.js';
export type { PlaywrightAuditResult } from './playwright-runner.js';

export type AuditScore = {
  business: number;
  visual: number;
  technical: number;
  content: number;
};

export type AuditSeverity = 'CRITICAL' | 'MINOR' | 'RECOMMENDATION';
export type AuditCategory = 'BUSINESS' | 'CONTENT' | 'VISUAL' | 'TECHNICAL';

export type AuditFindingInput = {
  severity: AuditSeverity;
  category: AuditCategory;
  message: string;
  url?: string;
};

export type AuditReport = {
  scores: AuditScore;
  findings: AuditFindingInput[];
  result: 'PASSED' | 'FAILED';
  summary: string;
};

/** Dossier facts the demo must match (from Postgres / the Researcher). */
export type AuditDossierFacts = {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  services: string[];
  activity: string;
  slug: string;
};

export const AUDIT_PASS_MIN_SCORE = 60;

export function auditResultFromScores(scores: AuditScore, findings: AuditFindingInput[]): 'PASSED' | 'FAILED' {
  const hasCritical = findings.some((f) => f.severity === 'CRITICAL');
  const allAboveMin = Object.values(scores).every((s) => s >= AUDIT_PASS_MIN_SCORE);
  return !hasCritical && allAboveMin ? 'PASSED' : 'FAILED';
}

function scoreFrom(findings: AuditFindingInput[], category: AuditCategory): number {
  let score = 100;
  for (const f of findings.filter((x) => x.category === category)) {
    score -= f.severity === 'CRITICAL' ? 25 : f.severity === 'MINOR' ? 10 : 3;
  }
  return Math.max(0, score);
}

/** Pure content audit: demo content vs dossier facts. No network, no browser. */
export function auditWebsiteContent(
  content: GeneratedWebsiteContent,
  dossier: AuditDossierFacts,
): AuditReport {
  const findings: AuditFindingInput[] = [];
  const critical = (category: AuditCategory, message: string) =>
    findings.push({ severity: 'CRITICAL', category, message });
  const minor = (category: AuditCategory, message: string) =>
    findings.push({ severity: 'MINOR', category, message });
  const reco = (category: AuditCategory, message: string) =>
    findings.push({ severity: 'RECOMMENDATION', category, message });

  // ---- Business: every fact must match the dossier exactly. ----
  if (content.businessName !== dossier.name) {
    critical('BUSINESS', `El nombre de la demo ("${content.businessName}") no coincide con el expediente ("${dossier.name}").`);
  }
  if (dossier.address && content.contact.address !== dossier.address) {
    critical('BUSINESS', `La dirección de la demo ("${content.contact.address ?? 'ausente'}") no coincide con el expediente ("${dossier.address}").`);
  }
  if (dossier.phone && content.contact.phone !== dossier.phone) {
    critical('BUSINESS', `El teléfono de la demo ("${content.contact.phone ?? 'ausente'}") no coincide con el expediente ("${dossier.phone}").`);
  }
  if (dossier.email && content.contact.email && content.contact.email !== dossier.email) {
    critical('BUSINESS', `El email de la demo no coincide con el expediente ("${dossier.email}").`);
  }
  if (dossier.email && !content.contact.email) {
    minor('BUSINESS', `El expediente tiene email (${dossier.email}) y la demo no lo muestra.`);
  }
  const inventedServices = content.services.items.filter((s) => !dossier.services.includes(s));
  if (inventedServices.length > 0) {
    critical('BUSINESS', `Servicios inventados (no están en el expediente): ${inventedServices.join(', ')}.`);
  }
  if (dossier.services.length === 0 && !content.services.pendingConfirmation) {
    critical('BUSINESS', 'El expediente no lista servicios y la demo no marca los servicios como pendientes de confirmar.');
  }
  if (dossier.services.length > 0 && content.services.items.length === 0) {
    minor('BUSINESS', 'El expediente lista servicios y la demo no muestra ninguno.');
  }

  // ---- Forbidden claims in every generated copy field. ----
  const copyFields: [string, string][] = [
    ['hero.subtitle', content.hero.subtitle],
    ...content.about.paragraphs.map((p, i): [string, string] => [`about[${i}]`, p]),
    ...content.trust.items.map((t, i): [string, string] => [`trust[${i}]`, t]),
  ];
  for (const [field, text] of copyFields) {
    const violations = validateNoInventedClaims(text);
    if (violations.length > 0) {
      critical('BUSINESS', `Afirmación no permitida en ${field}: ${violations.join(', ')} — texto: "${text.slice(0, 120)}".`);
    }
  }

  // ---- Content: notice, sections, contact without any form. ----
  if (content.notice !== DEMO_NOTICE || !content.hero.title) {
    critical('CONTENT', 'Falta el aviso de propuesta conceptual o el título principal.');
  }
  if (!content.contact.phone || !content.contact.address) {
    critical('CONTENT', 'La demo no muestra teléfono o dirección de contacto verificados.');
  }
  // Rediseño 2026-11-17: no hay formulario en ninguna demo. El contenido
  // obsoleto (generado antes del rediseño) aún trae `formNote`: es un
  // CRITICAL, no un aviso — hay que regenerar esa demo.
  if ('formNote' in (content.contact as Record<string, unknown>)) {
    critical('CONTENT', 'Contenido obsoleto: aún trae formNote del formulario eliminado en el rediseño 2026-11-17. Regenerar la demo.');
  }
  if (content.contact.address && !content.contact.mapsHref) {
    minor('CONTENT', 'La demo muestra dirección pero no enlaza a Google Maps.');
  }
  if (content.contact.mapsHref && !content.contact.mapsHref.startsWith('https://www.google.com/maps/search/?api=1&query=')) {
    minor('CONTENT', `Enlace de Google Maps mal formado: ${content.contact.mapsHref}.`);
  }
  if (content.faq.length === 0) minor('CONTENT', 'La demo no tiene FAQ.');
  if (content.gallery.images.length === 0) minor('CONTENT', 'La demo no tiene galería de imágenes.');
  if (content.about.paragraphs.length === 0) minor('CONTENT', 'La demo no tiene sección "La empresa".');

  // ---- Visual: identity coherence + licensed images with provenance. ----
  if (!content.brand.palette.primary || !content.brand.palette.accent) {
    minor('VISUAL', 'Paleta de marca incompleta (falta primary o accent).');
  }
  if (content.brand.fontHeading === content.brand.fontBody) {
    minor('VISUAL', 'La tipografía de títulos es idéntica a la del cuerpo: sin jerarquía visual.');
  }
  for (const img of content.gallery.images) {
    if (!img.source || !img.license) {
      critical('VISUAL', `Imagen sin procedencia o licencia registrada: ${img.url}.`);
    }
    if (!img.caption) minor('VISUAL', `Imagen sin pie que aclare que es de archivo: ${img.url}.`);
  }
  if (!content.brand.logoSvgDataUri.startsWith('data:image/svg+xml')) {
    minor('VISUAL', 'El logotipo conceptual no es un SVG propio.');
  }

  // ---- Technical: SEO, links, image URLs. ----
  if (!content.seo.title || !content.seo.description) {
    minor('TECHNICAL', 'Faltan title o meta description SEO.');
  }
  if (!content.seo.sitemapEntries.includes(`/demos/${dossier.slug}`)) {
    minor('TECHNICAL', `El sitemap no incluye /demos/${dossier.slug}.`);
  }
  if (content.contact.phoneHref && !content.contact.phoneHref.startsWith('tel:+34')) {
    critical('TECHNICAL', `Enlace de teléfono mal formado: ${content.contact.phoneHref}.`);
  }
  if (content.contact.whatsappHref && !content.contact.whatsappHref.startsWith('https://wa.me/34')) {
    minor('TECHNICAL', `Enlace de WhatsApp mal formado: ${content.contact.whatsappHref}.`);
  }
  for (const img of content.gallery.images) {
    // Served locally (site-relative) or hotlinked over HTTPS; anything else
    // (data:, http:, javascript:) is not an acceptable image URL.
    if (!img.url.startsWith('https://') && !img.url.startsWith('/images/')) {
      critical('TECHNICAL', `URL de imagen no válida (ni HTTPS ni local /images/): ${img.url}.`);
    }
  }
  if (content.seo.title.length > 120) {
    reco('TECHNICAL', 'El title SEO supera 120 caracteres; acórtalo para buscadores.');
  }

  const scores: AuditScore = {
    business: scoreFrom(findings, 'BUSINESS'),
    visual: scoreFrom(findings, 'VISUAL'),
    technical: scoreFrom(findings, 'TECHNICAL'),
    content: scoreFrom(findings, 'CONTENT'),
  };
  const result = auditResultFromScores(scores, findings);
  const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
  const minorCount = findings.filter((f) => f.severity === 'MINOR').length;
  return {
    scores,
    findings,
    result,
    summary:
      `Auditoría ${result === 'PASSED' ? 'APROBADA' : 'SUSPENDIDA'}: empresarial ${scores.business}, ` +
      `visual ${scores.visual}, técnica ${scores.technical}, contenido ${scores.content}. ` +
      `${criticalCount} críticas, ${minorCount} menores, ${findings.length - criticalCount - minorCount} recomendaciones.`,
  };
}

/** Merges live-browser (Playwright) findings into a content audit report. */
export function mergePlaywrightFindings(
  report: AuditReport,
  playwrightFindings: AuditFindingInput[],
): AuditReport {
  const findings = [...report.findings, ...playwrightFindings];
  const scores: AuditScore = {
    business: scoreFrom(findings, 'BUSINESS'),
    visual: scoreFrom(findings, 'VISUAL'),
    technical: scoreFrom(findings, 'TECHNICAL'),
    content: scoreFrom(findings, 'CONTENT'),
  };
  const result = auditResultFromScores(scores, findings);
  return {
    scores,
    findings,
    result,
    summary:
      `${report.summary} Tras Playwright: ${result === 'PASSED' ? 'APROBADA' : 'SUSPENDIDA'} ` +
      `(empresarial ${scores.business}, visual ${scores.visual}, técnica ${scores.technical}, contenido ${scores.content}).`,
  };
}

export async function saveAudit(
  prisma: PrismaClient,
  opts: {
    projectId: string;
    report: AuditReport;
    runner: 'playwright' | 'content-only' | 'playwright-unavailable';
    demoUrl?: string | null;
    screenshots?: { desktop?: string; mobile?: string } | null;
  },
): Promise<string> {
  const audit = await prisma.audit.create({
    data: {
      projectId: opts.projectId,
      status: opts.report.result,
      scoreBusiness: opts.report.scores.business,
      scoreVisual: opts.report.scores.visual,
      scoreTechnical: opts.report.scores.technical,
      scoreContent: opts.report.scores.content,
      summary: opts.report.summary,
      runner: opts.runner,
      demoUrl: opts.demoUrl ?? null,
      screenshots: (opts.screenshots ?? null) as never,
    },
  });
  for (const f of opts.report.findings) {
    await prisma.auditFinding.create({
      data: {
        auditId: audit.id,
        severity: f.severity,
        category: f.category,
        message: f.message,
        url: f.url ?? null,
      },
    });
  }
  return audit.id;
}
