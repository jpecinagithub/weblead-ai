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
 * del email de oferta enviado el 17 nov 2026. Primera tanda (50 €):
 * 9 ofertas enviadas sin respuesta y 1 rebote (Pintor Roberto,
 * dirección no encontrada). Tercera tanda (75 €, 2026-11-17):
 * 16 ofertas enviadas sin respuesta y 1 rebote (Peluquería Madi's,
 * dirección no encontrada). Totales: 25 enviadas, 2 rebotes,
 * 0 respuestas. El seguimiento solo se ve tras la clave, nunca en
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

  it('25 ofertas enviadas, 2 rebotes (Roberto y Madi\'s) y 0 pendientes', () => {
    const statuses = Object.values(OUTREACH).map((entry) => entry.status);
    expect(statuses.filter((s) => s === 'sent')).toHaveLength(25);
    expect(statuses.filter((s) => s === 'bounced')).toHaveLength(2);
    expect(statuses.filter((s) => s === 'pending')).toHaveLength(0);
    expect(
      OUTREACH['pintor-logrono-roberto-decoracion-logrono'],
    ).toMatchObject({ status: 'bounced', note: 'dirección no encontrada' });
    expect(
      OUTREACH['peluqueria-madi-s-villaralbo'],
    ).toMatchObject({ status: 'bounced', note: 'dirección no encontrada' });
    expect(outreachLabel('peluqueria-madi-s-villaralbo')).toContain(
      'Rebotado',
    );
    expect(outreachLabel('moises-munoz-s-l-logrono')).toContain('Oferta enviada');
    expect(outreachLabel('fontaneria-pelayo-villaralbo')).toContain('Oferta enviada');
  });

  it('desbloqueado: el índice muestra el seguimiento de los 27', () => {
    const html = renderPath('/', true);
    // Cada etiqueta se pinta dos veces: fila de la tabla + tarjeta.
    expect(count(html, 'Oferta enviada')).toBe(50);
    expect(count(html, 'Rebotado')).toBe(4);
    expect(count(html, 'Pendiente de contacto')).toBe(0);
    expect(count(html, 'dirección no encontrada')).toBe(4);
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
    // Sin 'pill-neutral': ya no queda ningún proyecto pendiente de
    // contacto (25 enviados + 2 rebotados). La clase sigue existiendo
    // en CSS y outreachClass la devuelve para futuros pendientes.
  });

  it('bloqueado: el índice no muestra ningún seguimiento', () => {
    const html = renderPath('/', false);
    expect(html).not.toContain('Oferta enviada');
    expect(html).not.toContain('Rebotado');
    expect(html).not.toContain('Seguimiento');
  });
});
