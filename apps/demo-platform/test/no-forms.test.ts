import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import App from '../src/App.js';
import { GENERATED_DEMOS } from '../src/data/generated-demos.js';
import { DEMO_NOTICE } from '@weblead/agent-designer';

/**
 * No-forms render test (rediseño 2026-11-17, orden de Jon).
 *
 * Renders every generated demo to HTML on the server (no browser) and
 * asserts the rendered page contains no form control and no text mentioning
 * a form, while keeping the direct contact channels (tel:, mailto: when the
 * dossier has an email, Google Maps link) and the mandatory demo notice.
 * The live-browser Playwright audit checks the same in a real Chromium.
 *
 * Puerta de clave (2026-11-17): la puerta solo cubre la página de
 * entrada; las demos son públicas y se renderizan sin desbloquear.
 * La puerta en sí se prueba en password-gate.test.ts. El único
 * formulario de la plataforma es el campo de la clave (en la entrada);
 * aquí se comprueba que las demos no tienen ninguno.
 */
function renderPath(pathname: string): string {
  (globalThis as unknown as { window: unknown }).window = {
    location: { pathname },
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  return renderToString(createElement(App));
}

/**
 * Nombre tal como lo pinta React en el HTML (3ª tanda): renderToString
 * escapa el apóstrofo como &#x27; — REFOYO'S y MADI'S solo aparecen así.
 */
function htmlName(name: string): string {
  return name.replaceAll("'", '&#x27;');
}

describe('demo-platform: no forms in any rendered demo (rediseño 2026-11-17)', () => {
  it('renders 36 demos (4ª tanda 2026-11-17: 27 + 10 nuevas, menos Madi\'s descartada)', () => {
    expect(GENERATED_DEMOS).toHaveLength(36);
  });

  for (const demo of GENERATED_DEMOS) {
    it(`${demo.content.businessSlug}: sin <form>/<input>/<textarea>/<select> ni mención a formularios`, () => {
      const html = renderPath(demo.demoUrl);
      expect(html).not.toMatch(/<form[\s>]/i);
      expect(html).not.toMatch(/<input[\s>]/i);
      expect(html).not.toMatch(/<textarea[\s>]/i);
      expect(html).not.toMatch(/<select[\s>]/i);
      expect(html).not.toMatch(/formulario/i);
      expect(html).not.toMatch(/Enviar/i);
      // Direct contact channels instead of the form: tel: only when the
      // dossier has a phone (Pelayo has none), Google Maps only when
      // it has an address, mailto: when it has an email — and at least
      // one direct channel in every demo.
      if (demo.content.contact.phone) {
        expect(html).toContain('href="tel:+34');
      }
      if (demo.content.contact.address) {
        expect(html).toContain('https://www.google.com/maps/search/?api=1&amp;query=');
      }
      if (demo.content.contact.email) {
        expect(html).toContain(`href="mailto:${demo.content.contact.email}"`);
      }
      expect(html.includes('href="tel:+34') || html.includes('href="mailto:')).toBe(true);
      // Mandatory conceptual-proposal notice, verbatim.
      expect(html).toContain(DEMO_NOTICE);
      // Business name and verified address are visible.
      expect(html).toContain(htmlName(demo.content.businessName));
      if (demo.content.contact.address) {
        expect(html).toContain(demo.content.contact.address);
      }
    });
  }

  it('dashboard: solo el formulario de la clave (la entrada es privada)', () => {
    const html = renderPath('/');
    // La página de entrada es la puerta de clave: su único formulario
    // es el campo de la clave. No hay formularios de contacto.
    expect(html).toContain('Clave de acceso');
    expect(html.match(/<form[\s>]/gi)?.length).toBe(1);
    expect(html).not.toMatch(/formulario/i);
    expect(html).toContain(DEMO_NOTICE);
  });
});
