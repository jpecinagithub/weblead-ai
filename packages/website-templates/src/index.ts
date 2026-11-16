/**
 * Website templates — Fase D (master prompt §2, instrucciones §5 + §11 Fase D).
 *
 * Two REAL, differentiated sector templates — not one generic template with
 * different colours. Each one carries its own layout order, palette,
 * typography, hero framing, sector FAQ (answers never assert an unverified
 * fact: they always deflect to the verified phone) and stock-photo set.
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

export type TemplateId = 'fontaneria-climatizacion' | 'peluqueria-barberia';

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
  logoMotif: 'pipe' | 'scissors';
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

export const TEMPLATES: WebsiteTemplate[] = [
  {
    id: 'fontaneria-climatizacion',
    name: 'Fontanería y climatización',
    description:
      'Plantilla sectorial para fontanería/climatización: hero técnico con foto de instalación, bloque de contacto directo arriba (teléfono y WhatsApp), sección "Cómo trabajamos" en 3 pasos y FAQ de averías e instalaciones. Paleta azul petróleo + cobre.',
    sectors: ['fontanería/climatización', 'fontaneria/climatizacion'],
    palette: {
      background: '#f4f6f5',
      surface: '#ffffff',
      primary: '#0b3d5c',
      primaryDark: '#072a40',
      accent: '#c67a2e',
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
          'Pide presupuesto por teléfono o por el formulario de esta web. El formulario es solo una demostración: no envía tus datos a ningún tercero y nadie recibe tu mensaje.',
      },
      {
        question: '¿Trabajan solo en Logroño?',
        answer:
          'La dirección verificada de la empresa está en Logroño (ver sección Contacto). Para trabajos fuera de Logroño, consúltalo por teléfono.',
      },
    ],
    photos: PLUMBING_PHOTOS,
    logoMotif: 'pipe',
  },
  {
    id: 'peluqueria-barberia',
    name: 'Peluquería y barbería',
    description:
      'Plantilla sectorial para peluquería/barbería: hero cálido con foto de interior, galería protagonista, sección "La experiencia" antes que los servicios y FAQ de cita y servicios. Paleta carbón + dorado con tipografía serif de escaparate.',
    sectors: ['peluquería/barbería', 'peluqueria/barberia'],
    palette: {
      background: '#faf6f0',
      surface: '#fffdf9',
      primary: '#26221f',
      primaryDark: '#171412',
      accent: '#b98a2f',
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

/** The two templates must stay visually distinct (guarded by tests). */
export function templatesAreDistinct(a: WebsiteTemplate, b: WebsiteTemplate): boolean {
  return (
    a.palette.primary !== b.palette.primary &&
    a.palette.accent !== b.palette.accent &&
    a.fontHeading !== b.fontHeading &&
    a.sections.join('|') !== b.sections.join('|')
  );
}
