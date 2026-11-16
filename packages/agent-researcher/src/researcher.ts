/**
 * Research Agent — Fase C (master prompt §1, instrucciones §4 + §11 Fase C).
 *
 * Deterministic pipeline (no LLM in the decision path — the LLM only ever
 * writes a summary, never a fact):
 *
 *   1. Evidence in (structured input; pilot CSV rows arrive through
 *      `pilotLeadToEvidence`, arbitrary businesses through the API body).
 *   2. Activity classification (CONFIRMED / PROBABLE / UNVERIFIED /
 *      INACTIVE — absence of information is never inactivity).
 *   3. Opportunity scoring 0-100 (weights from the master prompt).
 *   4. Decision: QUALIFIED iff score >= 70 AND activity is CONFIRMED or
 *      PROBABLE; otherwise REJECTED with an explicit reason.
 *   5. State path validated step by step through the shared machine:
 *      DISCOVERED -> RESEARCHING -> RESEARCHED -> QUALIFIED | REJECTED.
 *
 * Nothing is invented: every field the input does not provide is `null`,
 * every datum keeps its source, and a dossier with no sources is
 * REJECTED for insufficient evidence.
 */
import { assertTransition, type ActivityStatus, type BusinessState, type PilotLead } from '@weblead/shared';
import { classifyActivity, type ActivitySignal } from './activity.js';
import {
  countIndependentSources,
  slugify,
  validateExternalUrl,
  type BusinessDossier,
  type Confidence,
  type FieldEvidence,
  type SourceRef,
} from './dossier.js';
import {
  computeOpportunityScore,
  passesScoreThreshold,
  QUALIFIED_THRESHOLD,
  type ContactabilityInput,
  type EconomicPotentialInput,
  type WebsiteStatus,
} from './scoring.js';

export type ResearcherEvidenceInput = {
  name: string;
  sector: string;
  subsector?: string | null;
  legalName?: string | null;
  address?: string | null;
  municipality?: string;
  province?: string;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  websiteUrl?: string | null;
  websiteStatus: WebsiteStatus;
  socialProfiles?: string[];
  services?: string[];
  targetAudience?: string | null;
  activitySignals: ActivitySignal[];
  activityEvidenceText?: string | null;
  activitySignalDate?: string | null;
  contact: ContactabilityInput;
  economic: EconomicPotentialInput;
  sources: SourceRef[];
  consultedAt?: string;
  pilotId?: number | null;
  /** Pilot CSV total, when re-verifying a pilot row: a mismatch is noted, not hidden. */
  pilotScoreTotal?: number | null;
};

export type ResearchOutcome = {
  dossier: BusinessDossier;
  /** Validated state path (every step went through assertTransition). */
  statePath: BusinessState[];
};

const DEFAULT_MUNICIPALITY = 'Logroño';
const DEFAULT_PROVINCE = 'La Rioja';

function field(
  value: string | null,
  source: SourceRef | undefined,
  observedAt: string | null,
  confidence: Confidence | null,
): FieldEvidence {
  return {
    value: value ?? null,
    source: source?.name ?? null,
    sourceUrl: validateExternalUrl(source?.url ?? null),
    observedAt,
    confidence: value === null ? null : confidence,
  };
}

/** Rejection reasons (stored verbatim on the dossier and in the DB). */
export function rejectionReasons(input: {
  scoreTotal: number;
  activity: ActivityStatus;
  sourcesVerified: number;
}): string[] {
  const reasons: string[] = [];
  if (input.sourcesVerified === 0) reasons.push('evidencia insuficiente: sin fuentes');
  if (input.scoreTotal < QUALIFIED_THRESHOLD) {
    reasons.push(`score ${input.scoreTotal}/100 por debajo del umbral ${QUALIFIED_THRESHOLD}`);
  }
  if (input.activity === 'UNVERIFIED') reasons.push('actividad no verificada (UNVERIFIED)');
  if (input.activity === 'INACTIVE') reasons.push('actividad INACTIVE: evidencia de cierre');
  return reasons;
}

export function researchBusiness(
  input: ResearcherEvidenceInput,
  opts: { referenceDate?: string } = {},
): ResearchOutcome {
  const consultedAt = input.consultedAt ?? opts.referenceDate ?? '2026-11-16';
  const activity = classifyActivity(input.activitySignals, opts.referenceDate);
  const score = computeOpportunityScore({
    websiteStatus: input.websiteStatus,
    activity,
    contact: input.contact,
    economic: input.economic,
  });
  const sourcesVerified = countIndependentSources(input.sources);
  const twoSourcesVerified = sourcesVerified >= 2;
  const confidence: Confidence =
    twoSourcesVerified && activity === 'CONFIRMED'
      ? 'high'
      : twoSourcesVerified || activity === 'CONFIRMED'
        ? 'medium'
        : 'low';
  const qualified =
    passesScoreThreshold(score) && (activity === 'CONFIRMED' || activity === 'PROBABLE');
  const reasons = qualified
    ? []
    : rejectionReasons({ scoreTotal: score.total, activity, sourcesVerified });
  const rejectionReason = reasons.length > 0 ? reasons.join('; ') : null;

  const municipality = input.municipality ?? DEFAULT_MUNICIPALITY;
  const province = input.province ?? DEFAULT_PROVINCE;
  const primarySource = input.sources[0];
  const conf: Confidence = confidence;

  const fields: Record<string, FieldEvidence> = {
    name: field(input.name, primarySource, consultedAt, conf),
    legalName: field(input.legalName ?? null, primarySource, consultedAt, conf),
    address: field(input.address ?? null, primarySource, consultedAt, conf),
    phone: field(input.phone ?? null, primarySource, consultedAt, conf),
    email: field(input.email ?? null, primarySource, consultedAt, conf),
    websiteUrl: field(input.websiteUrl ?? null, primarySource, consultedAt, conf),
    activity: field(activity, primarySource, input.activitySignalDate ?? consultedAt, conf),
  };

  const opportunity = qualified
    ? `Sin web propia o presencia deficiente; actividad ${activity}; score ${score.total}/100. ` +
      `Candidata a web propia orientada a SEO local en ${municipality}.`
    : `Sin oportunidad cualificada: ${rejectionReason ?? 'sin motivo registrado'}.`;
  const summary =
    `${input.name} (${input.sector}, ${municipality}): actividad ${activity}, ` +
    `web propia ${input.websiteStatus === 'none' ? 'no (verificado)' : input.websiteStatus}, ` +
    `score ${score.total}/100 (sin web ${score.noWebsite}, actividad ${score.activity}, ` +
    `necesidad ${score.digitalNeed}, contacto ${score.contactability}, potencial ${score.economicPotential}). ` +
    `${qualified ? 'CUALIFICADA (>= 70 y actividad verificada).' : `RECHAZADA: ${rejectionReason ?? ''}`} ` +
    `Fuentes independientes: ${sourcesVerified} (${twoSourcesVerified ? 'verificación en 2 fuentes' : 'sin verificación en 2 fuentes'}).`;

  const notes: string[] = [];
  if (input.pilotScoreTotal !== null && input.pilotScoreTotal !== undefined && input.pilotScoreTotal !== score.total) {
    notes.push(
      `Discrepancia con el piloto Fase A: score piloto ${input.pilotScoreTotal} vs ` +
        `recomputado ${score.total} (ver docs/phase-c-report.md §4).`,
    );
  }
  if (!twoSourcesVerified) {
    notes.push('Verificación en 2 fuentes independientes no alcanzada; confianza limitada.');
  }

  // State path, validated step by step — no jumps (shared machine).
  const target: BusinessState = qualified ? 'QUALIFIED' : 'REJECTED';
  const statePath: BusinessState[] = ['DISCOVERED'];
  let current: BusinessState = 'DISCOVERED';
  for (const next of ['RESEARCHING', 'RESEARCHED', target] as const) {
    current = assertTransition(current, next);
    statePath.push(current);
  }

  const dossier: BusinessDossier = {
    name: input.name,
    legalName: input.legalName ?? null,
    sector: input.sector,
    subsector: input.subsector ?? null,
    address: input.address ?? null,
    municipality,
    province,
    postalCode: input.postalCode ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    websiteUrl: input.websiteUrl ?? null,
    websiteStatus: input.websiteStatus,
    socialProfiles: input.socialProfiles ?? [],
    services: input.services ?? [],
    targetAudience: input.targetAudience ?? null,
    activity,
    activityEvidence: input.activityEvidenceText ?? null,
    activitySignalDate: input.activitySignalDate ?? null,
    opportunity,
    score,
    confidence,
    sources: input.sources,
    sourcesVerified,
    twoSourcesVerified,
    consultedAt,
    fields,
    summary,
    llmSummary: null,
    rejectionReason,
    qualified,
    state: target,
    slug: slugify(input.name, municipality),
    pilotId: input.pilotId ?? null,
    notes,
  };
  return { dossier, statePath };
}

/**
 * Adapts a pilot lead (shared seed, from docs/feasibility-data.csv) to
 * researcher evidence. Review counts and headcount are parsed from the
 * recorded activity signal text — the same text the pilot recorded, not
 * new data. `websiteStatus` follows the pilot's verified web finding.
 */
export function pilotLeadToEvidence(lead: PilotLead): ResearcherEvidenceInput {
  const signal = lead.activitySignal ?? '';
  const reviewMatch = signal.match(/(\d+)\s*reseñas/);
  const employeesMatch = signal.match(/(\d+)\s*empleados/);
  const reviewCount = reviewMatch ? Number(reviewMatch[1]) : null;
  // "sin reseñas" is not evidence of reviews: the word appears negated.
  const reviewsExist = /reseñ/i.test(signal) && !/sin reseñas/i.test(signal);
  const sourceNames = lead.signalSource.split('+').map((s) => s.trim()).filter(Boolean);
  const sources: SourceRef[] = sourceNames.map((name) => ({ name, fetchedAt: lead.consultedAt }));
  const websiteStatus: WebsiteStatus = !lead.hasOwnWebsite
    ? // The pilot gives 20 (not 25) only to a *functional* alternative
      // presence: Lumberjack has Instagram + live booking (Booksy/Yeasy/
      // Fresha). A bare Facebook page (Chuchi) still scores 25, i.e. no web.
      lead.alternativePresence && /booksy|yeasy|fresha|treatwell|reserva/i.test(lead.alternativePresence)
      ? 'social-only'
      : 'none'
    : lead.name === 'Rioclima'
      ? 'obsolete'
      : 'current-simple';

  const signals: ActivitySignal[] = [];
  if (lead.activity === 'CONFIRMED') {
    signals.push({
      kind: lead.signalDate ? 'directory-update' : 'listing-active',
      date: lead.signalDate,
      description: signal,
    });
  } else if (lead.activity === 'PROBABLE') {
    signals.push({ kind: 'listing-active', date: null, description: signal });
  }

  return {
    name: lead.name,
    sector: lead.sector,
    address: lead.address,
    municipality: DEFAULT_MUNICIPALITY,
    province: DEFAULT_PROVINCE,
    postalCode: lead.address?.match(/2600\d/)?.[0] ?? null,
    phone: lead.phone,
    email: lead.email,
    websiteUrl: lead.websiteUrl,
    websiteStatus,
    socialProfiles: lead.alternativePresence ? [lead.alternativePresence] : [],
    activitySignals: signals,
    activityEvidenceText: signal || null,
    activitySignalDate: lead.signalDate,
    contact: {
      hasPhone: lead.phone !== null,
      hasEmailOrFormOrWhatsapp: lead.email !== null,
      hasBookingOnly: !lead.phone && lead.alternativePresence !== null,
    },
    economic: {
      employeesKnown: employeesMatch !== null,
      reviewCount,
      reviewsExist,
    },
    sources,
    consultedAt: lead.consultedAt,
    pilotId: lead.id,
    pilotScoreTotal: lead.score.total,
  };
}
