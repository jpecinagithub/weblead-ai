/**
 * Regenerate the demo-platform demos for the CUARTA TANDA (2026-11-17).
 *
 * Orden de Jon, en este orden: primero quitar la sección "Datos
 * verificados" de TODAS las demos y después el acabado de las 10 nuevas.
 *
 * - Las 27 previas (10 Logroño + 17 tercera tanda) se reconstruyen desde
 *   las MISMAS fuentes que el script de la tercera tanda (pilot-leads.json
 *   + docs/tercera-tanda-17-leads.json `build_now`, mismos borradores LLM
 *   reutilizados) y conservan su businessState (APPROVED) y auditStatus
 *   (PASSED (playwright)) — NO se re-auditan aquí. La variante queda
 *   FIJADA a la actual de cada demo (4º parámetro de buildWebsiteContent):
 *   las variantes nuevas (taller v3, fontanería v3, cerrajería v3/v4)
 *   rebarajan el hash djb2 y 9 demos selladas cambiarían de variante
 *   (Ferrer v0→v2, Hidrorioja v1→v0, ATESA v1→v0, Pelayo v2→v0,
 *   Refoyo's v0→v1, Valentín v2→v0, Dalon v1→v2, Avilagri v0→v3,
 *   Heralu v1→v4); con el pin solo les cambia la sección eliminada.
 * - Guard de identidad (lo único que puede cambiar en las 27): el
 *   contenido reconstruido debe ser EXACTAMENTE el previo menos la clave
 *   `trust`, menos el código de actividad en inglés del párrafo "La
 *   empresa" ("(CONFIRMED, consultado ..." → "(consultado ...") y menos
 *   el fill del <text> de iniciales del logo (acento oscuro → #fff,
 *   pulido del auditor 2026-11-17: ilegible sobre el fondo primary).
 *   El código CONFIRMED vivía también ahí, y el grep de aceptación exige 0
 *   ocurrencias en generated-demos.ts. Cualquier otra diferencia aborta
 *   sin escribir nada. (Efecto colateral visible: los distintivos de
 *   reseñas/año de constitución vivían DENTRO de la sección eliminada,
 *   así que ya no se pintan; el dato sigue en `content.verified`.)
 * - Las 10 nuevas vienen de docs/tercera-tanda-17-leads.json
 *   (`later_unscored`, EXCLUIDA CARPINTERÍA SORIA, que tiene web propia).
 *   No traen score en el archivo (son "sin nota"): no hay guarda de
 *   score, solo email verificado obligatorio. Cada una lleva plantilla
 *   EXPLÍCITA (nunca sector matching), copia determinista (sin borrador
 *   LLM: llm.used = false), businessState PREVIEW_READY y auditStatus
 *   null (pendiente de la auditoría Playwright, otro trabajador). Su
 *   variante es el hash (sin pin) y se comprueba contra la esperada del
 *   encargo. Ninguna tiene dirección de calle: se omite dirección y Maps
 *   sin inventar nada. En una RE-EJECUCIÓN (37 previas) las 10 se
 *   reconstruyen desde el JSON y conservan su businessState / auditStatus.
 *
 * New-lead inputs (GeneratorBusinessInput): igual que la tercera tanda
 * (name, sector saneado con displaySector, address = null, phone, email,
 * municipality = town sin " capital", province, activity = 'CONFIRMED',
 * activitySignal = validation + rating/reseñas cuando las hay,
 * hasOwnWebsite = false, scoreTotal = 0 — sin nota en el archivo —,
 * services = [], slug = slugify(name, municipality), pilotId = null,
 * consultedAt = 'noviembre de 2026', sources desde validation).
 *
 * Guards (fail loudly, write nothing): los de la tercera tanda (hechos
 * idénticos, nada inventado, sin formulario, sin "llama al teléfono" sin
 * teléfono, sin "La dirección verificada" sin dirección) MÁS:
 * - el contenido serializado de las 37 no contiene "Datos verificados",
 *   "Fuentes del expediente", "Señal de actividad", "Actividad
 *   verificada" ni "CONFIRMED";
 * - las 10 nuevas no tienen address ni mapsHref;
 * - cada slug nuevo tiene su entrada `pending` en outreach.ts (el slug
 *   de la clínica se corrigió ahí: "trocal" → "torcal", que es lo que
 *   da slugify de TORCAL).
 *
 * Also rewrites apps/demo-platform/public/sitemap.xml with the
 * production base https://weblead-demos.vercel.app (37 demo URLs).
 *
 * Does NOT touch Postgres and does NOT run export:demos.
 *
 * Usage: pnpm --filter @weblead/api regenerate:cuarta-tanda
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

/** Strings that must not survive anywhere in the regenerated content. */
const BANNED_STRINGS = [
  'Datos verificados',
  'Fuentes del expediente',
  'Señal de actividad',
  'Actividad verificada',
  'CONFIRMED',
];

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
if (PREVIOUS.length !== 27 && PREVIOUS.length !== 37) {
  throw new Error(`Cuarta tanda: se esperaban 27 o 37 demos previas, hay ${PREVIOUS.length}.`);
}

/**
 * What a previous demo's content must look like after the 4ª tanda
 * removal: the `trust` key gone, and the English activity code out of
 * the "La empresa" paragraph ("(CONFIRMED, consultado ..." →
 * "(consultado ..."). PLUS the auditor's logo polish (4ª tanda,
 * revisión visual 2026-11-17): the logo initials go from the dark
 * variant accent to white — dark-on-dark on the primary background was
 * unreadable in every header. Everything else must be byte-identical.
 */
function expectedAfterTrustRemoval(prev: PreviousDemo): GeneratedWebsiteContent {
  // Re-ejecutable: si la previa ya no trae 'trust' (regenerado ya hecho),
  // lo esperado es la previa tal cual; el about-fix es idempotente.
  const clone = JSON.parse(JSON.stringify(prev.content)) as Record<string, unknown>;
  delete clone.trust;
  const about = clone.about as { paragraphs: string[] };
  const before = about.paragraphs[0]!;
  const after = before.replace(/\([A-Z]+, consultado /, '(consultado ');
  if (/\([A-Z]+, consultado /.test(after)) {
    throw new Error(`No se pudo quitar el código de actividad de "La empresa" para "${prev.content.businessName}".`);
  }
  about.paragraphs[0] = after;
  // Logo: blanquear el fill del <text> de iniciales (el generador ya lo
  // emite en #fff). La URI va codificada: se decodifica, se sustituye el
  // fill del texto y se vuelve a codificar — el resultado debe ser
  // byte-idéntico a lo que emite el generador, o la guarda aborta.
  // Idempotente: si las iniciales ya son blancas (#fff/#ffffff), no se toca.
  // El logo vive en DOS sitios: brand.logoSvgDataUri y assets[0].url.
  const prefix = 'data:image/svg+xml,';
  const whiten = (uri: string): string => {
    if (!uri.startsWith(prefix)) {
      throw new Error(`Logo sin prefijo data:image/svg+xml para "${prev.content.businessName}".`);
    }
    const decoded = decodeURIComponent(uri.slice(prefix.length));
    const textFill = decoded.match(/<text[^>]*fill="(#[0-9a-fA-F]+)"/);
    if (!textFill) {
      throw new Error(`Logo sin <text> con fill para "${prev.content.businessName}".`);
    }
    const fill = textFill[1]!.toLowerCase();
    if (fill === '#fff' || fill === '#ffffff') return uri;
    const fixed = decoded.replace(/(<text[^>]*fill=")#[0-9a-fA-F]{6}/, '$1#fff');
    if (fixed === decoded) {
      throw new Error(`No se pudo blanquear las iniciales del logo para "${prev.content.businessName}".`);
    }
    return prefix + encodeURIComponent(fixed);
  };
  const brand = clone.brand as { logoSvgDataUri: string };
  brand.logoSvgDataUri = whiten(brand.logoSvgDataUri);
  for (const asset of (clone.assets as { url: string }[] | undefined) ?? []) {
    if (typeof asset.url === 'string' && asset.url.startsWith(prefix)) {
      asset.url = whiten(asset.url);
    }
  }
  return clone as unknown as GeneratedWebsiteContent;
}

function assertNoBannedStrings(label: string, content: GeneratedWebsiteContent): void {
  const serialized = JSON.stringify(content);
  for (const banned of BANNED_STRINGS) {
    if (serialized.includes(banned)) {
      throw new Error(`"${banned}" sobrevive en el contenido regenerado de ${label}.`);
    }
  }
}

// ---------------------------------------------------------------------------
// Part 1 — rebuild the 10 Logroño demos, exactly like the tercera tanda.
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

if (pilotLeads.length !== 10) throw new Error(`Cuarta tanda: se esperaban 10 leads piloto, hay ${pilotLeads.length}.`);

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
  const copyFields = [content.hero.subtitle, ...content.about.paragraphs];
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
  if (!opts.address && content.contact.mapsHref) {
    throw new Error(`mapsHref survived without an address for ${label}.`);
  }
  assertNoBannedStrings(label, content);
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

  // Variante FIJADA a la actual: el hash rebarajado no toca las selladas.
  const content = buildWebsiteContent(
    input,
    undefined,
    Object.keys(draft).length > 0 ? draft : null,
    prev.content.brand.variantId,
  );

  // ---- Identity guard (menos trust + código de actividad en "La
  // empresa"): cualquier otra diferencia aborta todo. ----
  if (JSON.stringify(expectedAfterTrustRemoval(prev)) !== JSON.stringify(content)) {
    throw new Error(
      `La reconstrucción NO es idéntica (salvo trust) para "${lead.name}": el contenido difiere del previo. ` +
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
    `- ${lead.name}: reutilizada (sin trust, variante fijada ${content.brand.variantId}) slug=${slug}`,
  );
}

// ---------------------------------------------------------------------------
// Part 1b — rebuild the 17 tercera-tanda demos, exactly like their script.
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
const terceraLeads = tercera.build_now;
if (terceraLeads.length !== 17) throw new Error(`Cuarta tanda: se esperaban 17 leads de la tercera tanda, hay ${terceraLeads.length}.`);

/** Explicit template per lead (never sector matching) — same as tercera tanda. */
const TEMPLATE_BY_NAME_TERCERA: Record<string, string> = {
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

function activitySignalFor(lead: { rating?: string; reviews?: string; validation: string }): string {
  let activitySignal = lead.validation;
  if (lead.rating && lead.reviews) {
    // "5.0★" -> "5,0" (sin '★', coma decimal).
    const ratingComma = lead.rating.replace('★', '').replace('.', ',');
    activitySignal += `. ${lead.reviews} reseñas, ${ratingComma}/5.`;
  }
  return activitySignal;
}

function buildTerceraInput(lead: TerceraLead, slug: string): GeneratorBusinessInput {
  const address = lead.address ?? null;
  const phone = lead.phone ?? null;
  return {
    name: lead.name,
    sector: displaySector(lead.sector),
    address,
    phone,
    email: lead.email,
    municipality: lead.town.replace(/ capital$/, ''),
    province: lead.province,
    activity: 'CONFIRMED',
    activitySignal: activitySignalFor(lead),
    hasOwnWebsite: false,
    scoreTotal: lead.score,
    services: [],
    slug,
    pilotId: null,
    consultedAt: 'noviembre de 2026',
    sources: sourcesFromValidation(lead.validation),
  };
}

for (const lead of terceraLeads) {
  const prev = PREVIOUS.find((d) => d.content.businessName === lead.name);
  if (!prev) throw new Error(`Sin demo previa para "${lead.name}" (tercera tanda).`);
  const slug = prev.content.businessSlug;
  if (seenSlugs.has(slug)) throw new Error(`Slug duplicado: ${slug}.`);
  seenSlugs.add(slug);
  // El slug reconstruido desde el JSON debe ser el mismo que el previo.
  if (slugify(lead.name, lead.town.replace(/ capital$/, '')) !== slug) {
    throw new Error(`Slug reconstruido distinto del previo para "${lead.name}".`);
  }
  const templateId = TEMPLATE_BY_NAME_TERCERA[lead.name];
  if (!templateId) throw new Error(`Sin plantilla explícita para "${lead.name}".`);
  const input = buildTerceraInput(lead, slug);

  // Variante FIJADA a la actual: el hash rebarajado no toca las selladas.
  const content = buildWebsiteContent(input, templateId, null, prev.content.brand.variantId);

  if (JSON.stringify(expectedAfterTrustRemoval(prev)) !== JSON.stringify(content)) {
    throw new Error(
      `La reconstrucción NO es idéntica (salvo trust) para "${lead.name}": el contenido difiere del previo. ` +
        `No se escribe nada — revisar el generador antes de regenerar.`,
    );
  }
  if (content.templateId !== templateId) throw new Error(`Template mismatch for ${lead.name}.`);
  if (content.businessName !== lead.name) throw new Error(`Name changed for ${lead.name}.`);
  if (content.contact.address !== (lead.address ?? null)) throw new Error(`Address changed for ${lead.name}.`);
  if (content.contact.phone !== (lead.phone ?? null)) throw new Error(`Phone changed for ${lead.name}.`);
  if ((content.contact.email ?? null) !== (lead.email ?? null)) throw new Error(`Email changed for ${lead.name}.`);
  checkCopy(lead.name, content, { phone: lead.phone ?? null, address: lead.address ?? null });

  out.push({
    content,
    businessState: prev.businessState,
    auditStatus: prev.auditStatus,
    demoUrl: `/demos/${slug}`,
  });
  console.log(
    `- ${lead.name}: reutilizada (sin trust, variante fijada ${content.brand.variantId}) slug=${slug}`,
  );
}

// ---------------------------------------------------------------------------
// Part 2 — the 10 new leads from docs/tercera-tanda-17-leads.json
// (`later_unscored`, EXCLUDING CARPINTERÍA SORIA — own website).
// ---------------------------------------------------------------------------

type CuartaLead = {
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
};

const cuartaDoc: { later_unscored: (CuartaLead & { web?: string })[] } = JSON.parse(
  readFileSync(join(ROOT, 'docs/tercera-tanda-17-leads.json'), 'utf8'),
);
const discarded = cuartaDoc.later_unscored.filter((l) => l.name === 'CARPINTERÍA SORIA');
if (discarded.length !== 1 || discarded[0]?.web !== 'Tiene web') {
  throw new Error('Cuarta tanda: CARPINTERÍA SORIA (con web propia) debe ser la única descartada de later_unscored.');
}
const newLeads = cuartaDoc.later_unscored.filter((l) => l.name !== 'CARPINTERÍA SORIA');
if (newLeads.length !== 10) throw new Error(`Cuarta tanda: se esperaban 10 leads nuevos, hay ${newLeads.length}.`);

/** Explicit template per lead (never sector matching). */
const TEMPLATE_BY_NAME_CUARTA: Record<string, string> = {
  'CENTRO DE ESTUDIOS': 'academia-formacion',
  'CLÍNICA DENTAL MERCEDES MORENO TORCAL': 'clinica-dental',
  'TALLERES SIVI': 'taller-mecanico',
  'TALLER MECÁNICO ADOLFO MESÓN': 'taller-mecanico',
  'TALLERES GONVIAUTO HNOS.': 'taller-mecanico',
  'AUTO-NEUMÁTICOS EL VALLE': 'neumaticos',
  'CALEFACCIÓN Y FONTANERÍA MILE': 'fontaneria-climatizacion',
  'CERRAJERÍA ALBARRÁN': 'cerrajeria',
  'CERRAJERÍA CHUPI': 'cerrajeria',
  'DON LLAVES': 'cerrajeria',
};

/** Expected hash variant per new slug (encargo, punto 3) — the script
 * proves the hash lands there instead of assuming it. */
const EXPECTED_VARIANT_BY_SLUG: Record<string, string> = {
  'centro-de-estudios-soria': 'academia-formacion-v1',
  'clinica-dental-mercedes-moreno-torcal-soria': 'clinica-dental-v2',
  'talleres-sivi-arenas-de-san-pedro': 'taller-mecanico-v0',
  'taller-mecanico-adolfo-meson-arenas-de-san-pedro': 'taller-mecanico-v1',
  'talleres-gonviauto-hnos-arenas-de-san-pedro': 'taller-mecanico-v2',
  'auto-neumaticos-el-valle-arenas-de-san-pedro': 'neumaticos-v1',
  'calefaccion-y-fontaneria-mile-arenas-de-san-pedro': 'fontaneria-climatizacion-v2',
  'cerrajeria-albarran-arenas-de-san-pedro': 'cerrajeria-v4',
  'cerrajeria-chupi-arenas-de-san-pedro': 'cerrajeria-v2',
  'don-llaves-cuenca': 'cerrajeria-v0',
};

/** Expected extracted reviews for the 3 leads that state them. */
const EXPECTED_REVIEWS_BY_NAME: Record<string, { count: number; rating: string }> = {
  'TALLERES SIVI': { count: 81, rating: '4,7' },
  'TALLER MECÁNICO ADOLFO MESÓN': { count: 18, rating: '4,8' },
  'DON LLAVES': { count: 2, rating: '5,0' },
};

const outreachRaw = readFileSync(join(ROOT, 'apps/demo-platform/src/data/outreach.ts'), 'utf8');

for (const lead of newLeads) {
  // Regla permanente: sin email verificado no hay proyecto.
  if (!lead.email || !lead.email.includes('@')) {
    throw new Error(`Sin email verificado no hay proyecto: "${lead.name}" no tiene email — fuera de la lista.`);
  }
  // Ninguna de las 10 tiene dirección de calle en el archivo: se omite,
  // sin inventar nada (y sin Maps).
  if (lead.address) {
    throw new Error(`"${lead.name}" trae dirección en el archivo (${lead.address}): el encargo dice que ninguna la tiene — revisar.`);
  }
  const templateId = TEMPLATE_BY_NAME_CUARTA[lead.name];
  if (!templateId) throw new Error(`Sin plantilla explícita para "${lead.name}".`);

  const municipality = lead.town.replace(/ capital$/, '');
  const slug = slugify(lead.name, municipality);
  if (seenSlugs.has(slug)) throw new Error(`Slug duplicado: ${slug}.`);
  seenSlugs.add(slug);

  const expectedVariant = EXPECTED_VARIANT_BY_SLUG[slug];
  if (!expectedVariant) throw new Error(`Sin variante esperada para el slug "${slug}" — ¿slug distinto del encargo?`);
  if (!outreachRaw.includes(`'${slug}': { status: 'pending'`)) {
    throw new Error(`El slug "${slug}" no tiene su entrada 'pending' en outreach.ts — corregir ahí, no aquí.`);
  }

  const input: GeneratorBusinessInput = {
    name: lead.name,
    sector: displaySector(lead.sector),
    address: null,
    phone: lead.phone ?? null,
    email: lead.email,
    municipality,
    province: lead.province,
    activity: 'CONFIRMED',
    activitySignal: activitySignalFor(lead),
    hasOwnWebsite: false,
    // Sin nota en el archivo (later_unscored): 0, como hace el Designer
    // cuando no hay score (scoreTotal no se renderiza en ningún sitio).
    scoreTotal: 0,
    services: [],
    slug,
    pilotId: null,
    consultedAt: 'noviembre de 2026',
    sources: sourcesFromValidation(lead.validation),
  };

  // No LLM draft: deterministic copy (llm.used = false). Variante por
  // hash (sin pin): debe caer en la esperada del encargo.
  const content = buildWebsiteContent(input, templateId, null);

  // ---- Guards: facts identical, nothing invented, no form anywhere. ----
  if (content.templateId !== templateId) throw new Error(`Template mismatch for ${lead.name}: ${content.templateId} !== ${templateId}.`);
  if (content.brand.variantId !== expectedVariant) {
    throw new Error(`Variant mismatch for ${lead.name}: hash da ${content.brand.variantId}, se esperaba ${expectedVariant}.`);
  }
  if (content.businessName !== lead.name) throw new Error(`Name changed for ${lead.name}.`);
  if (content.contact.address !== null) throw new Error(`Address invented for ${lead.name}.`);
  if (content.contact.mapsHref !== null) throw new Error(`Maps link invented for ${lead.name} (sin dirección).`);
  if (content.contact.phone !== (lead.phone ?? null)) throw new Error(`Phone changed for ${lead.name}.`);
  if ((content.contact.email ?? null) !== (lead.email ?? null)) throw new Error(`Email changed for ${lead.name}.`);
  if (content.llm.used) throw new Error(`LLM draft used for ${lead.name} — las demos nuevas son deterministas.`);
  const expectedReviews = EXPECTED_REVIEWS_BY_NAME[lead.name];
  if (expectedReviews) {
    const got = content.verified.reviews;
    if (!got || got.count !== expectedReviews.count || got.rating !== expectedReviews.rating) {
      throw new Error(`Reviews mismatch for ${lead.name}: ${JSON.stringify(got)} !== ${JSON.stringify(expectedReviews)}.`);
    }
  }
  checkCopy(lead.name, content, { phone: lead.phone ?? null, address: null });

  // Re-run (37 previas): preserve the state this demo already had.
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
      `phone=${lead.phone ? 'sí' : 'NO'} address=NO llm=no slug=${slug}`,
  );
}

if (out.length !== 37) throw new Error(`Cuarta tanda: se esperaban 37 demos, hay ${out.length}.`);

const header =
  `/**\n` +
  ` * Generated demos — CUARTA TANDA 2026-11-17, by apps/api/src/regenerate-demos-cuarta-tanda.ts\n` +
  ` * (27 reutilizadas SIN la sección 'trust', con su variante\n` +
  ` * fijada + 10 nuevas de Soria/Arenas de San Pedro/Cuenca, también sin\n` +
  ` * la sección; 3 plantillas nuevas: academia-formacion, clinica-dental,\n` +
  ` * neumaticos; fuentes: pilot-leads.json +\n` +
  ` * docs/tercera-tanda-17-leads.json, sin borrador LLM en las nuevas).\n` +
  ` * Do not edit by hand: re-run the script (it re-validates every fact).\n` +
  ` * Generated at ${new Date().toISOString()} (${out.length} demos).\n` +
  ` */\n` +
  `import type { GeneratedWebsiteContent } from '@weblead/website-generator';\n\n` +
  `export type GeneratedDemo = {\n  content: GeneratedWebsiteContent;\n  businessState: string;\n  auditStatus: string | null;\n  demoUrl: string;\n};\n\n` +
  `export const GENERATED_DEMOS: GeneratedDemo[] = ${JSON.stringify(out, null, 2)};\n`;

writeFileSync(join(ROOT, 'apps/demo-platform/src/data/generated-demos.ts'), header);
console.log(`Wrote ${out.length} demos (27 reutilizadas sin trust con variante fijada, 10 nuevas PREVIEW_READY, auditStatus null en nuevas).`);

// Sitemap with the production base.
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<!-- Cuarta tanda 2026-11-17: generado por apps/api/src/regenerate-demos-cuarta-tanda.ts -->\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  `  <url><loc>${PROD_BASE}/demos/</loc></url>\n` +
  out.map((d) => `  <url><loc>${PROD_BASE}${d.demoUrl}</loc></url>`).join('\n') +
  `\n</urlset>\n`;
writeFileSync(join(ROOT, 'apps/demo-platform/public/sitemap.xml'), sitemap);
console.log('Wrote sitemap.xml with the production base (37 demo URLs).');
