import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import App from '../src/App.js';
import { GENERATED_DEMOS } from '../src/data/generated-demos.js';
import { DEMO_NOTICE } from '@weblead/agent-designer';
import {
  PASSWORD_HASH,
  checkPassword,
  isUnlocked,
  lock,
  markUnlocked,
  sha256Hex,
} from '../src/password-gate.js';

/**
 * Puerta de clave SOLO para la página de entrada (orden de Jon
 * 2026-11-17; corrección: antes la puerta cubría también las demos).
 * El índice solo lo ve quien tiene la clave (Jon); las demos
 * individuales son públicas y se ven SIN clave. La clave se pide
 * siempre al abrir el índice (sin persistencia).
 *
 * La clave nunca aparece en texto plano en este fichero salvo como
 * entrada de la prueba de `checkPassword` (la propia clave que el
 * usuario escribiría); el hash guardado se compara contra vectores
 * conocidos y contra la función real.
 */
function renderPath(pathname: string, unlocked: boolean): string {
  (globalThis as unknown as { window: unknown }).window = {
    location: { pathname },
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  // El desbloqueo es memoria de la carga actual: cada render empieza
  // bloqueado y solo se desbloquea si la prueba lo marca.
  lock();
  if (unlocked) markUnlocked();
  return renderToString(createElement(App));
}

describe('demo-platform: puerta de clave (orden de Jon 2026-11-17)', () => {
  it('sha256Hex coincide con vectores conocidos', async () => {
    expect(await sha256Hex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    expect(await sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('el hash guardado es un SHA-256 hex, no la clave en texto plano', () => {
    expect(PASSWORD_HASH).toMatch(/^[0-9a-f]{64}$/);
    expect(PASSWORD_HASH).not.toContain('demo');
  });

  it('checkPassword: la clave correcta pasa y cualquier otra no', async () => {
    // La entrada de la prueba es la propia clave que escribiría el usuario.
    expect(await checkPassword('demo2026')).toBe(true);
    expect(await checkPassword('Demo2026')).toBe(false);
    expect(await checkPassword('demo2025')).toBe(false);
    expect(await checkPassword('')).toBe(false);
  });

  it('isUnlocked/markUnlocked/lock usan solo memoria de la carga actual', () => {
    lock();
    expect(isUnlocked()).toBe(false);
    markUnlocked();
    expect(isUnlocked()).toBe(true);
    lock();
    expect(isUnlocked()).toBe(false);
  });

  it('sin desbloquear: el índice no muestra ninguna empresa', () => {
    const html = renderPath('/', false);
    expect(html).toContain('Clave de acceso');
    expect(html).toContain(DEMO_NOTICE);
    for (const demo of GENERATED_DEMOS) {
      expect(html).not.toContain(demo.content.businessName);
    }
    expect(html).not.toContain('Ver demo');
  });

  for (const demo of GENERATED_DEMOS) {
    it(`la demo ${demo.content.businessSlug} se ve SIN clave (pública)`, () => {
      const html = renderPath(demo.demoUrl, false);
      expect(html).not.toContain('Clave de acceso');
      expect(html).toContain(demo.content.businessName);
      expect(html).toContain(DEMO_NOTICE);
      expect(html).toContain('href="tel:+34');
      // Las demos no tienen ningún formulario (el de la clave solo
      // existe en la página de entrada, no aquí).
      expect(html).not.toMatch(/<form[\s>]/i);
      expect(html).not.toMatch(/<textarea[\s>]/i);
      if (demo.content.contact.email) {
        expect(html).toContain(demo.content.contact.email);
      }
    });
  }

  it('desbloqueada: el índice muestra las 10 demos con su enlace', () => {
    const html = renderPath('/', true);
    expect(html).not.toContain('Clave de acceso');
    for (const demo of GENERATED_DEMOS) {
      expect(html).toContain(demo.content.businessName);
      expect(html).toContain(`href="${demo.demoUrl}"`);
    }
    expect(html).toContain('Ver demo');
  });
});
