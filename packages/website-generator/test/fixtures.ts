import type { GeneratorBusinessInput } from '../src/index.js';

/** Real dossier facts: Santiago Ferrer (pilot id 6, Fase A CSV + Fase C). */
export const FERRER_INPUT: GeneratorBusinessInput = {
  name: 'Santiago Ferrer Fontanería en General SL',
  sector: 'fontanería/climatización',
  address: 'C/ Gonzalo de Berceo, 8, 3-D, 26005 Logroño',
  phone: '941227157',
  email: 'sanfefo@terra.com',
  municipality: 'Logroño',
  province: 'La Rioja',
  activity: 'CONFIRMED',
  activitySignal: 'Ficha eInforma consultada 14/10/2026; SL, 10 empleados, constituida 1994',
  hasOwnWebsite: false,
  scoreTotal: 100,
  services: [],
  slug: 'santiago-ferrer-fontaneria-en-general-sl-logrono',
  pilotId: 6,
  consultedAt: '2026-11-16',
  sources: ['eInforma', 'Exa Places'],
};

export const BEGONA_INPUT: GeneratorBusinessInput = {
  name: 'Begoña Ruiz Peluquería',
  sector: 'peluquería/barbería',
  address: 'C/ Gral. Vara de Rey, 33, 26002 Logroño',
  phone: '941235784',
  email: null,
  municipality: 'Logroño',
  province: 'La Rioja',
  activity: 'CONFIRMED',
  activitySignal: 'Datos verificados 05/05/2026; 33 reseñas, 4,9/5',
  hasOwnWebsite: false,
  scoreTotal: 90,
  services: [],
  slug: 'begona-ruiz-peluqueria-logrono',
  pilotId: 17,
  consultedAt: '2026-11-16',
  sources: ['mispelus.com', 'directorios'],
};

/**
 * 3ª tanda (2026-11-17): FONTANERÍA PELAYO, Villaralbo (Zamora) — the
 * one lead without a phone and without a street address (only email).
 * Sector uses the codebase's fontanería template string: the dossier
 * sector is bare 'Fontanería', which has no template yet (templates are
 * another worker's file in this batch).
 */
export const PELAYO_INPUT: GeneratorBusinessInput = {
  name: 'FONTANERÍA PELAYO',
  sector: 'fontanería/climatización',
  address: null,
  phone: null,
  email: 'pelayofontaneria@hotmail.com',
  municipality: 'Villaralbo',
  province: 'Zamora',
  activity: 'CONFIRMED',
  activitySignal: null,
  hasOwnWebsite: false,
  scoreTotal: 82,
  services: [],
  slug: 'fontaneria-pelayo-villaralbo',
  pilotId: null,
  consultedAt: '2026-11-17',
  sources: ['Google Maps', 'Facebook'],
};

