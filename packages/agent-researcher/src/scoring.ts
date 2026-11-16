/**
 * Opportunity scoring — master prompt §1 + feasibility §3 (Fase C).
 *
 * Weights (master prompt): no website 25, verified activity 25, digital
 * need 20, contactability 15, economic potential 15. Total 0-100.
 * Threshold 70 (master prompt). The sub-criteria below are the explicit
 * rules from docs/feasibility.md §3, implemented literally — including
 * their rough edges, so verification against the pilot CSV can surface
 * discrepancies instead of hiding them (see notes on economic potential).
 */
import type { ActivityStatus, OpportunityScore } from '@weblead/shared';

/** Qualification threshold (master prompt §1). */
export const QUALIFIED_THRESHOLD = 70;

/** Website situation, as verified case by case (never assumed). */
export type WebsiteStatus =
  | 'none'
  | 'social-only'
  | 'obsolete'
  | 'current-simple'
  | 'current-elaborate'
  | 'unknown';

export type ContactabilityInput = {
  hasPhone: boolean;
  hasEmailOrFormOrWhatsapp: boolean;
  /** Only an online booking platform, no verified phone. */
  hasBookingOnly: boolean;
};

export type EconomicPotentialInput = {
  /** SL with a known headcount (10-27 employees in the pilot). */
  employeesKnown: boolean;
  /** Number of reviews, when a source states one; null when unknown. */
  reviewCount: number | null;
  /** Dated reviews exist but no count was recorded. */
  reviewsExist: boolean;
};

export type ScoringInput = {
  websiteStatus: WebsiteStatus;
  activity: ActivityStatus;
  contact: ContactabilityInput;
  economic: EconomicPotentialInput;
};

export function scoreNoWebsite(websiteStatus: WebsiteStatus): number {
  switch (websiteStatus) {
    case 'none':
      return 25;
    case 'social-only':
      return 20;
    case 'obsolete':
      return 10;
    case 'current-simple':
    case 'current-elaborate':
      return 0;
    case 'unknown':
      // No evidence about the website: no points are claimed either way.
      return 0;
  }
}

export function scoreActivity(activity: ActivityStatus): number {
  switch (activity) {
    case 'CONFIRMED':
      return 25;
    case 'PROBABLE':
      return 15;
    case 'UNVERIFIED':
      return 5;
    case 'INACTIVE':
      return 0;
  }
}

export function scoreDigitalNeed(websiteStatus: WebsiteStatus): number {
  switch (websiteStatus) {
    case 'none':
      return 20;
    case 'social-only':
    case 'obsolete':
      return 15;
    case 'current-simple':
      return 5;
    case 'current-elaborate':
      return 0;
    case 'unknown':
      return 0;
  }
}

export function scoreContactability(contact: ContactabilityInput): number {
  if (contact.hasPhone && contact.hasEmailOrFormOrWhatsapp) return 15;
  if (contact.hasPhone) return 10;
  if (contact.hasBookingOnly) return 5;
  return 0;
}

/**
 * Economic potential (feasibility §3): SL with known headcount or
 * >= 300 reviews = 15; small business with reviews = 10; no data = 5.
 *
 * Boundary note (verification finding, Fase C): the pilot CSV applies
 * "small business with reviews" as >= 10 reviews (or dated reviews whose
 * count was not recorded). 1-9 counted reviews score 5, the same as no
 * data — a handful of reviews is weak evidence. This reproduces all 10
 * pilot leads exactly. One row outside the 10 still differs: Rioclima
 * (CSV 60 vs 55 recomputed) was given potential 10 with no review
 * evidence recorded; that discrepancy is noted in docs/phase-c-report.md
 * §4, not fudged here. Fontanería Godoy also differs per sub-criterion
 * (need 5 vs 0, potential 10 vs 15) but the differences cancel: 45 = 45.
 */
export function scoreEconomicPotential(economic: EconomicPotentialInput): number {
  if (economic.employeesKnown) return 15;
  if (economic.reviewCount !== null && economic.reviewCount >= 300) return 15;
  if (economic.reviewCount !== null && economic.reviewCount >= 10) return 10;
  if (economic.reviewCount === null && economic.reviewsExist) return 10;
  return 5;
}

export function computeOpportunityScore(input: ScoringInput): OpportunityScore {
  const noWebsite = scoreNoWebsite(input.websiteStatus);
  const activity = scoreActivity(input.activity);
  const digitalNeed = scoreDigitalNeed(input.websiteStatus);
  const contactability = scoreContactability(input.contact);
  const economicPotential = scoreEconomicPotential(input.economic);
  return {
    noWebsite,
    activity,
    digitalNeed,
    contactability,
    economicPotential,
    total: noWebsite + activity + digitalNeed + contactability + economicPotential,
  };
}

/** Score-only gate: the activity gate is applied separately by the researcher. */
export function passesScoreThreshold(score: OpportunityScore): boolean {
  return score.total >= QUALIFIED_THRESHOLD;
}
