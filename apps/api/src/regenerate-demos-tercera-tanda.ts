/**
 * Regenerate the demo-platform demos for the TERCERA TANDA (2026-11-17).
 *
 * - The 10 Logroño demos are rebuilt from
 *   packages/shared/src/data/pilot-leads.json EXACTLY as
 *   regenerate-demos-segunda-tanda.ts does (same inputs, same LLM-draft
 *   reuse) and must come out BYTE-IDENTICAL to the previous file:
 *   JSON.stringify(prev.content) === JSON.stringify(rebuilt). The
 *   generator generalization is proven identity; if this fails the script
 *   aborts without writing anything. The 10 keep their businessState
 *   (APPROVED) and auditStatus (PASSED (playwright)) — they are NOT
 *   re-audited here.
 * - The 17 new leads come from docs/tercera-tanda-17-leads.json
 *   (`build_now`, deduplicated from 43 rows: 28 distinct, 17 scored
 *   78-95; Carpintería Soria discarded — own website; 10 unscored
 *   left for later). Each gets an EXPLICIT templateId (never sector
 *   matching), deterministic copy (no LLM draft: llm.used = false),
 *   businessState PREVIEW_READY and auditStatus null (pending the
 *   Playwright audit, another worker). On a RE-RUN (27 previous demos)
 *   the 17 are rebuilt from the JSON and keep their previous
 *   businessState / auditStatus, so re-running after the audit does
 *   not wipe the APPROVED stamps.
 *
 * New-lead inputs (GeneratorBusinessInput):
 * - name = lead.name; sector = displaySector(lead.sector) (strips
 *   "24h"/"urgencias"); address = lead.address ?? null; phone =
 *   lead.phone ?? null (Pelayo has none); email = lead.email;
 *   municipality = lead.town without the " capital" suffix;
 *   province = lead.province; activity = 'CONFIRMED';
 *   activitySignal = lead.validation + (rating+reviews ?
 *   `. ${reviews} reseñas, ${ratingConComa}/5.` : ''); hasOwnWebsite
 *   = false; scoreTotal = lead.score; services = []; slug =
 *   slugify(name, municipality); pilotId = null; consultedAt =
 *   'noviembre de 2026'; sources derived from validation in order of
 *   appearance ('Maps' -> Google Maps, 'FB' -> Facebook, 'Exa' ->
 *   Exa Places, 'Dir. municipal' -> Directorio municipal, 'Opendi' ->
 *   Opendi).
 *
 * Guards (fail loudly, write nothing):
 * - every lead has a verified email and score >= 70 (new rule);
 * - slugs unique across the 27;
 * - every rebuilt fact (name/address/phone/email) equals the dossier;
 * - validateNoInventedClaims clean on subtitle, about and FAQ
 *   answers. NOTE on FAQ: the template answers end with the disclaimer
 *   "Esta demo no publica horarios ni ..." — the validator is a
 *   substring regex, so the word "horarios" trips its 'horario' label
 *   even though the sentence asserts the ABSENCE of hours (it is a
 *   negation, not a claim). That exact disclaimer sentence is therefore
 *   stripped before validating FAQ answers; anything else that trips
 *   the validator still fails the script. The same sentence is in the
 *   10 already-audited demos, so a literal check would fail them too.
 * - the serialized content contains no "formNote", no "formulario" and
 *   no <form>/<input>/<textarea>;
 * - without a phone, no "llama al teléfono" anywhere in the serialized
 *   content; without an address, no "La dirección verificada".
 *
 * Also rewrites apps/demo-platform/public/sitemap.xml with the
 * production base https://weblead-demos.vercel.app (27 demo URLs).
 *
 * Does NOT touch Postgres and does NOT run export:demos.
 *
 * Usage: pnpm --filter @weblead/api regenerate:tercera-tanda
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  buildWebsiteContent,
  displaySector,
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
if (PREVIOUS.length !== 10 && PREVIOUS.length !== 27) {
  throw new Error(`Tercera tanda: se esperaban 10 o 27 demos previas, hay ${PREVIOUS.length}.`);
}

// ---------------------------------------------------------------------------
// Part 1 — rebuild the 10 Logroño demos, exactly like the segunda tanda.
// ---------------------------------------------------------------------------

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

const pilotLeads: PilotLead[] = JSON.parse(
  readFileSync(join(ROOT, 'packages/shared/src/data/pilot-leads.json'), 'utf8'),
);

if (pilotLeads.length !== 10) throw new Error(`Tercera tanda: se esperaban 10 leads piloto, hay ${pilotLeads.length}.`);

const out: {
  content: ReturnType<typeof buildWebsiteContent>;
  businessState: string;
  auditStatus: string | null;
  demoUrl: string;
}[] = [];
const seenSlugs = new Set<string>();

/** Strips the "Esta demo no publica ..." disclaimer sentences from a FAQ
 * answer before validateNoInventedClaims: they assert the absence of
 * hours/services, and the substring validator would otherwise flag the
 * word "horarios" inside the negation. Everything else is validated. */
function faqAnswerForValidation(answer: string): string {
  return answer
    .split(/(?<=[.;])\s+/)
    .filter((s) => !s.trim().startsWith('Esta demo no publica'))
    .join(' ');
}

function checkCopy(
  label: string,
  content: ReturnType<typeof buildWebsiteContent>,
  opts: { phone: string | null; address: string | null },
): void {
  const copyFields = [
    content.hero.subtitle,
    ...content.about.paragraphs,
  ];
  for (const text of copyFields) {
    const violations = validateNoInventedClaims(text);
    if (violations.length > 0) {
      throw new Error(`Forbidden claim in ${label}: ${violations.join(', ')} — "${text.slice(0, 100)}"`);
    }
  }
  for (const f of content.faq) {
    const violations = validateNoInventedClaims(faqAnswerForValidation(f.answer));
    if (violations.length > 0) {
      throw new Error(`Forbidden claim in FAQ of ${label}: ${violations.join(', ')} — "${f.answer.slice(0, 100)}"`);
    }
  }
  const serialized = JSON.stringify(content);
  if (/formNote|formulario|<form|<input|<textarea/i.test(serialized)) {
    throw new Error(`Form text survived in regenerated content for ${label}.`);
  }
  if (!opts.phone && /llama al teléfono/i.test(serialized)) {
    throw new Error(`"llama al teléfono" survived without a phone for ${label}.`);
  }
  if (!opts.address && /la dirección verificada/i.test(serialized)) {
    throw new Error(`"La dirección verificada" survived without an address for ${label}.`);
  }
}

for (const lead of pilotLeads) {
  const prev = PREVIOUS.find((d) => d.content.businessName === lead.name);
  if (!prev) throw new Error(`Sin demo previa para el lead piloto "${lead.name}".`);
  const slug = prev.content.businessSlug;
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
    services: [...prev.content.services.items],
    slug,
    pilotId: lead.id,
    consultedAt: lead.consultedAt,
    sources: lead.signalSource.split(' + ').map((s) => s.trim()),
  };

  // Reused demos keep their accepted LLM drafts (segunda tanda).
  const draft: LlmDraft = {};
  if (prev.content.llm.acceptedSubtitle) draft.subtitle = prev.content.hero.subtitle;
  if (prev.content.llm.acceptedAbout) {
    if (prev.content.about.paragraphs.length < 2) throw new Error(`acceptedAbout but no 2nd paragraph for ${lead.name}.`);
    draft.about = prev.content.about.paragraphs[1]!;
  }
  if (lead.address !== prev.content.contact.address) throw new Error(`Address mismatch for ${lead.name}.`);
  if (lead.phone !== prev.content.contact.phone) throw new Error(`Phone mismatch for ${lead.name}.`);
  if ((lead.email ?? null) !== (prev.content.contact.email ?? null)) throw new Error(`Email mismatch for ${lead.name}.`);

  const content = buildWebsiteContent(input, undefined, Object.keys(draft).length > 0 ? draft : null);

  // ---- Identity guard: the generalized generator must reproduce the
  // previous content byte for byte. Any difference aborts everything.
  if (JSON.stringify(prev.content) !== JSON.stringify(content)) {
    throw new Error(
      `La generalización del generador NO es identidad para "${lead.name}": el contenido reconstruido difiere del previo. ` +
        `No se escribe nada — revisar el generador antes de regenerar.`,
    );
  }

  if (content.businessName !== lead.name) throw new Error(`Name changed for ${lead.name}.`);
  if (content.contact.address !== lead.address) throw new Error(`Address changed for ${lead.name}.`);
  if (content.contact.phone !== lead.phone) throw new Error(`Phone changed for ${lead.name}.`);
  if ((content.contact.email ?? null) !== (lead.email ?? null)) throw new Error(`Email changed for ${lead.name}.`);
  checkCopy(lead.name, content, { phone: lead.phone, address: lead.address });

  out.push({
    content,
    businessState: prev.businessState,
    auditStatus: prev.auditStatus,
    demoUrl: `/demos/${slug}`,
  });
  console.log(
    `- ${lead.name}: reutilizada (byte-idéntica) template=${content.templateId} slug=${slug}`,
  );
}

// ---------------------------------------------------------------------------
// Part 2 — the 17 new leads from docs/tercera-tanda-17-leads.json.
// ---------------------------------------------------------------------------

type TerceraLead = {
  name: string;
  sector: string;
  town: string;
  province: string;
  address?: string;
  phone?: string;
  email: string;
  rating?: string;
  reviews?: string;
  validation: string;
  score: number;
};

const tercera: { build_now: TerceraLead[] } = JSON.parse(
  readFileSync(join(ROOT, 'docs/tercera-tanda-17-leads.json'), 'utf8'),
);
const newLeads = tercera.build_now;
if (newLeads.length !== 17) throw new Error(`Tercera tanda: se esperaban 17 leads nuevos, hay ${newLeads.length}.`);

/** Explicit template per lead (never sector matching). */
const TEMPLATE_BY_NAME: Record<string, string> = {
  "TALLER MECÁNICO REFOYO'S": 'taller-mecanico',
  'FISIOAVANZA ZAMORA': 'salud-fisioterapia',
  'TALLER CHAPA Y PINTURA VALENTÍN MYM C.B.': 'taller-mecanico',
  'MAGNETO ELECTRICIDAD': 'electricista',
  'FISIO MAFF': 'salud-fisioterapia',
  'GRINAN BUENO TALLERES': 'taller-mecanico',
  'DALON TALLER MECÁNICO': 'taller-mecanico',
  FISIOFYR: 'salud-fisioterapia',
  'TALLARES AVILAGRI': 'taller-mecanico',
  'AURA FISIOTERAPIA Y FELDENKRAIS': 'salud-fisioterapia',
  'I.E. RAÚL C.V.': 'electricista',
  'FONTANERÍA TALAYUELAS': 'fontaneria-climatizacion',
  'CARPINTERÍA EBANISTERÍA FRANCISCO TORANZO': 'oficios-hogar',
  'HERALU – HERMANOS ÁLVAREZ URONES': 'cerrajeria',
  'FONTANERÍA PELAYO': 'fontaneria-climatizacion',
  'JARDINERÍA RAÚL HERNÁNDEZ LAPERAL': 'jardineria',
  "PELUQUERÍA MADI'S": 'peluqueria-barberia',
};

const SOURCE_TOKENS: [string, string][] = [
  ['Maps', 'Google Maps'],
  ['FB', 'Facebook'],
  ['Exa', 'Exa Places'],
  ['Dir. municipal', 'Directorio municipal'],
  ['Opendi', 'Opendi'],
];

function sourcesFromValidation(validation: string): string[] {
  return SOURCE_TOKENS.map(([token, name]) => ({ at: validation.indexOf(token), name }))
    .filter((s) => s.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((s) => s.name);
}

for (const lead of newLeads) {
  // Regla permanente: sin email verificado no hay proyecto.
  if (!lead.email || !lead.email.includes('@')) {
    throw new Error(`Sin email verificado no hay proyecto: "${lead.name}" no tiene email — fuera de la lista.`);
  }
  if (lead.score < 70) {
    throw new Error(`Score < 70 para "${lead.name}" (${lead.score}) — fuera de la lista.`);
  }
  const templateId = TEMPLATE_BY_NAME[lead.name];
  if (!templateId) throw new Error(`Sin plantilla explícita para "${lead.name}".`);

  const municipality = lead.town.replace(/ capital$/, '');
  const slug = slugify(lead.name, municipality);
  if (seenSlugs.has(slug)) throw new Error(`Slug duplicado: ${slug}.`);
  seenSlugs.add(slug);

  const address = lead.address ?? null;
  const phone = lead.phone ?? null;
  let activitySignal = lead.validation;
  if (lead.rating && lead.reviews) {
    // "5.0★" -> "5,0" (sin '★', coma decimal).
    const ratingComma = lead.rating.replace('★', '').replace('.', ',');
    activitySignal += `. ${lead.reviews} reseñas, ${ratingComma}/5.`;
  }

  const input: GeneratorBusinessInput = {
    name: lead.name,
    sector: displaySector(lead.sector),
    address,
    phone,
    email: lead.email,
    municipality,
    province: lead.province,
    activity: 'CONFIRMED',
    activitySignal,
    hasOwnWebsite: false,
    scoreTotal: lead.score,
    services: [],
    slug,
    pilotId: null,
    consultedAt: 'noviembre de 2026',
    sources: sourcesFromValidation(lead.validation),
  };

  // No LLM draft: deterministic copy (llm.used = false).
  const content = buildWebsiteContent(input, templateId, null);

  // ---- Guards: facts identical, nothing invented, no form anywhere. ----
  if (content.templateId !== templateId) throw new Error(`Template mismatch for ${lead.name}: ${content.templateId} !== ${templateId}.`);
  if (content.businessName !== lead.name) throw new Error(`Name changed for ${lead.name}.`);
  if (content.contact.address !== address) throw new Error(`Address changed for ${lead.name}.`);
  if (content.contact.phone !== phone) throw new Error(`Phone changed for ${lead.name}.`);
  if ((content.contact.email ?? null) !== (lead.email ?? null)) throw new Error(`Email changed for ${lead.name}.`);
  if (content.llm.used) throw new Error(`LLM draft used for ${lead.name} — las demos nuevas son deterministas.`);
  checkCopy(lead.name, content, { phone, address });

  // Re-run (27 previas): preserve the state this demo already had.
  const prev = PREVIOUS.find((d) => d.content.businessName === lead.name);
  out.push({
    content,
    // Re-run: keep the previous state (audit stamp) if it exists.
    businessState: prev?.businessState ?? 'PREVIEW_READY',
    auditStatus: prev?.auditStatus ?? null, // pending Playwright audit
    demoUrl: `/demos/${slug}`,
  });
  console.log(
    `- ${lead.name}: NUEVA template=${content.templateId} variant=${content.brand.variantId} layout=${content.brand.heroLayout} ` +
      `reviews=${content.verified.reviews ? `${content.verified.reviews.count}x ${content.verified.reviews.rating}/5` : '—'} ` +
      `phone=${phone ? 'sí' : 'NO'} address=${address ? 'sí' : 'NO'} llm=no slug=${slug}`,
  );
}

const header =
  `/**\n` +
  ` * Generated demos — TERCERA TANDA 2026-11-17, by apps/api/src/regenerate-demos-tercera-tanda.ts\n` +
  ` * (10 de Logroño reutilizadas byte-idénticas + 17 nuevas con email\n` +
  ` * verificado de Zamora/Ávila/Cuenca/Soria; 5 plantillas nuevas:\n` +
  ` * taller-mecanico, salud-fisioterapia, electricista, cerrajeria,\n` +
  ` * jardineria; fuentes: pilot-leads.json +\n` +
  ` * docs/tercera-tanda-17-leads.json, sin borrador LLM en las nuevas).\n` +
  ` * Do not edit by hand: re-run the script (it re-validates every fact).\n` +
  ` * Generated at ${new Date().toISOString()} (${out.length} demos).\n` +
  ` */\n` +
  `import type { GeneratedWebsiteContent } from '@weblead/website-generator';\n\n` +
  `export type GeneratedDemo = {\n  content: GeneratedWebsiteContent;\n  businessState: string;\n  auditStatus: string | null;\n  demoUrl: string;\n};\n\n` +
  `export const GENERATED_DEMOS: GeneratedDemo[] = ${JSON.stringify(out, null, 2)};\n`;

writeFileSync(join(ROOT, 'apps/demo-platform/src/data/generated-demos.ts'), header);
console.log(`Wrote ${out.length} demos (10 reutilizadas byte-idénticas, 17 nuevas PREVIEW_READY, auditStatus null en nuevas).`);

// Sitemap with the production base.
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<!-- Tercera tanda 2026-11-17: generado por apps/api/src/regenerate-demos-tercera-tanda.ts -->\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  `  <url><loc>${PROD_BASE}/demos/</loc></url>\n` +
  out.map((d) => `  <url><loc>${PROD_BASE}${d.demoUrl}</loc></url>`).join('\n') +
  `\n</urlset>\n`;
writeFileSync(join(ROOT, 'apps/demo-platform/public/sitemap.xml'), sitemap);
console.log('Wrote sitemap.xml with the production base (27 demo URLs).');
