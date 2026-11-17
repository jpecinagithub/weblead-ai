import { describe, expect, it } from 'vitest';
import {
  TEMPLATES,
  contrastRatio,
  getTemplate,
  templateForSector,
  templatesAreDistinct,
  variantForSlug,
} from '../src/index.js';

describe('website-templates (Fase D + 2ª/3ª tanda: eight real sector templates, not one generic)', () => {
  it('ships exactly the eight sector templates', () => {
    expect(TEMPLATES.map((t) => t.id).sort()).toEqual([
      'cerrajeria',
      'electricista',
      'fontaneria-climatizacion',
      'jardineria',
      'oficios-hogar',
      'peluqueria-barberia',
      'salud-fisioterapia',
      'taller-mecanico',
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
    expect(templateForSector('pintura/decoración')?.id).toBe('oficios-hogar');
    expect(templateForSector('carpintería')?.id).toBe('oficios-hogar');
    // 3ª tanda (Zamora/Ávila/Cuenca/Soria): formas saneadas, sin "24h" ni "urgencias".
    expect(templateForSector('mecánica general')?.id).toBe('taller-mecanico');
    expect(templateForSector('chapa y pintura')?.id).toBe('taller-mecanico');
    expect(templateForSector('taller vehículos + maquinaria agrícola husqvarna')?.id).toBe('taller-mecanico');
    expect(templateForSector('reparación servicio / electricidad')?.id).toBe('taller-mecanico');
    expect(templateForSector('fisioterapia + pilates terapéutico')?.id).toBe('salud-fisioterapia');
    expect(templateForSector('fisioterapia + neuromodulación nesa')?.id).toBe('salud-fisioterapia');
    expect(templateForSector('fisioterapia manual')?.id).toBe('salud-fisioterapia');
    expect(templateForSector('fisioterapia + feldenkrais')?.id).toBe('salud-fisioterapia');
    expect(templateForSector('electricista + placas solares')?.id).toBe('electricista');
    expect(templateForSector('electricista')?.id).toBe('electricista');
    expect(templateForSector('cerrajería/herrería')?.id).toBe('cerrajeria');
    expect(templateForSector('jardinería/paisajismo')?.id).toBe('jardineria');
    expect(templateForSector('sector desconocido')).toBeUndefined();
  });

  it('3rd-batch templates: howItWorks where it belongs, distinct palettes across all eight', () => {
    // Taller, electricista, cerrajería y jardinería llevan "Cómo
    // trabajamos"; fisioterapia no (como peluquería).
    for (const id of ['taller-mecanico', 'electricista', 'cerrajeria', 'jardineria']) {
      expect(getTemplate(id)!.sections).toContain('howItWorks');
    }
    expect(getTemplate('salud-fisioterapia')!.sections).not.toContain('howItWorks');
    // Every pair of templates is visually distinct (palette, fonts,
    // section order) — not a colour swap.
    for (let i = 0; i < TEMPLATES.length; i++) {
      for (let j = i + 1; j < TEMPLATES.length; j++) {
        expect(templatesAreDistinct(TEMPLATES[i]!, TEMPLATES[j]!)).toBe(true);
      }
    }
    // Each palette field is unique across the eight templates.
    for (const field of ['primary', 'accent', 'background', 'surface', 'text', 'muted'] as const) {
      const values = TEMPLATES.map((t) => t.palette[field]);
      expect(new Set(values).size).toBe(TEMPLATES.length);
    }
    for (const t of TEMPLATES) {
      expect(t.faq.length).toBeGreaterThanOrEqual(3);
    }
    // 3ª tanda: el kicker no lleva localidad (el generador añade
    // " en {municipio}"). Las 3 plantillas anteriores conservan su
    // kicker con Logroño y no se tocan.
    for (const id of ['taller-mecanico', 'salud-fisioterapia', 'electricista', 'cerrajeria', 'jardineria']) {
      expect(getTemplate(id)!.heroKicker).not.toMatch(/Logroño|Zamora|Ávila|Cuenca|Soria/i);
    }
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

  it('no user-visible template text mentions any form (rediseño 2026-11-17: contact is direct only)', () => {
    // Only strings the demo renders (FAQ + hero kicker). The template
    // `description` is internal metadata, not rendered copy.
    for (const t of TEMPLATES) {
      const visible = [t.heroKicker, ...t.faq.flatMap((f) => [f.question, f.answer])].join(' ');
      expect(visible).not.toMatch(/formulario|<form|input|textarea|Enviar/i);
    }
  });

  it('each template ships 3 curated variants with distinct accents and hero layouts', () => {
    for (const t of TEMPLATES) {
      expect(t.variants).toHaveLength(3);
      const accents = t.variants.map((v) => v.accent);
      expect(new Set(accents).size).toBe(3);
      const layouts = t.variants.map((v) => v.heroLayout);
      expect(new Set(layouts).size).toBeGreaterThanOrEqual(2);
      expect(t.variants.map((v) => v.id)).toEqual(
        accents.map((_, i) => `${t.id}-v${i}`),
      );
      // Variant accents are dark enough to carry text on the template
      // background (WCAG AA for normal text, >= 4.5:1).
      for (const v of t.variants) {
        expect(contrastRatio(v.accent, t.palette.background)).toBeGreaterThanOrEqual(4.5);
      }
      // And the sector primary still carries white CTA text.
      expect(contrastRatio('#ffffff', t.palette.primary)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('variantForSlug is deterministic and spreads the 10 pilot slugs across variants', () => {
    const plumbing = getTemplate('fontaneria-climatizacion')!;
    const slugs = [
      'santiago-ferrer-fontaneria-en-general-sl-logrono',
      'hidrorioja-sc-logrono',
      'expert-fontaneros-logrono-logrono',
      'fontaneria-la-moderna-logrono',
      'fontaneria-chuchi-logrono',
    ];
    const picked = slugs.map((s) => variantForSlug(plumbing, s).id);
    expect(slugs.map((s) => variantForSlug(plumbing, s).id)).toEqual(picked);
    expect(new Set(picked).size).toBeGreaterThanOrEqual(2);
    const hair = getTemplate('peluqueria-barberia')!;
    const hairSlugs = [
      'begona-ruiz-peluqueria-logrono',
      'avalon-stilistas-logrono',
      'lumberjack-barbershop-logrono',
      'star-barber-shop-logrono',
      'peluqueria-nuria-logrono',
    ];
    expect(new Set(hairSlugs.map((s) => variantForSlug(hair, s).id)).size).toBeGreaterThanOrEqual(2);
  });
});
