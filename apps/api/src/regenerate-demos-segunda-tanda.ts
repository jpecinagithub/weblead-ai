/**
 * Regenerate the demo-platform demos for the SEGUNDA TANDA (2026-11-17).
 *
 * New permanent rule (Jon, 2026-11-17 12:12): a project only starts with a
 * verified contact email; without email there is no project. This script
 * FAILS if any lead in pilot-leads.json lacks an email.
 *
 * Input:
 * - Dossier facts: packages/shared/src/data/pilot-leads.json — the 10 leads
 *   of the second batch: Ferrer (6) + Hidrorioja (8) reused from batch 1,
 *   plus 8 new leads with verified email (27-34). The 8 batch-1 leads
 *   without email stay parked and are NOT in this file.
 * - Previous demos: apps/demo-platform/src/data/generated-demos.ts — only
 *   Ferrer + Hidrorioja are reused (slug, accepted LLM drafts and services
 *   preserved, facts re-validated); the 8 new demos are generated from
 *   scratch (no LLM draft: deterministic copy, llm.used = false).
 *
 * Guards (fail loudly, write nothing):
 * - every lead has a verified email (new rule);
 * - every rebuilt fact (name/address/phone/email) equals the dossier;
 * - no generated copy trips validateNoInventedClaims;
 * - the serialized content contains no "formNote", no "formulario" and no
 *   <form>/<input>/<textarea>;
 * - slugs are unique.
 *
 * businessState: reused demos keep APPROVED; new demos start PREVIEW_READY
 * and are stamped APPROVED only after the Playwright audit passes 10/10
 * (see apps/api/src/audit-segunda-tanda.ts). auditStatus starts null for
 * all 10 (pending re-audit).
 *
 * Also rewrites apps/demo-platform/public/sitemap.xml with the production
 * base https://weblead-demos.vercel.app (the old file pointed at
 * http://localhost:5174).
 *
 * Does NOT touch Postgres (the local snapshot predates Fase F) and does NOT
 * run export:demos.
 *
 * Usage: pnpm --filter @weblead/api regenerate:segunda-tanda
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  buildWebsiteContent,
  validateNoInventedClaims,
  type GeneratedWebsiteContent,
  type GeneratorBusinessInput,
  type LlmDraft,
} from '@weblead/website-generator';
import { slugify } from '@weblead/agent-researcher';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const PROD_BASE = 'https://weblead-demos.vercel.app';

type PreviousDemo = {
  content: GeneratedWebsiteContent;
  businessState: string;
  auditStatus: string | null;
  demoUrl: string;
};

function readPreviousDemos(): PreviousDemo[] {
  const raw = readFileSync(
    join(ROOT, 'apps/demo-platform/src/data/generated-demos.ts'),
    'utf8',
  );
  const marker = 'export const GENERATED_DEMOS: GeneratedDemo[] = ';
  const at = raw.indexOf(marker);
  if (at < 0) throw new Error('GENERATED_DEMOS export not found in the previous demos file.');
  const jsonText = raw.slice(at + marker.length).replace(/;\s*$/, '');
  return JSON.parse(jsonText) as PreviousDemo[];
}

const PREVIOUS = readPreviousDemos();

type PilotLead = {
  id: number;
  name: string;
  sector: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  hasOwnWebsite: boolean;
  activity: string;
  activitySignal: string | null;
  signalSource: string;
  consultedAt: string;
  score: { total: number };
};

const leads: PilotLead[] = JSON.parse(
  readFileSync(join(ROOT, 'packages/shared/src/data/pilot-leads.json'), 'utf8'),
);

if (leads.length !== 10) throw new Error(`Segunda tanda: se esperaban 10 leads, hay ${leads.length}.`);
// Regla nueva permanente: sin email verificado no hay proyecto.
for (const lead of leads) {
  if (!lead.email || !lead.email.includes('@')) {
    throw new Error(`Sin email verificado no hay proyecto: "${lead.name}" no tiene email — fuera de la lista.`);
  }
  if (lead.score.total < 70) {
    throw new Error(`Score < 70 para "${lead.name}" (${lead.score.total}) — fuera de la lista.`);
  }
}

const out: {
  content: ReturnType<typeof buildWebsiteContent>;
  businessState: string;
  auditStatus: string | null;
  demoUrl: string;
}[] = [];
const seenSlugs = new Set<string>();

for (const lead of leads) {
  const prev = PREVIOUS.find((d) => d.content.businessName === lead.name);
  const slug = prev ? prev.content.businessSlug : slugify(lead.name, 'Logroño');
  if (seenSlugs.has(slug)) throw new Error(`Slug duplicado: ${slug}.`);
  seenSlugs.add(slug);

  const input: GeneratorBusinessInput = {
    name: lead.name,
    sector: lead.sector,
    address: lead.address,
    phone: lead.phone,
    email: lead.email,
    municipality: 'Logroño',
    province: 'La Rioja',
    activity: lead.activity,
    activitySignal: lead.activitySignal,
    hasOwnWebsite: lead.hasOwnWebsite,
    scoreTotal: lead.score.total,
    services: prev ? [...prev.content.services.items] : [],
    slug,
    pilotId: lead.id,
    consultedAt: lead.consultedAt,
    sources: lead.signalSource.split(' + ').map((s) => s.trim()),
  };

  // Reused demos keep their accepted LLM drafts; new demos are
  // deterministic only (no draft -> llm.used = false).
  const draft: LlmDraft = {};
  if (prev) {
    if (prev.content.llm.acceptedSubtitle) draft.subtitle = prev.content.hero.subtitle;
    if (prev.content.llm.acceptedAbout) {
      if (prev.content.about.paragraphs.length < 2) throw new Error(`acceptedAbout but no 2nd paragraph for ${lead.name}.`);
      draft.about = prev.content.about.paragraphs[1]!;
    }
    if (lead.address !== prev.content.contact.address) throw new Error(`Address mismatch for ${lead.name}.`);
    if (lead.phone !== prev.content.contact.phone) throw new Error(`Phone mismatch for ${lead.name}.`);
    if ((lead.email ?? null) !== (prev.content.contact.email ?? null)) throw new Error(`Email mismatch for ${lead.name}.`);
  }

  const content = buildWebsiteContent(input, undefined, Object.keys(draft).length > 0 ? draft : null);

  // ---- Guards: facts identical, nothing invented, no form anywhere. ----
  if (content.businessName !== lead.name) throw new Error(`Name changed for ${lead.name}.`);
  if (content.contact.address !== lead.address) throw new Error(`Address changed for ${lead.name}.`);
  if (content.contact.phone !== lead.phone) throw new Error(`Phone changed for ${lead.name}.`);
  if ((content.contact.email ?? null) !== (lead.email ?? null)) throw new Error(`Email changed for ${lead.name}.`);
  const copyFields = [
    content.hero.subtitle,
    ...content.about.paragraphs,
  ];
  for (const text of copyFields) {
    const violations = validateNoInventedClaims(text);
    if (violations.length > 0) throw new Error(`Forbidden claim in ${lead.name}: ${violations.join(', ')} — "${text.slice(0, 100)}"`);
  }
  const serialized = JSON.stringify(content);
  if (/formNote|formulario|<form|<input|<textarea/i.test(serialized)) {
    throw new Error(`Form text survived in regenerated content for ${lead.name}.`);
  }

  out.push({
    content,
    businessState: prev ? prev.businessState : 'PREVIEW_READY',
    auditStatus: null, // pending re-audit (Playwright) after regeneration
    demoUrl: `/demos/${slug}`,
  });
  console.log(
    `- ${lead.name}: ${prev ? 'reutilizada' : 'NUEVA'} template=${content.templateId} variant=${content.brand.variantId} layout=${content.brand.heroLayout} ` +
      `reviews=${content.verified.reviews ? `${content.verified.reviews.count}x ${content.verified.reviews.rating}/5` : '—'} ` +
      `founded=${content.verified.foundedYear ?? '—'} llm=${content.llm.used ? 'aceptado' : 'no'} slug=${slug}`,
  );
}

const header =
  `/**\n` +
  ` * Generated demos — SEGUNDA TANDA 2026-11-17, by apps/api/src/regenerate-demos-segunda-tanda.ts\n` +
  ` * (regla nueva: sin email verificado no hay proyecto; 2 reutilizadas +\n` +
  ` * 8 nuevas con email verificado; plantilla nueva oficios-hogar para\n` +
  ` * pintura/decoración y carpintería; fuentes: pilot-leads.json +\n` +
  ` * borradores LLM ya aceptados de las 2 reutilizadas).\n` +
  ` * Do not edit by hand: re-run the script (it re-validates every fact).\n` +
  ` * Generated at ${new Date().toISOString()} (${out.length} demos).\n` +
  ` */\n` +
  `import type { GeneratedWebsiteContent } from '@weblead/website-generator';\n\n` +
  `export type GeneratedDemo = {\n  content: GeneratedWebsiteContent;\n  businessState: string;\n  auditStatus: string | null;\n  demoUrl: string;\n};\n\n` +
  `export const GENERATED_DEMOS: GeneratedDemo[] = ${JSON.stringify(out, null, 2)};\n`;

writeFileSync(join(ROOT, 'apps/demo-platform/src/data/generated-demos.ts'), header);
console.log(`Wrote ${out.length} demos (auditStatus reset to null, pending re-audit).`);

// Sitemap with the production base (the old file pointed at localhost:5174).
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<!-- Segunda tanda 2026-11-17: generado por apps/api/src/regenerate-demos-segunda-tanda.ts -->\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  `  <url><loc>${PROD_BASE}/demos/</loc></url>\n` +
  out.map((d) => `  <url><loc>${PROD_BASE}${d.demoUrl}</loc></url>`).join('\n') +
  `\n</urlset>\n`;
writeFileSync(join(ROOT, 'apps/demo-platform/public/sitemap.xml'), sitemap);
console.log('Wrote sitemap.xml with the production base.');
