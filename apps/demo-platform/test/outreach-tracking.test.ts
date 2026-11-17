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
 * dirección no encontrada). Cuarta tanda (75 €, 2026-11-17):
 * 8 ofertas enviadas sin respuesta y 2 rebotes (Centro de Estudios,
 * dominio no encontrado; Talleres Sivi, dirección no encontrada).
 * Totales: 33 enviadas, 4 rebotes, 0 pendientes, 0 respuestas.
 * El seguimiento solo se ve tras la clave, nunca en
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

  it('33 ofertas enviadas, 4 rebotes (Roberto, Madi\'s, Centro de Estudios y Sivi) y 0 pendientes', () => {
    const statuses = Object.values(OUTREACH).map((entry) => entry.status);
    expect(statuses.filter((s) => s === 'sent')).toHaveLength(33);
    expect(statuses.filter((s) => s === 'bounced')).toHaveLength(4);
    expect(statuses.filter((s) => s === 'pending')).toHaveLength(0);
    expect(
      OUTREACH['pintor-logrono-roberto-decoracion-logrono'],
    ).toMatchObject({ status: 'bounced', note: 'dirección no encontrada' });
    expect(
      OUTREACH['peluqueria-madi-s-villaralbo'],
    ).toMatchObject({ status: 'bounced', note: 'dirección no encontrada' });
    expect(
      OUTREACH['centro-de-estudios-soria'],
    ).toMatchObject({ status: 'bounced', note: 'dirección no encontrada' });
    expect(
      OUTREACH['talleres-sivi-arenas-de-san-pedro'],
    ).toMatchObject({ status: 'bounced', note: 'dirección no encontrada' });
    expect(outreachLabel('peluqueria-madi-s-villaralbo')).toContain(
      'Rebotado',
    );
    expect(outreachLabel('centro-de-estudios-soria')).toContain(
      'Rebotado',
    );
    expect(outreachLabel('moises-munoz-s-l-logrono')).toContain('Oferta enviada');
    expect(outreachLabel('fontaneria-pelayo-villaralbo')).toContain('Oferta enviada');
  });

  it('desbloqueado: el índice muestra el seguimiento de los 37', () => {
    const html = renderPath('/', true);
    // Cada etiqueta se pinta dos veces: fila de la tabla + tarjeta.
    expect(count(html, 'Oferta enviada')).toBe(66);
    expect(count(html, 'Rebotado')).toBe(8);
    expect(count(html, 'Pendiente de contacto')).toBe(0);
    expect(count(html, 'dirección no encontrada')).toBe(8);
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
    // contacto (33 enviados + 4 rebotados). La clase sigue existiendo
    // en CSS y outreachClass la devuelve para futuros pendientes.
  });

  it('bloqueado: el índice no muestra ningún seguimiento', () => {
    const html = renderPath('/', false);
    expect(html).not.toContain('Oferta enviada');
    expect(html).not.toContain('Rebotado');
    expect(html).not.toContain('Seguimiento');
  });
});
