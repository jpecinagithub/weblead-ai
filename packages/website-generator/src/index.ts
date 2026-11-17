/**
 * Website generator — Fase D (master prompt §2, instrucciones §5).
 *
 * Deterministic by design. The generator builds the site content from the
 * Researcher dossier ONLY (name, sector, address, phone, email, services,
 * activity, score). Nothing else is a fact:
 *
 * - services: only `input.services` (the dossier's contrasted list). The
 *   pilot dossiers list NO services, so generated demos render an explicit
 *   "Servicios pendientes de confirmar con la empresa" note — they never
 *   present a sector-generic service list as if it were the business's own.
 * - No prices, hours, testimonials, accreditations, years of experience,
 *   superlatives or client counts anywhere: `validateNoInventedClaims`
 *   rejects any copy (deterministic or LLM-drafted) containing them.
 * - The LLM may only draft the hero subtitle and the "about" paragraph,
 *   from the same dossier facts. Each drafted field is validated
 *   independently; a rejected field falls back to the deterministic text
 *   and the rejection is recorded in `content.llm`.
 * - WhatsApp link only when the phone is a verified public Spanish number.
 * - NO contact form anywhere (rediseño 2026-11-17, orden de Jon): the
 *   contact block is phone (tel:), email (mailto:), address and a Google
 *   Maps link only. The old `contact.formNote` field is GONE; any content
 *   still carrying it is stale and must be regenerated.
 * - Per-business visual variant (rediseño 2026-11-17): the template's
 *   variant is picked deterministically from the slug, so each business
 *   renders its own accent + hero layout inside its sector system.
 * - Verified review/founded-year facts (rediseño 2026-11-17): when the
 *   dossier's activity signal states a review count + rating (e.g.
 *   "33 reseñas, 4,9/5") or a founding year ("constituida 1994"), the
 *   generator extracts them verbatim into `verified` for display. Nothing
 *   is parsed into a claim the signal does not state; when the signal has
 *   no such figures, `verified` stays null.
 * - Every image is an Unsplash License stock photo from the template,
 *   visually verified 2026-11-16, with source URL + licence recorded.
 * - The conceptual logo is an own SVG (initials + sector motif), never a
 *   third-party mark, recorded as a WebsiteAsset with licence "propio".
 * - 3ª tanda (2026-11-17): businesses OUTSIDE Logroño and without
 *   address/phone. The generator generalizes: sanitized display sector
 *   (urgency tokens stripped), municipality-driven kicker, province shown
 *   only when it differs from the municipality, email-based subtitle/SEO/
 *   FAQ when there is no phone, adaptive FAQ, howItWorks for more
 *   templates (phone only), and 5 new logo motifs. Every change is a
 *   NO-OP for the 10 Logroño demos (identity test: regenerate:segunda-
 *   tanda must produce byte-identical generated-demos.ts JSON).
 */
import { getTemplate, templateForSector, variantForSlug, type HeroLayout, type WebsiteTemplate } from '@weblead/website-templates';

export const DEMO_NOTICE =
  'Propuesta conceptual independiente, no oficial y pendiente de autorización de la empresa.';

export type GeneratorBusinessInput = {
  name: string;
  sector: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  municipality: string;
  province: string;
  /** CONFIRMED | PROBABLE | UNVERIFIED | INACTIVE (dossier). */
  activity: string;
  /** Recorded activity signal text (Fase A), or null. */
  activitySignal: string | null;
  /** Whether the dossier verified an own website (QUALIFIED leads: false). */
  hasOwnWebsite: boolean;
  scoreTotal: number;
  /** ONLY services contrasted in the dossier (pilot dossiers: none). */
  services: string[];
  slug: string;
  pilotId: number | null;
  consultedAt: string;
  /** Independent source names behind the dossier. */
  sources: string[];
};

export type LlmDraft = {
  subtitle?: string;
  about?: string;
};

export type GeneratedImage = {
  /** URL served by the demo-platform (local file). */
  url: string;
  caption: string;
  license: string;
  /** Original Unsplash URL (provenance). */
  source: string;
  placement: 'hero' | 'gallery';
};

export type GeneratedAsset = {
  kind: 'LOGO' | 'IMAGE';
  url: string;
  license: string;
  source: string;
};

/** Conceptual logo motif (SVG glyph drawn from initials). */
export type LogoMotif =
  | 'pipe'
  | 'scissors'
  | 'hammer'
  | 'wrench'
  | 'cross'
  | 'bolt'
  | 'key'
  | 'leaf';

export type GeneratedWebsiteContent = {
  templateId: string;
  businessSlug: string;
  businessName: string;
  sector: string;
  municipality: string;
  brand: {
    palette: WebsiteTemplate['palette'];
    fontHeading: string;
    fontBody: string;
    logoText: string;
    logoMotif: LogoMotif;
    logoSvgDataUri: string;
    /** Deterministic per-business variant id (rediseño 2026-11-17). */
    variantId: string;
    /** Hero composition for this business (banner | split | card). */
    heroLayout: HeroLayout;
  };
  /**
   * Facts extracted verbatim from the dossier's activity signal (rediseño
   * 2026-11-17). Only figures the signal actually states; null otherwise.
   * Rating keeps the signal's own format ("4,9", never recomputed).
   */
  verified: {
    reviews: { count: number; rating: string } | null;
    foundedYear: number | null;
  };
  seo: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
    ogImage: string | null;
    robots: string;
    sitemapEntries: string[];
  };
  hero: { kicker: string; title: string; subtitle: string; ctaLabel: string };
  trust: { items: string[] };
  services: { items: string[]; pendingConfirmation: boolean; note: string };
  about: { heading: string; paragraphs: string[] };
  gallery: { images: GeneratedImage[] };
  howItWorks: { steps: string[] } | null;
  faq: { question: string; answer: string }[];
  contact: {
    address: string | null;
    phone: string | null;
    phoneHref: string | null;
    whatsappHref: string | null;
    email: string | null;
    /** Google Maps search link for the verified address (null without one). */
    mapsHref: string | null;
  };
  notice: string;
  legal: { demoNote: string; imageCredits: string };
  assets: GeneratedAsset[];
  llm: { used: boolean; acceptedSubtitle: boolean; acceptedAbout: boolean; rejections: string[] };
};

/** Claims that must never appear in generated copy (prices, hours, ...). */
export const FORBIDDEN_CLAIM_PATTERNS: { pattern: RegExp; label: string }[] = [
  // 'euros?' con límite de palabra (3ª tanda): sin él, la palabra del
  // expediente "neuromodulación" dispara 'precio' por contener "euro"
  // (FISIO MAFF), y no es ningún precio. "50 euros" o "10 €" siguen
  // detectándose; "neuromodulación" ya no.
  { pattern: /€|\beuros?\b|desde\s+\d|precio/i, label: 'precio' },
  { pattern: /\b\d+\s*años\b/i, label: 'años de experiencia' },
  { pattern: /testimonio|opiniones de clientes|clientes satisfechos|miles de clientes/i, label: 'testimonio/clientes' },
  { pattern: /la mejor|el mejor|los mejores|líder(es)?|n\.?º\s*1|número 1/i, label: 'superlativo' },
  { pattern: /garant[ií]a de|certificad[oa]|homologad[oa]|acreditad[oa]/i, label: 'certificación/garantía' },
  { pattern: /horario|abierto|abre a|lunes a viernes|de \d{1,2}(:\d{2})?\s*a\s*\d{1,2}/i, label: 'horario' },
  { pattern: /24\s*h(oras)?|urgencias 24/i, label: 'urgencias 24h' },
];

/** Returns the forbidden-claim labels found in `text` (empty = clean). */
export function validateNoInventedClaims(text: string): string[] {
  return FORBIDDEN_CLAIM_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label);
}

/**
 * Sanitizes a free-text activity signal for display as a trust item.
 *
 * The signal is verified source text from the Fase A dossier, but it can
 * contain a word the forbidden-claims list treats as a claim (e.g. Nuria:
 * "Ficha activa con horarios" trips the 'horario' pattern, although no
 * opening hours are stated). The generator must not emit trust items that
 * fail the same validation applied to LLM drafts, so only the sentences
 * free of forbidden claims are kept, in order, verbatim. Returns '' when
 * nothing survives (the caller then omits the trust item).
 */
export function sanitizeActivitySignal(signal: string): string {
  const sentences = signal
    .split(/(?<=[.;])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const kept = sentences.filter((s) => validateNoInventedClaims(s).length === 0);
  if (kept.length === 0) return '';
  const joined = kept.join(' ');
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

/**
 * Extracts a review count + rating from the dossier's activity signal,
 * verbatim (rediseño 2026-11-17). The pilot signals state it in two
 * orders: "33 reseñas, 4,9/5" and "5,0/5, 16 reseñas". Returns null when
 * the signal states no such figures — never a guess, never a default.
 */
export function extractReviewSummary(signal: string): { count: number; rating: string } | null {
  const countFirst = signal.match(/(\d+)\s*reseñas?,\s*(\d+[,.]\d)\s*\/\s*5/);
  if (countFirst) return { count: Number.parseInt(countFirst[1]!, 10), rating: countFirst[2]! };
  const ratingFirst = signal.match(/(\d+[,.]\d)\s*\/\s*5,\s*(\d+)\s*reseñas?/);
  if (ratingFirst) return { count: Number.parseInt(ratingFirst[2]!, 10), rating: ratingFirst[1]! };
  return null;
}

/**
 * Extracts a founding year from the dossier's activity signal, verbatim
 * ("constituida 1994" -> 1994). Null when the signal states none.
 */
export function extractFoundedYear(signal: string): number | null {
  const m = signal.match(/constituida\s+(\d{4})/i);
  return m ? Number.parseInt(m[1]!, 10) : null;
}

/**
 * Display sector (3ª tanda): the dossier sector can carry urgency tokens
 * ("Fontanería + calefacción 24h", "Fontanería 24h urgencias") that
 * `validateNoInventedClaims` forbids in generated copy ("urgencias 24h").
 * The raw sector stays in the dossier JSON and the docs; the demo shows
 * the sanitized form everywhere (content.sector, subtitle, about, kicker,
 * SEO). No-op for sectors without those tokens (all 10 Logroño demos).
 */
export function displaySector(sector: string): string {
  return sector
    .replace(/\s*24\s*h(oras)?\b/gi, '')
    .replace(/\s+urgencias\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Hero kicker for businesses outside Logroño (3ª tanda): the old
 * templates say "… en Logroño" (the locality is swapped for the business's
 * municipality); the new templates carry no locality, so it is appended.
 * For Logroño the replacement is identical. The result also runs through
 * `displaySector` so no urgency token from a template kicker can leak
 * into the demo.
 */
export function buildKicker(templateKicker: string, municipality: string): string {
  const kicker = templateKicker.includes('Logroño')
    ? templateKicker.replaceAll('Logroño', municipality)
    : `${templateKicker} en ${municipality}`;
  return displaySector(kicker);
}

/**
 * SEO description (3ª tanda): with address AND phone it is EXACTLY the
 * legacy text (all 10 Logroño demos). Otherwise it is built from what is
 * actually verified — Dirección / teléfono / email joined with ", " and
 * " y ", singular "verificado" for one item, plural "verificados" for
 * several — or a generic verified-contact wording when there is nothing.
 */
export function buildSeoDescription(
  input: Pick<GeneratorBusinessInput, 'name' | 'address' | 'phone' | 'email' | 'municipality'>,
  sector: string,
): string {
  const head = `${input.name}, ${sector} en ${input.municipality}. `;
  const tail = ' Propuesta conceptual de web, no oficial.';
  if (input.address && input.phone) {
    return `${head}Dirección y teléfono verificados en el expediente WebLead AI.${tail}`;
  }
  const items: string[] = [];
  if (input.address) items.push('dirección');
  if (input.phone) items.push('teléfono');
  if (input.email) items.push('email');
  if (items.length === 0) {
    return `${head}Datos de contacto verificados en el expediente WebLead AI.${tail}`;
  }
  const joined =
    items.length === 1
      ? items[0]!
      : items.length === 2
        ? `${items[0]} y ${items[1]}`
        : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
  const capitalized = joined.charAt(0).toUpperCase() + joined.slice(1);
  const verb = items.length === 1 ? 'verificado' : 'verificados';
  return `${head}${capitalized} ${verb} en el expediente WebLead AI.${tail}`;
}

/** Fallback answer when FAQ adaptation leaves an answer empty (3ª tanda). */
export const FAQ_NO_CONTACT_FALLBACK =
  'Esa información no está publicada en esta demo: solo se publican los datos verificados en el expediente. Escríbenos al email de contacto de esta web.';

export type FaqContactOptions = {
  municipality: string;
  phone: string | null;
  address: string | null;
};

/**
 * Adapts one FAQ text (question or answer) to the business's municipality
 * and available contact channel (3ª tanda). Order matters: first the
 * 'Logroño' → municipality substitution, then the phone/address
 * rewrites, then the removal of any sentence still mentioning "teléfono"
 * (no phone) or "dirección" (no address) — "dirección de correo" does
 * NOT count as a physical address, it is the email channel introduced by
 * the phone rewrite above. Sentence splitting uses the same regex as
 * `sanitizeActivitySignal`. For the 10 Logroño demos (phone + address)
 * the result is identical to the template text.
 */
export function adaptFaqText(text: string, opts: FaqContactOptions): string {
  let out = text.replaceAll('Logroño', opts.municipality);
  if (!opts.phone) {
    out = out
      .replaceAll(
        'Pide presupuesto por teléfono: llama al número de contacto de esta web',
        'Pide presupuesto por email: escribe a la dirección de correo de esta web',
      )
      .replaceAll('llama al teléfono de contacto de esta web', 'escribe al email de contacto de esta web')
      .replaceAll('consúltalo por teléfono', 'consúltalo por email');
  }
  if (!opts.address) {
    out = out
      .replaceAll(
        `La dirección verificada de la empresa está en ${opts.municipality} (ver sección Contacto)`,
        `La empresa está en ${opts.municipality} y su email de contacto está en la sección Contacto`,
      )
      .replaceAll(
        'La dirección verificada está en la sección Contacto de esta web.',
        'El email de contacto está en la sección Contacto de esta web.',
      );
  }
  if (!opts.phone || !opts.address) {
    const sentences = out
      .split(/(?<=[.;])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const kept = sentences.filter((s) => {
      if (!opts.phone && /\bteléfono\b/i.test(s)) return false;
      if (!opts.address && /\bdirección\b(?!\s+de\s+correo)/i.test(s)) return false;
      return true;
    });
    out = kept.join(' ');
  }
  return out;
}

/**
 * Adapts a whole template FAQ (3ª tanda). A question that would end up
 * empty keeps its substituted text (questions never carry the contact
 * channel); an answer that ends up empty gets the no-contact fallback.
 */
export function adaptFaq(
  faq: { question: string; answer: string }[],
  opts: FaqContactOptions,
): { question: string; answer: string }[] {
  return faq.map((f) => {
    const question = adaptFaqText(f.question, opts) || f.question.replaceAll('Logroño', opts.municipality);
    const answer = adaptFaqText(f.answer, opts) || FAQ_NO_CONTACT_FALLBACK;
    return { question, answer };
  });
}

/**
 * "Cómo trabajamos" steps (3ª tanda): the original two templates plus
 * 'taller-mecanico', 'electricista', 'cerrajeria' and 'jardineria' — NOT
 * 'salud-fisioterapia' — and only when there is a phone (without one
 * there is no "llama al teléfono"). The 3 steps keep their exact text.
 */
export function buildHowItWorks(
  templateId: string,
  phone: string | null,
): { steps: string[] } | null {
  const HOW_IT_WORKS_TEMPLATE_IDS = [
    'fontaneria-climatizacion',
    'oficios-hogar',
    'taller-mecanico',
    'electricista',
    'cerrajeria',
    'jardineria',
  ];
  if (!phone || !HOW_IT_WORKS_TEMPLATE_IDS.includes(templateId)) return null;
  return {
    steps: [
      'Llama al teléfono de contacto y explica qué necesitas.',
      'Te confirman si pueden ayudarte y qué información necesitan.',
      'Acuerdas con la empresa la visita o el trabajo directamente, sin intermediarios.',
    ],
  };
}

/** Google Maps search link for a verified address (null without one). */
export function mapsHrefFor(address: string | null): string | null {
  if (!address) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Initials of the first two significant words ("Santiago Ferrer ..." -> "SF"). */export function extractInitials(name: string): string {
  const stop = new Set(['de', 'del', 'la', 'el', 'en', 'y', 'sl', 's.l.', 'sc']);
  const words = name
    .split(/[\s-]+/)
    .map((w) => w.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, ''))
    .filter((w) => w.length > 1 && !stop.has(w.toLowerCase()));
  return (words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || 'W').slice(0, 2);
}

export function buildLogoSvg(initials: string, primary: string, accent: string, motif: LogoMotif): string {
  const glyph =
    motif === 'pipe'
      ? '<path d="M14 6h20v6H20v22a4 4 0 0 1-8 0V12H6z" fill="#fff" opacity="0.9"/>'
      : motif === 'hammer'
        ? '<rect x="12" y="12" width="24" height="11" rx="3" fill="#fff" opacity="0.9"/><path d="M30 23 L18 50" stroke="#fff" stroke-width="6" stroke-linecap="round"/>'
        : motif === 'scissors'
          ? '<circle cx="18" cy="18" r="5" fill="none" stroke="#fff" stroke-width="3"/><circle cx="42" cy="18" r="5" fill="none" stroke="#fff" stroke-width="3"/><path d="M22 21 52 42M38 21 8 42" stroke="#fff" stroke-width="3"/>'
          : motif === 'wrench'
            ? '<path d="M49.5 8.5 A11 11 0 1 0 49.5 27.5" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M40 24 L14 50" stroke="#fff" stroke-width="7" stroke-linecap="round"/>'
            : motif === 'cross'
              ? '<rect x="24" y="8" width="12" height="44" rx="2" fill="#fff" opacity="0.9"/><rect x="8" y="24" width="44" height="12" rx="2" fill="#fff" opacity="0.9"/>'
              : motif === 'bolt'
                ? '<path d="M34 6 L14 34 h12 L26 54 L48 24 H36 Z" fill="#fff" opacity="0.9"/>'
                : motif === 'key'
                  ? '<circle cx="18" cy="18" r="9" fill="none" stroke="#fff" stroke-width="5"/><path d="M25 25 L50 50" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M42 42 L42 52 M49 49 L49 57" stroke="#fff" stroke-width="4" stroke-linecap="round"/>'
                  : `<path d="M30 8 C48 14 52 32 30 52 C10 36 12 16 30 8 Z" fill="#fff" opacity="0.9"/><path d="M30 14 L30 48" stroke="${primary}" stroke-width="2" stroke-linecap="round"/>`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60" viewBox="0 0 120 60">` +
    `<rect width="120" height="60" rx="10" fill="${primary}"/>${glyph}` +
    `<text x="66" y="38" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="${accent}">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * First number when the dossier lists several in one field
 * ("967 49 02 35 / 646 00 00 00", Grinan 3ª tanda): the tel:/WhatsApp
 * links must dial ONE number, never the concatenation of both. The
 * displayed text keeps the full field; only the links use the first.
 */
export function firstPhoneNumber(phone: string | null): string | null {
  if (!phone) return null;
  const first = phone.split(/[/,;]/)[0]!.trim();
  return first.length > 0 ? first : null;
}

/** WhatsApp only for a verified public Spanish phone (9 digits, 6/9...). */
export function whatsappHrefFor(phone: string | null): string | null {
  if (!phone) return null;
  const digits = digitsOnly(firstPhoneNumber(phone) ?? '');
  if (!/^[69]\d{8}$/.test(digits)) return null;
  return `https://wa.me/34${digits}`;
}

export function buildWebsiteContent(
  input: GeneratorBusinessInput,
  templateId?: string,
  llmDraft?: LlmDraft | null,
): GeneratedWebsiteContent {
  const template =
    (templateId ? getTemplate(templateId) : undefined) ??
    templateForSector(input.sector);
  if (!template) {
    throw new Error(`No website template for sector "${input.sector}" (templateId "${templateId ?? ''}").`);
  }
  const initials = extractInitials(input.name);
  const variant = variantForSlug(template, input.slug);
  const palette = { ...template.palette, accent: variant.accent };
  const logoSvgDataUri = buildLogoSvg(initials, template.palette.primary, variant.accent, template.logoMotif);
  const firstPhone = firstPhoneNumber(input.phone);
  const phoneHref = firstPhone ? `tel:+34${digitsOnly(firstPhone)}` : null;
  const whatsappHref = whatsappHrefFor(input.phone);
  const mapsHref = mapsHrefFor(input.address);
  /** Display sector: urgency tokens stripped (3ª tanda); raw stays in the dossier. */
  const sector = displaySector(input.sector);
  const verified = {
    reviews: input.activitySignal ? extractReviewSummary(input.activitySignal) : null,
    foundedYear: input.activitySignal ? extractFoundedYear(input.activitySignal) : null,
  };

  const deterministicSubtitle =
    `${sector} en ${input.municipality}. Contacto directo por ${input.phone ? 'teléfono' : 'email'}, sin intermediarios.`;
  /** Province in parens only when it differs from the municipality (3ª tanda). */
  const provinceSuffix =
    input.province.toLowerCase() !== input.municipality.toLowerCase() ? ` (${input.province})` : '';
  const deterministicAbout =
    `${input.name} es una empresa de ${sector} en ${input.municipality}${provinceSuffix}. ` +
    `Su actividad está verificada en el expediente de WebLead AI (${input.activity}, consultado ${input.consultedAt}) ` +
    `${input.hasOwnWebsite ? 'y tiene web propia.' : 'y no tiene web propia.'} Esta página es una propuesta conceptual de cómo podría presentarse en internet: ` +
    `los datos de contacto son los verificados en el expediente y nada más está afirmado.`;

  // LLM drafts are accepted field by field, only when clean AND when they
  // do not contradict the dossier (they must name the business or its
  // sector/municipality, and must not add phone/address/services).
  const rejections: string[] = [];
  let subtitle = deterministicSubtitle;
  let acceptedSubtitle = false;
  if (llmDraft?.subtitle?.trim()) {
    const violations = validateNoInventedClaims(llmDraft.subtitle);
    const mentionsBusiness =
      llmDraft.subtitle.includes(input.name) ||
      llmDraft.subtitle.toLowerCase().includes(sector.toLowerCase()) ||
      llmDraft.subtitle.includes(input.municipality);
    if (violations.length > 0) {
      rejections.push(`subtitle rechazado (afirmaciones no permitidas: ${violations.join(', ')})`);
    } else if (!mentionsBusiness) {
      rejections.push('subtitle rechazado (no menciona el negocio, su sector o su municipio)');
    } else {
      subtitle = llmDraft.subtitle.trim();
      acceptedSubtitle = true;
    }
  }
  const aboutParagraphs = [deterministicAbout];
  let acceptedAbout = false;
  if (llmDraft?.about?.trim()) {
    const violations = validateNoInventedClaims(llmDraft.about);
    if (violations.length > 0) {
      rejections.push(`about rechazado (afirmaciones no permitidas: ${violations.join(', ')})`);
    } else {
      aboutParagraphs.push(llmDraft.about.trim());
      acceptedAbout = true;
    }
  }

  const trustItems = [
    `Actividad verificada: ${input.activity} (expediente consultado ${input.consultedAt})`,
    input.hasOwnWebsite ? 'Con web propia (verificado)' : 'Sin web propia (verificado caso a caso)',
    `Fuentes del expediente: ${input.sources.length > 0 ? input.sources.join(' + ') : 'sin fuentes registradas'}`,
  ];
  if (input.activitySignal) {
    const cleanSignal = sanitizeActivitySignal(input.activitySignal);
    if (cleanSignal) trustItems.push(`Señal de actividad: ${cleanSignal}`);
  }

  const servicesPending = input.services.length === 0;
  const images: GeneratedImage[] = template.photos.map((p) => ({
    url: p.url,
    caption: p.caption,
    license: 'Unsplash License',
    source: p.sourceUrl,
    placement: p.placement,
  }));
  const heroImage = images.find((i) => i.placement === 'hero') ?? images[0] ?? null;

  const assets: GeneratedAsset[] = [
    {
      kind: 'LOGO',
      url: logoSvgDataUri,
      license: 'propio (SVG generado por WebLead AI)',
      source: 'generado por WebLead AI (conceptual, sin marca de terceros)',
    },
    ...images.map((img) => ({
      kind: 'IMAGE' as const,
      url: img.url,
      license: img.license,
      source: img.source,
    })),
  ];

  return {
    templateId: template.id,
    businessSlug: input.slug,
    businessName: input.name,
    sector,
    municipality: input.municipality,
    brand: {
      palette,
      fontHeading: template.fontHeading,
      fontBody: template.fontBody,
      logoText: initials,
      logoMotif: template.logoMotif,
      logoSvgDataUri,
      variantId: variant.id,
      heroLayout: variant.heroLayout,
    },
    verified,
    seo: {
      title: `${input.name} — ${sector} en ${input.municipality} (propuesta conceptual)`,
      description: buildSeoDescription(input, sector),
      ogTitle: `${input.name} — ${sector} en ${input.municipality}`,
      ogDescription: 'Propuesta conceptual de web independiente, no oficial y pendiente de autorización.',
      ogImage: heroImage?.source ?? null,
      robots: 'index, follow',
      sitemapEntries: [`/demos/${input.slug}`],
    },
    hero: {
      kicker: buildKicker(template.heroKicker, input.municipality),
      title: input.name,
      subtitle,
      ctaLabel: input.phone ? `Llamar al ${input.phone}` : 'Ver contacto',
    },
    trust: { items: trustItems },
    services: {
      items: [...input.services],
      pendingConfirmation: servicesPending,
      note: servicesPending
        ? 'Servicios pendientes de confirmar con la empresa: el expediente no lista servicios contrastados y esta demo no inventa ninguno. ' +
          (input.phone
            ? 'Pregunta por teléfono qué servicios ofrecen.'
            : 'Pregunta por email qué servicios ofrecen.')
        : 'Servicios contrastados en el expediente de la empresa.',
    },
    about: { heading: 'La empresa', paragraphs: aboutParagraphs },
    gallery: { images },
    howItWorks: buildHowItWorks(template.id, input.phone),
    faq: adaptFaq(template.faq, {
      municipality: input.municipality,
      phone: input.phone,
      address: input.address,
    }),
    contact: {
      address: input.address,
      phone: input.phone,
      phoneHref,
      whatsappHref,
      email: input.email,
      mapsHref,
    },
    notice: DEMO_NOTICE,
    legal: {
      demoNote:
        'Web de demostración generada por WebLead AI. Propuesta conceptual independiente, no oficial y pendiente de autorización de la empresa. No es la web contratada de la empresa.',
      imageCredits: 'Fotografías: Unsplash (licencia Unsplash, imágenes de archivo, no son el local). Logotipo: propuesta conceptual propia.',
    },
    assets,
    llm: {
      used: Boolean(llmDraft),
      acceptedSubtitle,
      acceptedAbout,
      rejections,
    },
  };
}
