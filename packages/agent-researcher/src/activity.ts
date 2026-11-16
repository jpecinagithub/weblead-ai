/**
 * Activity classification — master prompt §1 (Fase C).
 *
 * CONFIRMED / PROBABLE / UNVERIFIED / INACTIVE. Absence of information is
 * NEVER inactivity: INACTIVE requires explicit closure evidence (a
 * "cerrado definitivamente" notice, a registry deregistration). A dated
 * signal counts as CONFIRMED only if it falls within 12 months of the
 * reference date (the pilot's rule, feasibility §3).
 */
import type { ActivityStatus } from '@weblead/shared';

export type ActivitySignalKind =
  | 'dated-review'
  | 'directory-update'
  | 'registry-consultation'
  | 'live-booking'
  | 'website-active'
  | 'listing-active'
  | 'name-mention'
  | 'closure-notice'
  | 'registry-deregistration';

export type ActivitySignal = {
  kind: ActivitySignalKind;
  /** ISO date of the signal, when the source gives one (null = undated). */
  date?: string | null;
  /** Human-readable description, recorded verbatim from the source. */
  description?: string | null;
};

/** Reference date for the "within 12 months" rule (pilot consultation date). */
export const DEFAULT_REFERENCE_DATE = '2026-11-16';

/** Dated signal kinds: a date on one of these can CONFIRM activity. */
const DATED_KINDS: readonly ActivitySignalKind[] = [
  'dated-review',
  'directory-update',
  'registry-consultation',
  'website-active',
];

/** A live booking agenda is happening now: it confirms without a date. */
const LIVE_KINDS: readonly ActivitySignalKind[] = ['live-booking'];

function monthsBetween(earlier: string, later: string): number {
  const a = new Date(`${earlier}T00:00:00Z`).getTime();
  const b = new Date(`${later}T00:00:00Z`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.POSITIVE_INFINITY;
  return (b - a) / (1000 * 60 * 60 * 24 * 30.44);
}

export function classifyActivity(
  signals: readonly ActivitySignal[],
  referenceDate: string = DEFAULT_REFERENCE_DATE,
): ActivityStatus {
  if (signals.some((s) => s.kind === 'closure-notice' || s.kind === 'registry-deregistration')) {
    return 'INACTIVE';
  }
  if (signals.some((s) => LIVE_KINDS.includes(s.kind))) return 'CONFIRMED';
  for (const signal of signals) {
    if (!DATED_KINDS.includes(signal.kind)) continue;
    if (!signal.date) continue;
    if (monthsBetween(signal.date, referenceDate) <= 12) return 'CONFIRMED';
  }
  // Dated signals older than 12 months, or an active listing with
  // reviews/hours but no verifiable date, are PROBABLE — not confirmed.
  if (
    signals.some(
      (s) =>
        s.kind === 'listing-active' ||
        DATED_KINDS.includes(s.kind) ||
        s.kind === 'live-booking',
    )
  ) {
    return 'PROBABLE';
  }
  return 'UNVERIFIED';
}
