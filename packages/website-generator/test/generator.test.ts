import { describe, expect, it } from 'vitest';
import {
  buildWebsiteContent,
  extractInitials,
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

  it('contact form is demo-only: the note says it sends nothing anywhere', () => {
    const c = buildWebsiteContent(FERRER_INPUT);
    expect(c.contact.formNote).toMatch(/demostración/i);
    expect(c.contact.formNote).toMatch(/no envía nada/i);
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
