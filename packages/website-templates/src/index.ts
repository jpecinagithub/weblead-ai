/**
 * Website templates — Fase D + rediseño 2026-11-17 (sin formularios) +
 * 2ª tanda 2026-11-17 (oficios del hogar: pintura y carpintería).
 *
 * Three REAL, differentiated sector templates — not one generic template with
 * different colours. Each one carries its own layout order, palette,
 * typography, hero framing, sector FAQ (answers never assert an unverified
 * fact: they always deflect to the verified phone) and stock-photo set.
 *
 * Rediseño 2026-11-17 (orden de Jon): las demos eran "muy sencillas y
 * repetitivas". Cada plantilla define ahora 3 VARIANTES (accent + hero
 * layout) y el generador asigna una por negocio de forma determinista
 * (hash del slug): mismo negocio → misma variante; negocios distintos del
 * mismo sector → variantes distintas en general. La variación es con
 * criterio (paleta sectorial + acento curado + layout), nunca aleatoria.
 * SIN formularios: ninguna plantilla menciona ya ningún formulario; el
 * contacto es solo teléfono / email / dirección / Google Maps.
 *
 * No invented data lives here: templates only describe *how* a business is
 * presented. Every fact shown on a generated site (name, address, phone,
 * email, services) comes from the Researcher dossier via
 * @weblead/website-generator. Services the dossier does not list are never
 * invented: the generator renders an explicit "pending confirmation" note.
 *
 * Images: Unsplash License stock photos, each one visually verified on
 * 2026-11-16 (the file was opened and checked, not trusted from its id).
 * The files are SERVED LOCALLY from apps/demo-platform/public/images/
 * (downloaded 2026-11-16): the VM's Chromium cannot reach
 * images.unsplash.com (ERR_TUNNEL_CONNECTION_FAILED, found by the live
 * Playwright audit), so hotlinking would render broken images. Provenance
 * is preserved: every photo keeps its original Unsplash URL in `sourceUrl`
 * and in WebsiteAsset.source, with the Unsplash License.
 * The electrician photo photo-1621905251189-08b45d6a269e was REJECTED for
 * the plumbing template (it shows electrical work, not plumbing). Every
 * asset keeps its source URL + licence in WebsiteAsset (see generator).
 */

export type TemplateId = 'fontaneria-climatizacion' | 'peluqueria-barberia' | 'oficios-hogar';

export type BrandPalette = {
  /** Page background. */
  background: string;
  /** Main surfaces (cards, sections). */
  surface: string;
  /** Primary brand colour (headers, hero). */
  primary: string;
  /** Dark variant of primary (footer, hero overlay). */
  primaryDark: string;
  /** Accent colour (CTAs, highlights). */
  accent: string;
  /** Body text. */
  text: string;
  /** Muted text. */
  muted: string;
};

export type TemplateFaq = { question: string; answer: string };

export type TemplateStockPhoto = {
  /** URL served by the demo-platform (local file under public/images/). */
  url: string;
  /** Original Unsplash URL (provenance + licence, recorded in WebsiteAsset). */
  sourceUrl: string;
  /** What the photo shows (verified visually 2026-11-16). */
  caption: string;
  /** Where it is used: hero or gallery. */
  placement: 'hero' | 'gallery';
};

/** Hero layout of one variant (rediseño 2026-11-17). */
export type HeroLayout = 'banner' | 'split' | 'card';

/**
 * One visual variant inside a sector template (rediseño 2026-11-17).
 * `accent` is a curated dark tone of the sector palette: dark enough to
 * carry text on the light background (contrast ≥ 4.5:1, guarded by tests).
 * `heroLayout` changes the hero composition, not just the colour.
 */
export type TemplateVariant = {
  id: string;
  /** Curated accent colour (decorative bars, badges, kicker). */
  accent: string;
  heroLayout: HeroLayout;
};

export type WebsiteTemplate = {
  id: TemplateId;
  name: string;
  description: string;
  /** Sectors (pilot wording) this template serves. */
  sectors: string[];
  palette: BrandPalette;
  /** CSS font stacks (system stacks only — no external font download). */
  fontHeading: string;
  fontBody: string;
  /** Section order for this template (layout differs per sector). */
  sections: readonly (
    | 'hero'
    | 'trust'
    | 'services'
    | 'about'
    | 'gallery'
    | 'howItWorks'
    | 'faq'
    | 'contact'
  )[];
  /** Hero framing line (no facts, just the sector promise). */
  heroKicker: string;
  /** Sector FAQ. Answers never invent hours, prices or services. */
  faq: TemplateFaq[];
  /** Stock photos for this sector (Unsplash License, visually verified). */
  photos: TemplateStockPhoto[];
  /** Conceptual logo motif (SVG, drawn from initials — never a third-party mark). */
  logoMotif: 'pipe' | 'scissors' | 'hammer';
  /**
   * Visual variants (rediseño 2026-11-17): 3 per template. The generator
   * picks one deterministically from the business slug, so the same
   * business always renders the same variant and different businesses of
   * the same sector usually render different ones.
   */
  variants: readonly TemplateVariant[];
};

const PLUMBING_PHOTOS: TemplateStockPhoto[] = [
  {
    url: '/images/ferrer-hero.jpg',
    sourceUrl: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=1200&q=80',
    caption: 'Grifería de bañera (imagen de archivo, no es el local)',
    placement: 'hero',
  },
  {
    url: '/images/ferrer-gallery-1.jpg',
    sourceUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&q=80',
    caption: 'Cuarto de baño reformado (imagen de archivo, no es el local)',
    placement: 'gallery',
  },
  {
    url: '/images/ferrer-gallery-2.jpg',
    sourceUrl: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=1200&q=80',
    caption: 'Instalación de tuberías (imagen de archivo, no es el local)',
    placement: 'gallery',
  },
];

const HAIR_PHOTOS: TemplateStockPhoto[] = [
  {
    url: '/images/begona-hero.jpg',
    sourceUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1200&q=80',
    caption: 'Interior de barbería (imagen de archivo, no es el local)',
    placement: 'hero',
  },
  {
    url: '/images/begona-gallery-1.jpg',
    sourceUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=80',
    caption: 'Interior de peluquería (imagen de archivo, no es el local)',
    placement: 'gallery',
  },
  {
    url: '/images/begona-gallery-2.jpg',
    sourceUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&q=80',
    caption: 'Arreglo de barba con tijera (imagen de archivo)',
    placement: 'gallery',
  },
];

/**
 * Oficios del hogar (2ª tanda 2026-11-17: pintura y carpintería). Fotos
 * Unsplash License, verificadas visualmente el 2026-11-17 por el
 * coordinador (rodillo pintando, corte de madera, taladro en obra) y
 * servidas en local desde apps/demo-platform/public/images/.
 */
const TRADES_PHOTOS: TemplateStockPhoto[] = [
  {
    url: '/images/oficios-hero.jpg',
    sourceUrl: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=1200&q=80',
    caption: 'Rodillo pintando una pared (imagen de archivo, no es el local)',
    placement: 'hero',
  },
  {
    url: '/images/oficios-gallery-1.jpg',
    sourceUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=1200&q=80',
    caption: 'Corte de madera en obra (imagen de archivo, no es el local)',
    placement: 'gallery',
  },
  {
    url: '/images/oficios-gallery-2.jpg',
    sourceUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1200&q=80',
    caption: 'Taladro en obra (imagen de archivo, no es el local)',
    placement: 'gallery',
  },
];

export const TEMPLATES: WebsiteTemplate[] = [
  {
    id: 'fontaneria-climatizacion',
    name: 'Fontanería y climatización',
    description:
      'Plantilla sectorial para fontanería/climatización: hero técnico con foto de instalación, bloque de contacto directo arriba (teléfono y WhatsApp), sección "Cómo trabajamos" en 3 pasos y FAQ de averías e instalaciones. Paleta azul petróleo + cobre. Rediseño 2026-11-17: 3 variantes (cobre/banner, teja partida, acero/tarjeta) y contacto sin formulario.',
    sectors: ['fontanería/climatización', 'fontaneria/climatizacion'],
    palette: {
      background: '#f4f6f5',
      surface: '#ffffff',
      primary: '#0b3d5c',
      primaryDark: '#072a40',
      accent: '#9a5b14',
      text: '#1a2b33',
      muted: '#5b6b73',
    },
    fontHeading: "'Arial Narrow', 'Helvetica Neue', Arial, sans-serif",
    fontBody: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    sections: ['hero', 'trust', 'services', 'howItWorks', 'about', 'gallery', 'faq', 'contact'],
    heroKicker: 'Fontanería y climatización en Logroño',
    faq: [
      {
        question: '¿Atienden averías urgentes?',
        answer:
          'Para saber si pueden atender una avería urgente, llama al teléfono de contacto de esta web: te confirman disponibilidad y qué hacer mientras tanto. Esta demo no publica horarios ni servicios de urgencia no verificados.',
      },
      {
        question: '¿Hacen presupuestos?',
        answer:
          'Pide presupuesto por teléfono: llama al número de contacto de esta web y te confirman si pueden hacerlo y qué información necesitan. El contacto es directo con la empresa.',
      },
      {
        question: '¿Trabajan solo en Logroño?',
        answer:
          'La dirección verificada de la empresa está en Logroño (ver sección Contacto). Para trabajos fuera de Logroño, consúltalo por teléfono.',
      },
    ],
    photos: PLUMBING_PHOTOS,
    logoMotif: 'pipe',
    variants: [
      { id: 'fontaneria-climatizacion-v0', accent: '#9a5b14', heroLayout: 'banner' },
      { id: 'fontaneria-climatizacion-v1', accent: '#14655a', heroLayout: 'split' },
      { id: 'fontaneria-climatizacion-v2', accent: '#1f567e', heroLayout: 'card' },
    ],
  },
  {
    id: 'peluqueria-barberia',
    name: 'Peluquería y barbería',
    description:
      'Plantilla sectorial para peluquería/barbería: hero cálido con foto de interior, galería protagonista, sección "La experiencia" antes que los servicios y FAQ de cita y servicios. Paleta carbón + dorado con tipografía serif de escaparate. Rediseño 2026-11-17: 3 variantes (dorado/tarjeta, burdeos/partida, oliva/banner) y contacto sin formulario.',
    sectors: ['peluquería/barbería', 'peluqueria/barberia'],
    palette: {
      background: '#faf6f0',
      surface: '#fffdf9',
      primary: '#26221f',
      primaryDark: '#171412',
      accent: '#8a6420',
      text: '#2b2622',
      muted: '#6f655b',
    },
    fontHeading: "Georgia, 'Times New Roman', serif",
    fontBody: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    sections: ['hero', 'gallery', 'trust', 'services', 'about', 'faq', 'contact'],
    heroKicker: 'Peluquería en Logroño',
    faq: [
      {
        question: '¿Hace falta pedir cita?',
        answer:
          'Para saber si hace falta cita previa y qué huecos hay, llama al teléfono de contacto de esta web. Esta demo no publica horarios ni un sistema de reservas: no se ha verificado ninguno.',
      },
      {
        question: '¿Qué servicios ofrecen?',
        answer:
          'Los servicios concretos solo se publican cuando están contrastados en el expediente de la empresa. Si la lista de servicios de esta demo aparece como pendiente de confirmar, es porque aún no se ha verificado: pregúntalo por teléfono.',
      },
      {
        question: '¿Dónde está el local?',
        answer:
          'La dirección verificada está en la sección Contacto de esta web. Es la dirección que consta en el expediente de WebLead AI, consultada en noviembre de 2026.',
      },
    ],
    photos: HAIR_PHOTOS,
    logoMotif: 'scissors',
    variants: [
      { id: 'peluqueria-barberia-v0', accent: '#8a6420', heroLayout: 'card' },
      { id: 'peluqueria-barberia-v1', accent: '#7c2e3e', heroLayout: 'split' },
      { id: 'peluqueria-barberia-v2', accent: '#4d5e2a', heroLayout: 'banner' },
    ],
  },
  {
    id: 'oficios-hogar',
    name: 'Oficios y servicios del hogar',
    description:
      'Plantilla sectorial para oficios del hogar (2ª tanda 2026-11-17: pintura/decoración y carpintería): hero de trabajo con foto de oficio, bloque de contacto directo arriba, sección "Cómo trabajamos" en 3 pasos y FAQ de presupuestos y trabajos. Paleta verde musgo + terracota. Rediseño 2026-11-17: 3 variantes (terracota/banner, ocre/partida, pizarra/tarjeta) y contacto sin formulario.',
    sectors: ['pintura/decoración', 'pintura', 'carpintería', 'carpinteria'],
    palette: {
      background: '#f6f4ee',
      surface: '#fffdf8',
      primary: '#333f2b',
      primaryDark: '#232b1d',
      accent: '#a34d28',
      text: '#26291f',
      muted: '#5f6656',
    },
    fontHeading: "'Palatino Linotype', Palatino, Georgia, serif",
    fontBody: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    sections: ['hero', 'trust', 'gallery', 'services', 'howItWorks', 'about', 'faq', 'contact'],
    heroKicker: 'Oficios y servicios del hogar en Logroño',
    faq: [
      {
        question: '¿Hacen presupuestos?',
        answer:
          'Pide presupuesto por teléfono: llama al número de contacto de esta web y te confirman si pueden hacerlo y qué información necesitan. El contacto es directo con la empresa.',
      },
      {
        question: '¿Qué trabajos hacen?',
        answer:
          'Los trabajos concretos solo se publican cuando están contrastados en el expediente de la empresa. Si la lista de servicios de esta demo aparece como pendiente de confirmar, es porque aún no se ha verificado: pregúntalo por teléfono.',
      },
      {
        question: '¿Trabajan solo en Logroño?',
        answer:
          'La dirección verificada de la empresa está en Logroño (ver sección Contacto). Para trabajos fuera de Logroño, consúltalo por teléfono.',
      },
    ],
    photos: TRADES_PHOTOS,
    logoMotif: 'hammer',
    variants: [
      { id: 'oficios-hogar-v0', accent: '#a34d28', heroLayout: 'banner' },
      { id: 'oficios-hogar-v1', accent: '#7a5c14', heroLayout: 'split' },
      { id: 'oficios-hogar-v2', accent: '#33606e', heroLayout: 'card' },
    ],
  },
];

export function getTemplate(id: string): WebsiteTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/** Picks the sector template for a pilot sector string; undefined when unknown. */
export function templateForSector(sector: string): WebsiteTemplate | undefined {
  const norm = sector.trim().toLowerCase();
  return TEMPLATES.find((t) => t.sectors.includes(norm));
}

/**
 * Deterministic variant pick (rediseño 2026-11-17): a djb2 string hash of
 * the business slug, modulo the template's variants. Same slug always
 * yields the same variant; the choice is stable across regenerations and
 * needs no stored state. It is NOT random: the variants themselves are
 * curated per sector, so any pick stays inside the sector's visual system.
 * djb2 was chosen over the h31/fnv/sum candidates because it is the only
 * one that uses all 3 variants in both pilot sectors (5 slugs each).
 */
export function variantForSlug(template: WebsiteTemplate, slug: string): TemplateVariant {
  let hash = 5381;
  for (let i = 0; i < slug.length; i++) {
    hash = ((hash * 33 + slug.charCodeAt(i)) >>> 0);
  }
  return template.variants[hash % template.variants.length]!;
}

/** Relative luminance of an sRGB hex colour (WCAG 2.1). */
export function luminance(hex: string): number {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) throw new Error(`Color no válido: ${hex}`);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = [Number.parseInt(m[1]!, 16), Number.parseInt(m[2]!, 16), Number.parseInt(m[3]!, 16)];
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two hex colours (1–21). */
export function contrastRatio(hexA: string, hexB: string): number {
  const [l1, l2] = [luminance(hexA), luminance(hexB)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** The two templates must stay visually distinct (guarded by tests). */
export function templatesAreDistinct(a: WebsiteTemplate, b: WebsiteTemplate): boolean {
  return (
    a.palette.primary !== b.palette.primary &&
    a.palette.accent !== b.palette.accent &&
    a.fontHeading !== b.fontHeading &&
    a.sections.join('|') !== b.sections.join('|')
  );
}
