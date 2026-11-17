/**
 * Website templates — Fase D + rediseño 2026-11-17 (sin formularios) +
 * 2ª tanda 2026-11-17 (oficios del hogar: pintura y carpintería) +
 * 3ª tanda 2026-11-17 (taller mecánico, fisioterapia, electricista,
 * cerrajería, jardinería; empresas de Zamora/Ávila/Cuenca/Soria).
 *
 * Eight REAL, differentiated sector templates — not one generic template with
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

export type TemplateId =
  | 'fontaneria-climatizacion'
  | 'peluqueria-barberia'
  | 'oficios-hogar'
  | 'taller-mecanico'
  | 'salud-fisioterapia'
  | 'electricista'
  | 'cerrajeria'
  | 'jardineria';

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
  logoMotif: 'pipe' | 'scissors' | 'hammer' | 'wrench' | 'cross' | 'bolt' | 'key' | 'leaf';
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

/**
 * Taller mecánico (3ª tanda 2026-11-17: mecánica general, chapa y
 * pintura, vehículos + maquinaria agrícola). Fotos Unsplash License,
 * verificadas visualmente el 2026-11-17 y servidas en local desde
 * apps/demo-platform/public/images/.
 */
const TALLER_PHOTOS: TemplateStockPhoto[] = [
  {
    url: '/images/taller-hero.jpg',
    sourceUrl: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1200&q=80',
    caption: 'Motor de coche en el taller (imagen de archivo, no es el local)',
    placement: 'hero',
  },
  {
    url: '/images/taller-gallery-1.jpg',
    sourceUrl: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=1200&q=80',
    caption: 'Mecánico trabajando en el taller (imagen de archivo, no es el local)',
    placement: 'gallery',
  },
  {
    url: '/images/taller-gallery-2.jpg',
    sourceUrl: 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?w=1200&q=80',
    caption: 'Cambio de rueda con pistola neumática (imagen de archivo, no es el local)',
    placement: 'gallery',
  },
];

/**
 * Fisioterapia y salud (3ª tanda 2026-11-17: fisioterapia, pilates
 * terapéutico, neuromodulación NESA, fisioterapia manual, Feldenkrais).
 * Fotos Unsplash License, verificadas visualmente el 2026-11-17 y
 * servidas en local desde apps/demo-platform/public/images/.
 */
const SALUD_PHOTOS: TemplateStockPhoto[] = [
  {
    url: '/images/salud-hero.jpg',
    sourceUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80',
    caption: 'Ejercicio abdominal sobre esterilla (imagen de archivo, no es el local)',
    placement: 'hero',
  },
  {
    url: '/images/salud-gallery-1.jpg',
    sourceUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=80',
    caption: 'Estiramiento de yoga al atardecer (imagen de archivo, no es el local)',
    placement: 'gallery',
  },
  {
    url: '/images/salud-gallery-2.jpg',
    sourceUrl: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=1200&q=80',
    caption: 'Masaje con piedras calientes en la espalda (imagen de archivo, no es el local)',
    placement: 'gallery',
  },
];

/**
 * Electricista (3ª tanda 2026-11-17: electricidad y placas solares).
 * Fotos Unsplash License, verificadas visualmente el 2026-11-17 y
 * servidas en local desde apps/demo-platform/public/images/.
 */
const ELECTRICISTA_PHOTOS: TemplateStockPhoto[] = [
  {
    url: '/images/electricista-hero.jpg',
    sourceUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1200&q=80',
    caption: 'Trabajo eléctrico en una instalación (imagen de archivo, no es el local)',
    placement: 'hero',
  },
  {
    url: '/images/electricista-gallery-1.jpg',
    sourceUrl: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&q=80',
    caption: 'Placas solares en un campo solar (imagen de archivo, no es el local)',
    placement: 'gallery',
  },
  {
    url: '/images/electricista-gallery-2.jpg',
    sourceUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=1200&q=80',
    caption: 'Planos técnicos y herramientas sobre la mesa (imagen de archivo, no es el local)',
    placement: 'gallery',
  },
];

/**
 * Cerrajería y herrería (3ª tanda 2026-11-17). Fotos Unsplash License,
 * verificadas visualmente el 2026-11-17 y servidas en local desde
 * apps/demo-platform/public/images/. Las dos primeras candidatas
 * (tarjeta de crédito, cuarto de baño) se rechazaron por no
 * corresponder; las definitivas son cerradura inteligente, puerta de
 * caja fuerte y soldadura (herrería).
 */
const CERRAJERIA_PHOTOS: TemplateStockPhoto[] = [
  {
    url: '/images/cerrajeria-hero.jpg',
    sourceUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=1200&q=80',
    caption: 'Cerradura inteligente en una puerta (imagen de archivo, no es el local)',
    placement: 'hero',
  },
  {
    url: '/images/cerrajeria-gallery-1.jpg',
    sourceUrl: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=1200&q=80',
    caption: 'Puerta de caja fuerte con cerraduras (imagen de archivo, no es el local)',
    placement: 'gallery',
  },
  {
    url: '/images/cerrajeria-gallery-2.jpg',
    sourceUrl: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=1200&q=80',
    caption: 'Soldadura con chispas en el taller (imagen de archivo, no es el local)',
    placement: 'gallery',
  },
];

/**
 * Jardinería y paisajismo (3ª tanda 2026-11-17). Fotos Unsplash
 * License, verificadas visualmente el 2026-11-17 y servidas en local
 * desde apps/demo-platform/public/images/.
 */
const JARDINERIA_PHOTOS: TemplateStockPhoto[] = [
  {
    url: '/images/jardineria-hero.jpg',
    sourceUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&q=80',
    caption: 'Pala con tierra y herramientas de jardinería (imagen de archivo, no es el local)',
    placement: 'hero',
  },
  {
    url: '/images/jardineria-gallery-1.jpg',
    sourceUrl: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?w=1200&q=80',
    caption: 'Césped verde recién cortado (imagen de archivo, no es el local)',
    placement: 'gallery',
  },
  {
    url: '/images/jardineria-gallery-2.jpg',
    sourceUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=1200&q=80',
    caption: 'Sendero de jardín con arbustos en flor (imagen de archivo, no es el local)',
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
  {
    id: 'taller-mecanico',
    name: 'Taller mecánico',
    description:
      'Plantilla sectorial para taller mecánico (3ª tanda 2026-11-17: mecánica general, chapa y pintura, vehículos + maquinaria agrícola, reparación/servicio y electricidad): hero de trabajo con foto de motor, bloque de contacto directo arriba, sección "Cómo trabajamos" en 3 pasos y FAQ de revisiones y presupuestos. Paleta acero + ámbar. 3 variantes (ámbar/banner, teja partida, pizarra/tarjeta) y contacto sin formulario.',
    sectors: [
      'mecánica general',
      'chapa y pintura',
      'taller vehículos + maquinaria agrícola husqvarna',
      'reparación servicio / electricidad',
    ],
    palette: {
      background: '#eef0f1',
      surface: '#fdfeff',
      primary: '#1c2b36',
      primaryDark: '#121e26',
      accent: '#92400e',
      text: '#1e2a32',
      muted: '#55636c',
    },
    fontHeading: "'Trebuchet MS', 'Segoe UI', sans-serif",
    fontBody: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    sections: ['hero', 'services', 'trust', 'howItWorks', 'gallery', 'about', 'faq', 'contact'],
    heroKicker: 'Taller mecánico',
    faq: [
      {
        question: '¿Hacen revisiones y reparaciones?',
        answer:
          'Los trabajos concretos solo se publican cuando están contrastados en el expediente de la empresa. Si la lista de servicios de esta demo aparece como pendiente de confirmar, es porque aún no se ha verificado: pregúntalo por teléfono.',
      },
      {
        question: '¿Puedo pedir presupuesto?',
        answer:
          'Pide presupuesto por teléfono: llama al número de contacto de esta web y te confirman si pueden hacerlo y qué información necesitan. El contacto es directo con la empresa.',
      },
      {
        question: '¿Atienden averías urgentes?',
        answer:
          'Para saber si pueden atender una avería urgente, llama al teléfono de contacto de esta web: te confirman disponibilidad y qué hacer mientras tanto. Esta demo no publica horarios ni servicios de urgencia no verificados.',
      },
    ],
    photos: TALLER_PHOTOS,
    logoMotif: 'wrench',
    variants: [
      { id: 'taller-mecanico-v0', accent: '#92400e', heroLayout: 'banner' },
      { id: 'taller-mecanico-v1', accent: '#0f766e', heroLayout: 'split' },
      { id: 'taller-mecanico-v2', accent: '#334155', heroLayout: 'card' },
    ],
  },
  {
    id: 'salud-fisioterapia',
    name: 'Fisioterapia y salud',
    description:
      'Plantilla sectorial para fisioterapia y salud (3ª tanda 2026-11-17: fisioterapia, pilates terapéutico, neuromodulación NESA, fisioterapia manual, Feldenkrais): hero calmado con foto de ejercicio terapéutico, galería protagonista, sección "La consulta" antes que los servicios y FAQ de cita y tratamientos. Sin sección "Cómo trabajamos" (como peluquería). Paleta verde azulado + esmeralda. 3 variantes (esmeralda/banner, azul partida, oliva/tarjeta) y contacto sin formulario.',
    sectors: [
      'fisioterapia + pilates terapéutico',
      'fisioterapia + neuromodulación nesa',
      'fisioterapia manual',
      'fisioterapia + feldenkrais',
    ],
    palette: {
      background: '#f0f7f5',
      surface: '#feffff',
      primary: '#0f4c46',
      primaryDark: '#0a3632',
      accent: '#047857',
      text: '#1c2f2b',
      muted: '#4f6b64',
    },
    fontHeading: "'Gill Sans', 'Gill Sans MT', Calibri, sans-serif",
    fontBody: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    sections: ['hero', 'trust', 'about', 'services', 'gallery', 'faq', 'contact'],
    heroKicker: 'Fisioterapia y salud',
    faq: [
      {
        question: '¿Hace falta pedir cita?',
        answer:
          'Para saber si hace falta cita previa y qué huecos hay, llama al teléfono de contacto de esta web. Esta demo no publica horarios ni un sistema de reservas: no se ha verificado ninguno.',
      },
      {
        question: '¿Qué tratamientos ofrecen?',
        answer:
          'Los tratamientos concretos solo se publican cuando están contrastados en el expediente de la empresa. Si la lista de servicios de esta demo aparece como pendiente de confirmar, es porque aún no se ha verificado: pregúntalo por teléfono.',
      },
      {
        question: '¿Cómo es una primera visita?',
        answer:
          'Para saber cómo es una primera visita y qué debes llevar, llama al teléfono de contacto de esta web: te lo explican directamente. Esta demo no publica servicios ni horarios no verificados.',
      },
    ],
    photos: SALUD_PHOTOS,
    logoMotif: 'cross',
    variants: [
      { id: 'salud-fisioterapia-v0', accent: '#047857', heroLayout: 'banner' },
      { id: 'salud-fisioterapia-v1', accent: '#0e7490', heroLayout: 'split' },
      { id: 'salud-fisioterapia-v2', accent: '#365314', heroLayout: 'card' },
    ],
  },
  {
    id: 'electricista',
    name: 'Electricidad y placas solares',
    description:
      'Plantilla sectorial para electricista (3ª tanda 2026-11-17: electricidad y placas solares): hero técnico con foto de trabajo eléctrico, bloque de contacto directo arriba, sección "Cómo trabajamos" en 3 pasos y FAQ de presupuestos y averías. Paleta azul noche + ámbar eléctrico. 3 variantes (ámbar/partida, azul/tarjeta, teja/banner) y contacto sin formulario.',
    sectors: ['electricista + placas solares', 'electricista'],
    palette: {
      background: '#f7f5ec',
      surface: '#fffef8',
      primary: '#1b2a4a',
      primaryDark: '#101c30',
      accent: '#8a5a00',
      text: '#20262e',
      muted: '#5a6470',
    },
    fontHeading: "'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif",
    fontBody: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    sections: ['hero', 'trust', 'howItWorks', 'services', 'gallery', 'about', 'faq', 'contact'],
    heroKicker: 'Electricidad y placas solares',
    faq: [
      {
        question: '¿Hacen presupuestos?',
        answer:
          'Pide presupuesto por teléfono: llama al número de contacto de esta web y te confirman si pueden hacerlo y qué información necesitan. El contacto es directo con la empresa.',
      },
      {
        question: '¿Instalan placas solares?',
        answer:
          'Los trabajos concretos solo se publican cuando están contrastados en el expediente de la empresa. Si la lista de servicios de esta demo aparece como pendiente de confirmar, es porque aún no se ha verificado: pregúntalo por teléfono.',
      },
      {
        question: '¿Atienden averías urgentes?',
        answer:
          'Para saber si pueden atender una avería urgente, llama al teléfono de contacto de esta web: te confirman disponibilidad y qué hacer mientras tanto. Esta demo no publica horarios ni servicios de urgencia no verificados.',
      },
    ],
    photos: ELECTRICISTA_PHOTOS,
    logoMotif: 'bolt',
    variants: [
      { id: 'electricista-v0', accent: '#8a5a00', heroLayout: 'split' },
      { id: 'electricista-v1', accent: '#1d4ed8', heroLayout: 'card' },
      { id: 'electricista-v2', accent: '#0f766e', heroLayout: 'banner' },
    ],
  },
  {
    id: 'cerrajeria',
    name: 'Cerrajería y herrería',
    description:
      'Plantilla sectorial para cerrajería y herrería (3ª tanda 2026-11-17): hero de oficio con foto de llaves, bloque de contacto directo arriba, sección "Cómo trabajamos" en 3 pasos y FAQ de aperturas y copias de llaves. Paleta bronce oscuro + teja. 3 variantes (teja/banner, grafito/partida, bronce/tarjeta) y contacto sin formulario.',
    sectors: ['cerrajería/herrería'],
    palette: {
      background: '#f3f1ec',
      surface: '#fffefa',
      primary: '#3a2e22',
      primaryDark: '#241b12',
      accent: '#7c2d12',
      text: '#2a211a',
      muted: '#6b5d4f',
    },
    fontHeading: "'Courier New', Courier, monospace",
    fontBody: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    sections: ['hero', 'services', 'howItWorks', 'trust', 'gallery', 'about', 'faq', 'contact'],
    heroKicker: 'Cerrajería y herrería',
    faq: [
      {
        question: '¿Atienden aperturas urgentes?',
        answer:
          'Para saber si pueden atender una apertura urgente, llama al teléfono de contacto de esta web: te confirman disponibilidad y qué hacer mientras tanto. Esta demo no publica horarios ni servicios de urgencia no verificados.',
      },
      {
        question: '¿Hacen copias de llaves?',
        answer:
          'Los trabajos concretos solo se publican cuando están contrastados en el expediente de la empresa. Si la lista de servicios de esta demo aparece como pendiente de confirmar, es porque aún no se ha verificado: pregúntalo por teléfono.',
      },
      {
        question: '¿Hacen presupuestos?',
        answer:
          'Pide presupuesto por teléfono: llama al número de contacto de esta web y te confirman si pueden hacerlo y qué información necesitan. El contacto es directo con la empresa.',
      },
    ],
    photos: CERRAJERIA_PHOTOS,
    logoMotif: 'key',
    variants: [
      { id: 'cerrajeria-v0', accent: '#7c2d12', heroLayout: 'banner' },
      { id: 'cerrajeria-v1', accent: '#44403c', heroLayout: 'split' },
      { id: 'cerrajeria-v2', accent: '#713f12', heroLayout: 'card' },
    ],
  },
  {
    id: 'jardineria',
    name: 'Jardinería y paisajismo',
    description:
      'Plantilla sectorial para jardinería y paisajismo (3ª tanda 2026-11-17): hero verde con foto de jardín, galería protagonista, sección "Cómo trabajamos" en 3 pasos y FAQ de presupuestos y trabajos. Paleta verde hoja + ocre. 3 variantes (lima/partida, verde/banner, ocre/tarjeta) y contacto sin formulario.',
    sectors: ['jardinería/paisajismo'],
    palette: {
      background: '#f1f6ee',
      surface: '#fdfff9',
      primary: '#1e4d2b',
      primaryDark: '#122f1a',
      accent: '#3f6212',
      text: '#22301f',
      muted: '#5c6b57',
    },
    fontHeading: "'Century Gothic', Futura, 'Trebuchet MS', sans-serif",
    fontBody: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    sections: ['hero', 'gallery', 'services', 'howItWorks', 'trust', 'about', 'faq', 'contact'],
    heroKicker: 'Jardinería y paisajismo',
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
        question: '¿Trabajan todo el año?',
        answer:
          'Para saber en qué épocas del año trabajan y qué pueden hacer en tu jardín, llama al teléfono de contacto de esta web. Esta demo no publica horarios ni servicios no verificados.',
      },
    ],
    photos: JARDINERIA_PHOTOS,
    logoMotif: 'leaf',
    variants: [
      { id: 'jardineria-v0', accent: '#3f6212', heroLayout: 'split' },
      { id: 'jardineria-v1', accent: '#166534', heroLayout: 'banner' },
      { id: 'jardineria-v2', accent: '#854d0e', heroLayout: 'card' },
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
