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
 * Tercera tanda (2026-11-17): los 17 emails de oferta (75 €) se
 * enviaron a mano el 17 nov 2026 desde mmartin19791979parra@gmail.com,
 * firmados como Miguel Martín. Estado actual:
 *
 * - 16 × oferta enviada, sin respuesta todavía.
 * - 1 × rebotado: Peluquería Madi's (madisvillaralbo@hotmail.com) —
 *   Gmail devolvió "Address not found": el buzón no existe. La demo
 *   se mantiene en la plataforma salvo que Jon diga lo contrario.
 *
 * Cuarta tanda (2026-11-17): 10 demos nuevas pendientes de contacto.
 * La oferta aún no se ha enviado (se decidirá después); todavía no
 * hay ningún email enviado para ninguna de ellas.
 *
 * Totales de la plataforma: 25 enviadas esperando respuesta,
 * 2 rebotes, 10 pendientes de contacto, 0 respuestas.
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
  // Tercera tanda (2026-11-17): 17 ofertas enviadas (75 €), 16 enviadas y 1 rebotada (Madi's).
  'taller-mecanico-refoyo-s-zamora': { status: 'sent', date: '17 nov 2026' },
  'fisioavanza-zamora-zamora': { status: 'sent', date: '17 nov 2026' },
  'taller-chapa-y-pintura-valentin-mym-c-b-avila': { status: 'sent', date: '17 nov 2026' },
  'magneto-electricidad-mota-del-cuervo': { status: 'sent', date: '17 nov 2026' },
  'fisio-maff-zamora': { status: 'sent', date: '17 nov 2026' },
  'grinan-bueno-talleres-iniesta': { status: 'sent', date: '17 nov 2026' },
  'dalon-taller-mecanico-avila': { status: 'sent', date: '17 nov 2026' },
  'fisiofyr-zamora': { status: 'sent', date: '17 nov 2026' },
  'tallares-avilagri-el-barco-de-avila': { status: 'sent', date: '17 nov 2026' },
  'aura-fisioterapia-y-feldenkrais-soria': { status: 'sent', date: '17 nov 2026' },
  'i-e-raul-c-v-canete': { status: 'sent', date: '17 nov 2026' },
  'fontaneria-talayuelas-talayuelas': { status: 'sent', date: '17 nov 2026' },
  'carpinteria-ebanisteria-francisco-toranzo-villaralbo': { status: 'sent', date: '17 nov 2026' },
  'heralu-hermanos-alvarez-urones-villaralbo': { status: 'sent', date: '17 nov 2026' },
  'fontaneria-pelayo-villaralbo': { status: 'sent', date: '17 nov 2026' },
  'jardineria-raul-hernandez-laperal-villaralbo': { status: 'sent', date: '17 nov 2026' },
  'peluqueria-madi-s-villaralbo': {
    status: 'bounced',
    date: '17 nov 2026',
    note: 'dirección no encontrada',
  },
  // Cuarta tanda (2026-11-17): 10 pendientes de contacto, oferta aún sin enviar.
  'centro-de-estudios-soria': { status: 'pending', date: '17 nov 2026' },
  'clinica-dental-mercedes-moreno-torcal-soria': { status: 'pending', date: '17 nov 2026' },
  'talleres-sivi-arenas-de-san-pedro': { status: 'pending', date: '17 nov 2026' },
  'taller-mecanico-adolfo-meson-arenas-de-san-pedro': { status: 'pending', date: '17 nov 2026' },
  'talleres-gonviauto-hnos-arenas-de-san-pedro': { status: 'pending', date: '17 nov 2026' },
  'auto-neumaticos-el-valle-arenas-de-san-pedro': { status: 'pending', date: '17 nov 2026' },
  'calefaccion-y-fontaneria-mile-arenas-de-san-pedro': { status: 'pending', date: '17 nov 2026' },
  'cerrajeria-albarran-arenas-de-san-pedro': { status: 'pending', date: '17 nov 2026' },
  'cerrajeria-chupi-arenas-de-san-pedro': { status: 'pending', date: '17 nov 2026' },
  'don-llaves-cuenca': { status: 'pending', date: '17 nov 2026' },
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
