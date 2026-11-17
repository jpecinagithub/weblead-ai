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
 *
 * Tercera tanda (2026-11-17): las 17 demos nuevas entran como
 * 'pending' (pendiente de contacto, todavía sin email enviado);
 * 'pending' no suma a enviados/rebotes/respondidos del resumen.
 */
export type OutreachStatus = 'sent' | 'bounced' | 'replied' | 'pending';

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
  // Tercera tanda (2026-11-17): 17 demos nuevas, pendientes de contacto.
  'taller-mecanico-refoyo-s-zamora': { status: 'pending', date: '17 nov 2026' },
  'fisioavanza-zamora-zamora': { status: 'pending', date: '17 nov 2026' },
  'taller-chapa-y-pintura-valentin-mym-c-b-avila': { status: 'pending', date: '17 nov 2026' },
  'magneto-electricidad-mota-del-cuervo': { status: 'pending', date: '17 nov 2026' },
  'fisio-maff-zamora': { status: 'pending', date: '17 nov 2026' },
  'grinan-bueno-talleres-iniesta': { status: 'pending', date: '17 nov 2026' },
  'dalon-taller-mecanico-avila': { status: 'pending', date: '17 nov 2026' },
  'fisiofyr-zamora': { status: 'pending', date: '17 nov 2026' },
  'tallares-avilagri-el-barco-de-avila': { status: 'pending', date: '17 nov 2026' },
  'aura-fisioterapia-y-feldenkrais-soria': { status: 'pending', date: '17 nov 2026' },
  'i-e-raul-c-v-canete': { status: 'pending', date: '17 nov 2026' },
  'fontaneria-talayuelas-talayuelas': { status: 'pending', date: '17 nov 2026' },
  'carpinteria-ebanisteria-francisco-toranzo-villaralbo': { status: 'pending', date: '17 nov 2026' },
  'heralu-hermanos-alvarez-urones-villaralbo': { status: 'pending', date: '17 nov 2026' },
  'fontaneria-pelayo-villaralbo': { status: 'pending', date: '17 nov 2026' },
  'jardineria-raul-hernandez-laperal-villaralbo': { status: 'pending', date: '17 nov 2026' },
  'peluqueria-madi-s-villaralbo': { status: 'pending', date: '17 nov 2026' },
};

/** Etiqueta que muestra el índice privado para cada proyecto. */
export function outreachLabel(slug: string): string {
  const entry = OUTREACH[slug];
  if (!entry) return 'Pendiente de contacto';
  if (entry.status === 'pending') {
    return 'Pendiente de contacto';
  }
  if (entry.status === 'bounced') {
    return `Rebotado · ${entry.date} — ${entry.note ?? 'sin motivo'}`;
  }
  if (entry.status === 'replied') {
    return `Respondió · ${entry.date}`;
  }
  return `Oferta enviada · ${entry.date}`;
}

/** Clase de la píldora de estado en el índice (diseño del panel). */
export function outreachClass(slug: string): string {
  const entry = OUTREACH[slug];
  if (!entry) return 'pill-neutral';
  if (entry.status === 'pending') return 'pill-neutral';
  if (entry.status === 'bounced') return 'pill-bounced';
  if (entry.status === 'replied') return 'pill-replied';
  return 'pill-sent';
}
