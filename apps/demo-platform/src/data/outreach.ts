/**
 * Seguimiento de la primera tanda de contactos (orden de Jon
 * 2026-11-17): los 10 emails de oferta (50 €) se enviaron a mano el
 * 17 nov 2026 desde mmartin19791979parra@gmail.com, firmados como
 * Miguel Martín. Estado actual:
 *
 * - 9 × oferta enviada, sin respuesta todavía.
 * - 1 × rebotado: Pintor Roberto (robertoinretec@gmail.com) —
 *   Gmail devolvió "Address not found": la dirección aparecía en
 *   una página de origen pero el buzón no existe. La demo se
 *   mantiene en la plataforma salvo que Jon diga lo contrario.
 *
 * Cuando llegue una respuesta, Jon lo dice y se actualiza el estado
 * aquí (p. ej. 'replied' / 'interested' / 'declined'). Este fichero
 * es la única fuente del seguimiento que muestra el índice privado.
 */
export type OutreachStatus = 'sent' | 'bounced';

export type OutreachEntry = {
  status: OutreachStatus;
  /** Fecha del envío, formato corto para la tabla. */
  date: string;
  /** Nota solo para rebotados (motivo del rebote). */
  note?: string;
};

export const OUTREACH: Record<string, OutreachEntry> = {
  'santiago-ferrer-fontaneria-en-general-sl-logrono': { status: 'sent', date: '17 nov 2026' },
  'hidrorioja-sc-logrono': { status: 'sent', date: '17 nov 2026' },
  'moises-munoz-s-l-logrono': { status: 'sent', date: '17 nov 2026' },
  'atesa-aire-y-temperatura-s-l-logrono': { status: 'sent', date: '17 nov 2026' },
  'mishea-peluqueros-logrono': { status: 'sent', date: '17 nov 2026' },
  'la-guarida-111-logrono': { status: 'sent', date: '17 nov 2026' },
  'charles-barbershop-logrono': { status: 'sent', date: '17 nov 2026' },
  'peluqueria-e-style-logrono': { status: 'sent', date: '17 nov 2026' },
  'pintor-logrono-roberto-decoracion-logrono': {
    status: 'bounced',
    date: '17 nov 2026',
    note: 'dirección no encontrada',
  },
  'carpinteria-sergio-martinez-logrono': { status: 'sent', date: '17 nov 2026' },
};

/** Etiqueta que muestra el índice privado para cada proyecto. */
export function outreachLabel(slug: string): string {
  const entry = OUTREACH[slug];
  if (!entry) return 'Pendiente de contacto';
  if (entry.status === 'bounced') {
    return `Rebotado · ${entry.date} — ${entry.note ?? 'sin motivo'}`;
  }
  return `Oferta enviada · ${entry.date}`;
}
