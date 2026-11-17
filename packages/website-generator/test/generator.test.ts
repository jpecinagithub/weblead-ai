import { describe, expect, it } from 'vitest';
import {
  buildWebsiteContent,
  extractFoundedYear,
  extractInitials,
  extractReviewSummary,
  mapsHrefFor,
  sanitizeActivitySignal,
  validateNoInventedClaims,
  whatsappHrefFor,
} from '../src/index.js';
import { BEGONA_INPUT, FERRER_INPUT } from './fixtures.js';
describe('generator: real dossier data, nothing invented', () => {
  it('uses only dossier facts for name, address, phone, email', () => {
    const c = buildWebsiteContent(FERRER_INPUT);
    expect(c.businessName).toBe('Santiago Ferrer Fontanería en General SL');
    expect(c.contact.address).toBe('C/ Gonzalo de Berceo, 8, 3-D, 26005 Logroño');
    expect(c.contact.phone).toBe('941227157');
    expect(c.contact.phoneHref).toBe('tel:+34941227157');
    expect(c.contact.email).toBe('sanfefo@terra.com');
    expect(c.hero.title).toBe('Santiago Ferrer Fontanería en General SL');
    expect(c.seo.sitemapEntries).toContain('/demos/santiago-ferrer-fontaneria-en-general-sl-logrono');
    expect(c.seo.title).toContain('Santiago Ferrer');
  });

  it('with no contrasted services it says so instead of inventing a list', () => {
    const c = buildWebsiteContent(FERRER_INPUT);
    expect(c.services.items).toEqual([]);
    expect(c.services.pendingConfirmation).toBe(true);
    expect(c.services.note).toMatch(/pendientes de confirmar/i);
    expect(c.services.note).not.toMatch(/reparaci|instalaci|desatasco/i);
  });

  it('lists only contrasted services when the dossier has them', () => {
    const c = buildWebsiteContent({ ...FERRER_INPUT, services: ['Reparación de grifería'] });
    expect(c.services.items).toEqual(['Reparación de grifería']);
    expect(c.services.pendingConfirmation).toBe(false);
  });

  it('picks the sector template and keeps the two businesses visually distinct', () => {
    const plumbing = buildWebsiteContent(FERRER_INPUT);
    const hair = buildWebsiteContent(BEGONA_INPUT);
    expect(plumbing.templateId).toBe('fontaneria-climatizacion');
    expect(hair.templateId).toBe('peluqueria-barberia');
    expect(plumbing.brand.palette.primary).not.toBe(hair.brand.palette.primary);
    expect(plumbing.brand.fontHeading).not.toBe(hair.brand.fontHeading);
    expect(plumbing.howItWorks).not.toBeNull();
    expect(hair.howItWorks).toBeNull();
    expect(plumbing.brand.logoText).toBe('SF');
    expect(hair.brand.logoText).toBe('BR');
  });

  it('every asset carries licence + source; logo is a conceptual own SVG', () => {
    const c = buildWebsiteContent(FERRER_INPUT);
    expect(c.assets.length).toBeGreaterThanOrEqual(4); // logo + 3 photos
    for (const a of c.assets) {
      expect(a.license.length).toBeGreaterThan(0);
      expect(a.source.length).toBeGreaterThan(0);
    }
    expect(c.assets[0]!.kind).toBe('LOGO');
    expect(c.assets[0]!.url.startsWith('data:image/svg+xml')).toBe(true);
    // Images are served locally; provenance (Unsplash URL) stays in source.
    expect(c.gallery.images.every((i) => i.url.startsWith('/images/') && i.url.endsWith('.jpg'))).toBe(true);
    expect(
      c.gallery.images.every((i) => i.source.startsWith('https://images.unsplash.com/photo-')),
    ).toBe(true);
    expect(c.seo.ogImage?.startsWith('https://images.unsplash.com/photo-')).toBe(true);
  });

  it('contact has NO form at all (rediseño 2026-11-17): tel/mailto/address/Maps only', () => {
    const c = buildWebsiteContent(FERRER_INPUT);
    // The formNote field is gone from the type; a stale object carrying it
    // must be caught, so assert on the serialized content too.
    expect('formNote' in c.contact).toBe(false);
    expect(JSON.stringify(c)).not.toMatch(/formNote|formulario|<form|<input|<textarea/i);
    expect(c.contact.mapsHref).toBe(
      'https://www.google.com/maps/search/?api=1&query=C%2F%20Gonzalo%20de%20Berceo%2C%208%2C%203-D%2C%2026005%20Logro%C3%B1o',
    );
    expect(mapsHrefFor(null)).toBeNull();
    expect(buildWebsiteContent({ ...FERRER_INPUT, address: null }).contact.mapsHref).toBeNull();
  });

  it('assigns a deterministic per-business variant (same slug, same variant)', () => {
    const a = buildWebsiteContent(FERRER_INPUT);
    const b = buildWebsiteContent(FERRER_INPUT);
    expect(a.brand.variantId).toBe(b.brand.variantId);
    expect(a.brand.heroLayout).toBe(b.brand.heroLayout);
    expect(a.brand.variantId).toMatch(/^fontaneria-climatizacion-v[012]$/);
    expect(['banner', 'split', 'card']).toContain(a.brand.heroLayout);
    // Variant accent overrides the sector default; the logo uses it.
    expect(a.brand.palette.accent).not.toBe('#c67a2e');
    expect(a.brand.logoSvgDataUri).toContain(`%23${a.brand.palette.accent.slice(1)}`);
    const hair = buildWebsiteContent(BEGONA_INPUT);
    expect(hair.brand.variantId).toMatch(/^peluqueria-barberia-v[012]$/);
    expect(hair.brand.variantId).not.toBe(a.brand.variantId);
  });

  it('extracts verified review figures and founding year from the signal, verbatim', () => {
    expect(extractReviewSummary('Datos verificados 05/05/2026; 33 reseñas, 4,9/5')).toEqual({
      count: 33,
      rating: '4,9',
    });
    expect(extractReviewSummary("Reseñas 'hace un mes' (~oct 2026); 5,0/5, 16 reseñas")).toEqual({
      count: 16,
      rating: '5,0',
    });
    expect(extractReviewSummary('Booksy en vivo: 335 reseñas, 5,0/5; agenda Yeasy activa')).toEqual({
      count: 335,
      rating: '5,0',
    });
    expect(extractReviewSummary('Solo directorios, sin reseñas ni fecha')).toBeNull();
    expect(extractFoundedYear('SL, 10 empleados, constituida 1994')).toBe(1994);
    expect(extractFoundedYear('Sin fecha de constitución')).toBeNull();
    const ferrer = buildWebsiteContent(FERRER_INPUT);
    expect(ferrer.verified).toEqual({ reviews: null, foundedYear: 1994 });
    const begona = buildWebsiteContent(BEGONA_INPUT);
    expect(begona.verified).toEqual({ reviews: { count: 33, rating: '4,9' }, foundedYear: null });
  });

  it('WhatsApp only for a verified public Spanish phone', () => {
    expect(whatsappHrefFor('941227157')).toBe('https://wa.me/34941227157');
    expect(whatsappHrefFor(null)).toBeNull();
    expect(whatsappHrefFor('123')).toBeNull();
    expect(buildWebsiteContent({ ...FERRER_INPUT, phone: null }).contact.whatsappHref).toBeNull();
  });
});

describe('forbidden-claims validation (LLM drafts included)', () => {
  it('flags prices, years, testimonials, superlatives, certifications, hours', () => {
    expect(validateNoInventedClaims('Precios desde 10 €')).toContain('precio');
    expect(validateNoInventedClaims('50 años de experiencia')).toContain('años de experiencia');
    expect(validateNoInventedClaims('Miles de clientes satisfechos')).toContain('testimonio/clientes');
    expect(validateNoInventedClaims('La mejor fontanería de España')).toContain('superlativo');
    expect(validateNoInventedClaims('Empresa certificada ISO 9001')).toContain('certificación/garantía');
    expect(validateNoInventedClaims('Abierto de 9 a 20')).toContain('horario');
    expect(validateNoInventedClaims('Fontanería en Logroño. Llámanos.')).toEqual([]);
  });

  it('rejects an LLM subtitle with a price and falls back to deterministic copy', () => {
    const c = buildWebsiteContent(FERRER_INPUT, undefined, {
      subtitle: 'Fontanería en Logroño desde 10 €, la mejor de España',
    });
    expect(c.llm.used).toBe(true);
    expect(c.llm.acceptedSubtitle).toBe(false);
    expect(c.llm.rejections.join(' ')).toMatch(/precio|superlativo/);
    expect(c.hero.subtitle).toBe(
      'fontanería/climatización en Logroño. Contacto directo por teléfono, sin intermediarios.',
    );
    expect(validateNoInventedClaims(c.hero.subtitle)).toEqual([]);
  });

  it('rejects an LLM about paragraph with invented years of experience', () => {
    const c = buildWebsiteContent(FERRER_INPUT, undefined, {
      about: 'Con 50 años de experiencia y miles de clientes satisfechos en Logroño.',
    });
    expect(c.llm.acceptedAbout).toBe(false);
    expect(c.about.paragraphs).toHaveLength(1);
    expect(c.about.paragraphs[0]).toContain('Santiago Ferrer');
  });

  it('accepts a clean LLM draft that only restates dossier facts', () => {
    const c = buildWebsiteContent(FERRER_INPUT, undefined, {
      subtitle: 'Santiago Ferrer, fontanería en Logroño: llama y te atendemos directamente.',
      about: 'Santiago Ferrer Fontanería en General SL trabaja en Logroño y su actividad está verificada.',
    });
    expect(c.llm.acceptedSubtitle).toBe(true);
    expect(c.llm.acceptedAbout).toBe(true);
    expect(c.llm.rejections).toEqual([]);
    expect(c.hero.subtitle).toContain('Santiago Ferrer');
    expect(c.about.paragraphs).toHaveLength(2);
  });

  it('sanitizes an activity signal: keeps only sentences free of forbidden claims', () => {
    // Nuria (Fase F): the verbatim dossier signal trips the 'horario'
    // pattern ("Ficha activa con horarios") although no hours are stated.
    const signal =
      "Ficha activa con horarios; última evidencia dura 2017-2018 (oferta Colectivia, Carné Joven). Un directorio menciona 'página web disponible' sin URL: no verificada.";
    const clean = sanitizeActivitySignal(signal);
    expect(validateNoInventedClaims(clean)).toEqual([]);
    expect(clean).toContain('2017-2018');
    expect(clean).not.toMatch(/horario/i);
    expect(sanitizeActivitySignal('Abierto de 9 a 20.')).toBe('');
  });

  it('emits no trust item with a forbidden claim, even from the dossier signal', () => {
    const c = buildWebsiteContent({
      ...FERRER_INPUT,
      activitySignal:
        "Ficha activa con horarios; última evidencia dura 2017-2018 (oferta Colectivia, Carné Joven).",
    });
    for (const item of c.trust.items) expect(validateNoInventedClaims(item)).toEqual([]);
    expect(c.trust.items.some((i) => i.includes('2017-2018'))).toBe(true);
    expect(c.trust.items.some((i) => /horario/i.test(i))).toBe(false);
  });

  it('throws for an unknown sector (no generic fallback template)', () => {
    expect(() => buildWebsiteContent({ ...FERRER_INPUT, sector: 'sector desconocido' })).toThrow(
      /No website template/,
    );
  });

  it('extracts initials without stop-words or legal suffixes', () => {
    expect(extractInitials('Santiago Ferrer Fontanería en General SL')).toBe('SF');
    expect(extractInitials('Begoña Ruiz Peluquería')).toBe('BR');
  });
});
