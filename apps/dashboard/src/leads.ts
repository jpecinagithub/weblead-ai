/**
 * Normalización de leads para el dashboard — Fase F, Bloque 5.
 *
 * Causa del bug (verificado en navegador real 2026-11-16): el dashboard
 * tipaba la respuesta de GET /api/businesses como PilotLead[] y leía
 * `l.score.total`, pero la API serializa los negocios de Postgres con
 * `scoreTotal: number | null` (apps/api/src/index.ts, serializeBusiness).
 * Con la BD sembrada (el caso normal) `l.score` es undefined y React
 * rompe con `TypeError: Cannot read properties of undefined (reading
 * 'total')`, dejando el dashboard en blanco. Con la BD vacía el fallback
 * del seed sí devuelve PilotLead y no se veía el fallo — por eso la
 * verificación anterior (solo HTTP 200) no lo cazó.
 *
 * La normalización acepta las tres formas que la API ha devuelto:
 * scoreTotal (número), score.total (objeto) y score como número, y
 * expone siempre `scoreTotal: number | null`. Null = sin score
 * registrado: se muestra "—", nunca se inventa un 0.
 */
import type { BusinessState, PilotLead } from '@weblead/shared';

export type ApiBusinessRow = {
  id: number | string;
  name: string;
  sector: string | null;
  address?: string | null;
  phone: string | null;
  email: string | null;
  hasOwnWebsite?: boolean;
  websiteUrl?: string | null;
  alternativePresence?: string | null;
  activity: PilotLead['activity'];
  activitySignal?: string;
  signalDate?: string | null;
  signalSource?: string;
  state: BusinessState;
  consultedAt?: string | null;
  /** Forma Postgres (serializeBusiness). */
  scoreTotal?: number | null;
  /** Id de Postgres (uuid), cuando la API lo devuelve. */
  dbId?: string;
  /** Forma PilotLead (seed). */
  score?: { total: number } | number | null;
};

/** Lead normalizado para la tabla del dashboard. */
export type DashboardLead = PilotLead & {
  state: BusinessState;
  /** Total del score, o null si no hay score registrado. */
  scoreTotal: number | null;
  /** Clave React estable: el id de la API puede ser uuid (string). */
  key: string;
  /** Id de Postgres (uuid), cuando la API lo devuelve: las claves de
   * costes por empresa usan a veces el uuid y a veces el id de piloto. */
  dbId?: string;
};

export function normalizeLead(row: ApiBusinessRow): DashboardLead {
  const total =
    typeof row.scoreTotal === 'number'
      ? row.scoreTotal
      : typeof row.score === 'number'
        ? row.score
        : typeof row.score?.total === 'number'
          ? row.score.total
          : null;
  return {
    id: typeof row.id === 'number' ? row.id : 0,
    name: row.name,
    sector: row.sector ?? '',
    address: row.address ?? null,
    phone: row.phone,
    email: row.email,
    hasOwnWebsite: row.hasOwnWebsite ?? false,
    websiteUrl: row.websiteUrl ?? null,
    alternativePresence: row.alternativePresence ?? null,
    activity: row.activity,
    activitySignal: row.activitySignal ?? '',
    signalDate: row.signalDate ?? null,
    signalSource: row.signalSource ?? '',
    score: {
      noWebsite: 0,
      activity: 0,
      digitalNeed: 0,
      contactability: 0,
      economicPotential: 0,
      total: total ?? 0,
    },
    scoreTotal: total,
    key: String(row.id),
    dbId: row.dbId,
    state: row.state,
    consultedAt: row.consultedAt ?? '',
  };
}

/** Nombre legible para una clave de costes por empresa (id de piloto o uuid de BD). */
export function businessNameForKey(leads: readonly DashboardLead[], key: string): string {
  const found = leads.find((l) => String(l.id) === key || l.dbId === key || l.key === key);
  return found ? found.name : key;
}
