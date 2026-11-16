import { describe, expect, it } from 'vitest';
import { TEMPLATES, getTemplate, templateForSector, templatesAreDistinct } from '../src/index.js';

describe('website-templates (Fase D: two real sector templates, not one generic)', () => {
  it('ships exactly the two sector templates', () => {
    expect(TEMPLATES.map((t) => t.id).sort()).toEqual([
      'fontaneria-climatizacion',
      'peluqueria-barberia',
    ]);
    expect(getTemplate('placeholder')).toBeUndefined();
  });

  it('templates are differentiated: palette, fonts, section order, FAQ', () => {
    const plumbing = getTemplate('fontaneria-climatizacion')!;
    const hair = getTemplate('peluqueria-barberia')!;
    expect(templatesAreDistinct(plumbing, hair)).toBe(true);
    expect(plumbing.palette.primary).not.toBe(hair.palette.primary);
    expect(plumbing.palette.accent).not.toBe(hair.palette.accent);
    expect(plumbing.fontHeading).not.toBe(hair.fontHeading);
    // Plumbing leads with contact/trust and a how-it-works section; hair
    // leads with the gallery. Different layout, not a colour swap.
    expect(plumbing.sections).toContain('howItWorks');
    expect(hair.sections).not.toContain('howItWorks');
    expect(hair.sections.indexOf('gallery')).toBeLessThan(hair.sections.indexOf('services'));
    expect(plumbing.sections.indexOf('gallery')).toBeGreaterThan(plumbing.sections.indexOf('services'));
    const plumbingFaq = plumbing.faq.map((f) => f.question).join('|');
    const hairFaq = hair.faq.map((f) => f.question).join('|');
    expect(plumbingFaq).not.toBe(hairFaq);
    expect(plumbing.faq.length).toBeGreaterThanOrEqual(3);
    expect(hair.faq.length).toBeGreaterThanOrEqual(3);
  });

  it('maps pilot sectors to the right template', () => {
    expect(templateForSector('fontanería/climatización')?.id).toBe('fontaneria-climatizacion');
    expect(templateForSector('peluquería/barbería')?.id).toBe('peluqueria-barberia');
    expect(templateForSector('sector desconocido')).toBeUndefined();
  });

  it('every template has a hero photo and gallery photos, served locally with Unsplash provenance', () => {
    for (const t of TEMPLATES) {
      expect(t.photos.filter((p) => p.placement === 'hero').length).toBe(1);
      expect(t.photos.filter((p) => p.placement === 'gallery').length).toBeGreaterThanOrEqual(2);
      for (const p of t.photos) {
        // Served from the demo-platform itself (the VM browser cannot reach
        // images.unsplash.com); provenance stays in sourceUrl.
        expect(p.url.startsWith('/images/')).toBe(true);
        expect(p.url.endsWith('.jpg')).toBe(true);
        expect(p.sourceUrl.startsWith('https://images.unsplash.com/photo-')).toBe(true);
        expect(p.caption.length).toBeGreaterThan(0);
      }
    }
  });

  it('FAQ answers never assert prices, hours or services', () => {
    for (const t of TEMPLATES) {
      for (const f of t.faq) {
        // "horarios" appears only negated ("no publica horarios"); an
        // asserted opening-hours range would match the second pattern.
        expect(f.answer).not.toMatch(/€|desde \d+\s*€/i);
        expect(f.answer).not.toMatch(/abierto de \d|de \d{1,2}(:\d{2})? a \d{1,2} h/i);
      }
    }
  });
});
