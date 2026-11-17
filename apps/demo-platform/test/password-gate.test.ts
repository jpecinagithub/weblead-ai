import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import App from '../src/App.js';
import { GENERATED_DEMOS } from '../src/data/generated-demos.js';
import { DEMO_NOTICE } from '@weblead/agent-designer';
import {
  PASSWORD_HASH,
  STORAGE_KEY,
  checkPassword,
  isUnlocked,
  markUnlocked,
  sha256Hex,
} from '../src/password-gate.js';

/**
 * Puerta de clave (orden de Jon 2026-11-17).
 *
 * Sin desbloquear no se renderiza ningún contenido de las demos (ni el
 * índice ni las fichas); con la clave correcta sí. La clave nunca aparece
 * en texto plano en este fichero salvo como entrada de la prueba de
 * `checkPassword` (la propia clave que el usuario escribiría); el hash
 * guardado se compara contra vectores conocidos y contra la función real.
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

function renderPath(pathname: string, unlocked: boolean): string {
  (globalThis as unknown as { window: unknown }).window = {
    location: { pathname },
    sessionStorage: makeSessionStorage(unlocked),
    addEventListener: () => {},
    removeEventListener: () => {},
  };
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

  it('isUnlocked/markUnlocked usan sessionStorage', () => {
    (globalThis as unknown as { window: unknown }).window = {
      sessionStorage: makeSessionStorage(false),
    };
    expect(isUnlocked()).toBe(false);
    markUnlocked();
    expect(isUnlocked()).toBe(true);
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
    it(`sin desbloquear: ${demo.content.businessSlug} no muestra contenido de la demo`, () => {
      const html = renderPath(demo.demoUrl, false);
      expect(html).toContain('Clave de acceso');
      expect(html).not.toContain(demo.content.businessName);
      expect(html).not.toContain('href="tel:+34');
      if (demo.content.contact.email) {
        expect(html).not.toContain(demo.content.contact.email);
      }
    });

    it(`desbloqueada: ${demo.content.businessSlug} sí muestra la demo sin formulario de contacto`, () => {
      const html = renderPath(demo.demoUrl, true);
      expect(html).toContain(demo.content.businessName);
      expect(html).toContain(DEMO_NOTICE);
      expect(html).toContain('href="tel:+34');
      expect(html).not.toContain('Clave de acceso');
      // La puerta es el único formulario de la plataforma; desbloqueada
      // no queda ningún <form> en la demo.
      expect(html).not.toMatch(/<form[\s>]/i);
      expect(html).not.toMatch(/<textarea[\s>]/i);
    });
  }

  it('desbloqueada: el índice muestra las 10 demos', () => {
    const html = renderPath('/', true);
    expect(html).not.toContain('Clave de acceso');
    for (const demo of GENERATED_DEMOS) {
      expect(html).toContain(demo.content.businessName);
    }
  });
});
