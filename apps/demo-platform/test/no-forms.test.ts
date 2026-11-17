import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import App from '../src/App.js';
import { GENERATED_DEMOS } from '../src/data/generated-demos.js';
import { DEMO_NOTICE } from '@weblead/agent-designer';
import { STORAGE_KEY } from '../src/password-gate.js';

/**
 * No-forms render test (rediseño 2026-11-17, orden de Jon).
 *
 * Renders every generated demo to HTML on the server (no browser) and
 * asserts the rendered page contains no form control and no text mentioning
 * a form, while keeping the direct contact channels (tel:, mailto: when the
 * dossier has an email, Google Maps link) and the mandatory demo notice.
 * The live-browser Playwright audit checks the same in a real Chromium.
 *
 * Puerta de clave (2026-11-17): las demos se renderizan con la puerta
 * desbloqueada (sessionStorage), porque sin desbloquear no se ve el
 * contenido de ninguna demo. La puerta en sí se prueba en
 * password-gate.test.ts. El único formulario de la plataforma es el
 * campo de la clave; aquí se comprueba que las demos no tienen ninguno.
 */
function makeSessionStorage(unlocked: boolean) {
  const store = new Map<string, string>(
    unlocked ? [[STORAGE_KEY, '1']] : [],
  );
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };
}

function renderPath(pathname: string): string {
  (globalThis as unknown as { window: unknown }).window = {
    location: { pathname },
    // Puerta desbloqueada: se prueba el contenido de la demo, no la puerta.
    sessionStorage: makeSessionStorage(true),
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  return renderToString(createElement(App));
}

describe('demo-platform: no forms in any rendered demo (rediseño 2026-11-17)', () => {
  it('renders 10 demos', () => {
    expect(GENERATED_DEMOS).toHaveLength(10);
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
      // Direct contact channels instead of the form.
      expect(html).toContain('href="tel:+34');
      expect(html).toContain('https://www.google.com/maps/search/?api=1&amp;query=');
      if (demo.content.contact.email) {
        expect(html).toContain(`href="mailto:${demo.content.contact.email}"`);
      }
      // Mandatory conceptual-proposal notice, verbatim.
      expect(html).toContain(DEMO_NOTICE);
      // Business name and verified address are visible.
      expect(html).toContain(demo.content.businessName);
      if (demo.content.contact.address) {
        expect(html).toContain(demo.content.contact.address);
      }
    });
  }

  it('dashboard: sin formularios', () => {
    const html = renderPath('/');
    expect(html).not.toMatch(/<form[\s>]/i);
    expect(html).not.toMatch(/<input[\s>]/i);
    expect(html).not.toMatch(/formulario/i);
    expect(html).toContain(DEMO_NOTICE);
  });
});
