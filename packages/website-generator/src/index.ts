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
 * - The contact form is demo-only: no action URL, no third-party submit.
 * - Every image is an Unsplash License stock photo from the template,
 *   visually verified 2026-11-16, with source URL + licence recorded.
 * - The conceptual logo is an own SVG (initials + sector motif), never a
 *   third-party mark, recorded as a WebsiteAsset with licence "propio".
 */
import { getTemplate, templateForSector, type WebsiteTemplate } from '@weblead/website-templates';

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
    logoMotif: 'pipe' | 'scissors';
    logoSvgDataUri: string;
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
    formNote: string;
  };
  notice: string;
  legal: { demoNote: string; imageCredits: string };
  assets: GeneratedAsset[];
  llm: { used: boolean; acceptedSubtitle: boolean; acceptedAbout: boolean; rejections: string[] };
};

/** Claims that must never appear in generated copy (prices, hours, ...). */
export const FORBIDDEN_CLAIM_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /€|euros?|desde\s+\d|precio/i, label: 'precio' },
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

/** Initials of the first two significant words ("Santiago Ferrer ..." -> "SF"). */
export function extractInitials(name: string): string {
  const stop = new Set(['de', 'del', 'la', 'el', 'en', 'y', 'sl', 's.l.', 'sc']);
  const words = name
    .split(/[\s-]+/)
    .map((w) => w.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, ''))
    .filter((w) => w.length > 1 && !stop.has(w.toLowerCase()));
  return (words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || 'W').slice(0, 2);
}

function buildLogoSvg(initials: string, primary: string, accent: string, motif: 'pipe' | 'scissors'): string {
  const glyph =
    motif === 'pipe'
      ? '<path d="M14 6h20v6H20v22a4 4 0 0 1-8 0V12H6z" fill="#fff" opacity="0.9"/>'
      : '<circle cx="18" cy="18" r="5" fill="none" stroke="#fff" stroke-width="3"/><circle cx="42" cy="18" r="5" fill="none" stroke="#fff" stroke-width="3"/><path d="M22 21 52 42M38 21 8 42" stroke="#fff" stroke-width="3"/>';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60" viewBox="0 0 120 60">` +
    `<rect width="120" height="60" rx="10" fill="${primary}"/>${glyph}` +
    `<text x="66" y="38" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="${accent}">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** WhatsApp only for a verified public Spanish phone (9 digits, 6/9...). */
export function whatsappHrefFor(phone: string | null): string | null {
  if (!phone) return null;
  const digits = digitsOnly(phone);
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
  const logoSvgDataUri = buildLogoSvg(initials, template.palette.primary, template.palette.accent, template.logoMotif);
  const phoneHref = input.phone ? `tel:+34${digitsOnly(input.phone)}` : null;
  const whatsappHref = whatsappHrefFor(input.phone);

  const deterministicSubtitle =
    `${input.sector} en ${input.municipality}. Contacto directo por teléfono, sin intermediarios.`;
  const deterministicAbout =
    `${input.name} es una empresa de ${input.sector} en ${input.municipality} (La Rioja). ` +
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
      llmDraft.subtitle.toLowerCase().includes(input.sector.toLowerCase()) ||
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
    sector: input.sector,
    municipality: input.municipality,
    brand: {
      palette: template.palette,
      fontHeading: template.fontHeading,
      fontBody: template.fontBody,
      logoText: initials,
      logoMotif: template.logoMotif,
      logoSvgDataUri,
    },
    seo: {
      title: `${input.name} — ${input.sector} en ${input.municipality} (propuesta conceptual)`,
      description:
        `${input.name}, ${input.sector} en ${input.municipality}. Dirección y teléfono verificados ` +
        `en el expediente WebLead AI. Propuesta conceptual de web, no oficial.`,
      ogTitle: `${input.name} — ${input.sector} en ${input.municipality}`,
      ogDescription: 'Propuesta conceptual de web independiente, no oficial y pendiente de autorización.',
      ogImage: heroImage?.source ?? null,
      robots: 'index, follow',
      sitemapEntries: [`/demos/${input.slug}`],
    },
    hero: {
      kicker: template.heroKicker,
      title: input.name,
      subtitle,
      ctaLabel: input.phone ? `Llamar al ${input.phone}` : 'Ver contacto',
    },
    trust: { items: trustItems },
    services: {
      items: [...input.services],
      pendingConfirmation: servicesPending,
      note: servicesPending
        ? 'Servicios pendientes de confirmar con la empresa: el expediente no lista servicios contrastados y esta demo no inventa ninguno. Pregunta por teléfono qué servicios ofrecen.'
        : 'Servicios contrastados en el expediente de la empresa.',
    },
    about: { heading: 'La empresa', paragraphs: aboutParagraphs },
    gallery: { images },
    howItWorks:
      template.id === 'fontaneria-climatizacion'
        ? {
            steps: [
              'Llama al teléfono de contacto y explica qué necesitas.',
              'Te confirman si pueden ayudarte y qué información necesitan.',
              'Acuerdas con la empresa la visita o el trabajo directamente, sin intermediarios.',
            ],
          }
        : null,
    faq: template.faq.map((f) => ({ ...f })),
    contact: {
      address: input.address,
      phone: input.phone,
      phoneHref,
      whatsappHref,
      email: input.email,
      formNote:
        'Formulario de demostración: comprueba los datos que escribes, pero no envía nada a ningún tercero. Nadie recibe tu mensaje.',
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
