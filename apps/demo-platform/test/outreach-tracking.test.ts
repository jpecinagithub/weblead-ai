import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import App from '../src/App.js';
import { GENERATED_DEMOS } from '../src/data/generated-demos.js';
import { OUTREACH, outreachLabel } from '../src/data/outreach.js';
import { lock, markUnlocked } from '../src/password-gate.js';

/**
 * Seguimiento de la primera tanda de contactos (orden de Jon
 * 2026-11-17): el índice privado muestra, por proyecto, el estado
 * del email de oferta (50 €) enviado el 17 nov 2026. 9 ofertas
 * enviadas sin respuesta y 1 rebote (Pintor Roberto, dirección no
 * encontrada). El seguimiento solo se ve tras la clave, nunca en
 * las demos públicas.
 */
function renderPath(pathname: string, unlocked: boolean): string {
  (globalThis as unknown as { window: unknown }).window = {
    location: { pathname },
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  lock();
  if (unlocked) markUnlocked();
  return renderToString(createElement(App));
}

function count(html: string, needle: string): number {
  return html.split(needle).length - 1;
}

describe('demo-platform: seguimiento de contactos en el índice privado', () => {
  it('cada demo tiene un estado de seguimiento', () => {
    for (const demo of GENERATED_DEMOS) {
      expect(OUTREACH[demo.content.businessSlug]).toBeDefined();
    }
  });

  it('9 ofertas enviadas y 1 rebote (Roberto, dirección no encontrada)', () => {
    const statuses = Object.values(OUTREACH).map((entry) => entry.status);
    expect(statuses.filter((s) => s === 'sent')).toHaveLength(9);
    expect(statuses.filter((s) => s === 'bounced')).toHaveLength(1);
    expect(
      OUTREACH['pintor-logrono-roberto-decoracion-logrono'],
    ).toMatchObject({ status: 'bounced', note: 'dirección no encontrada' });
    expect(outreachLabel('pintor-logrono-roberto-decoracion-logrono')).toContain(
      'Rebotado',
    );
    expect(outreachLabel('moises-munoz-s-l-logrono')).toContain('Oferta enviada');
  });

  it('desbloqueado: el índice muestra el seguimiento de los 10', () => {
    const html = renderPath('/', true);
    // Cada etiqueta se pinta dos veces: fila de la tabla + tarjeta.
    expect(count(html, 'Oferta enviada')).toBe(18);
    expect(count(html, 'Rebotado')).toBe(2);
    expect(count(html, 'dirección no encontrada')).toBe(2);
    expect(html).toContain('Seguimiento');
  });

  it('desbloqueado: el índice muestra el resumen y las píldoras de estado', () => {
    const html = renderPath('/', true);
    expect(html).toContain('Esperando respuesta');
    expect(html).toContain('Rebotes');
    expect(html).toContain('Respuestas');
    expect(html).toContain('pill-sent');
    expect(html).toContain('pill-bounced');
    expect(html).toContain('pill-ok');
  });

  it('bloqueado: el índice no muestra ningún seguimiento', () => {
    const html = renderPath('/', false);
    expect(html).not.toContain('Oferta enviada');
    expect(html).not.toContain('Rebotado');
    expect(html).not.toContain('Seguimiento');
  });
});
