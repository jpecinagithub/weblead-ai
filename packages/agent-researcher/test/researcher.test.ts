import { describe, expect, it } from 'vitest';
import { getPilotLead, IllegalTransitionError, assertTransition } from '@weblead/shared';
import { classifyActivity } from '../src/activity.js';
import { countIndependentSources, slugify, validateExternalUrl } from '../src/dossier.js';
import { pilotLeadToEvidence, researchBusiness } from '../src/researcher.js';
import {
  computeOpportunityScore,
  QUALIFIED_THRESHOLD,
  scoreContactability,
  scoreEconomicPotential,
} from '../src/scoring.js';

const baseEvidence = {
  name: 'Fontanería Ejemplo',
  sector: 'fontanería/climatización',
  address: 'C/ Ejemplo, 1, 26004 Logroño',
  municipality: 'Logroño',
  province: 'La Rioja',
  postalCode: '26004',
  phone: '941111111',
  email: null,
  websiteUrl: null,
  websiteStatus: 'none' as const,
  activitySignals: [
    { kind: 'directory-update' as const, date: '2026-05-25', description: 'Ficha actualizada' },
  ],
  activityEvidenceText: 'Ficha actualizada 25/05/2026',
  activitySignalDate: '2026-05-25',
  contact: { hasPhone: true, hasEmailOrFormOrWhatsapp: false, hasBookingOnly: false },
  economic: { employeesKnown: false, reviewCount: 5, reviewsExist: true },
  sources: [
    { name: 'fontaneriaelrayo.es', fetchedAt: '2026-11-16' },
    { name: 'Exa Places', fetchedAt: '2026-11-16' },
  ],
  consultedAt: '2026-11-16',
};

describe('scoring (master prompt §1: 25/25/20/15/15, threshold 70)', () => {
  it('scores the no-website + confirmed case at the top of each component', () => {
    const score = computeOpportunityScore({
      websiteStatus: 'none',
      activity: 'CONFIRMED',
      contact: { hasPhone: true, hasEmailOrFormOrWhatsapp: true, hasBookingOnly: false },
      economic: { employeesKnown: true, reviewCount: null, reviewsExist: false },
    });
    expect(score).toEqual({
      noWebsite: 25,
      activity: 25,
      digitalNeed: 20,
      contactability: 15,
      economicPotential: 15,
      total: 100,
    });
    expect(QUALIFIED_THRESHOLD).toBe(70);
  });

  it('scores a current elaborate website at 0 for no-website and digital need', () => {
    const score = computeOpportunityScore({
      websiteStatus: 'current-elaborate',
      activity: 'PROBABLE',
      contact: { hasPhone: true, hasEmailOrFormOrWhatsapp: false, hasBookingOnly: false },
      economic: { employeesKnown: false, reviewCount: null, reviewsExist: false },
    });
    expect(score.noWebsite).toBe(0);
    expect(score.digitalNeed).toBe(0);
    expect(score.total).toBe(15 + 10 + 5);
  });

  it('scores social-only presence at 20/15 (Lumberjack case)', () => {
    const score = computeOpportunityScore({
      websiteStatus: 'social-only',
      activity: 'CONFIRMED',
      contact: { hasPhone: true, hasEmailOrFormOrWhatsapp: false, hasBookingOnly: false },
      economic: { employeesKnown: false, reviewCount: 335, reviewsExist: true },
    });
    expect(score.noWebsite).toBe(20);
    expect(score.digitalNeed).toBe(15);
    expect(score.total).toBe(85);
  });

  it('scores an obsolete website at 10/15 (Rioclima case: 10+15+15+10+5 = 55)', () => {
    const score = computeOpportunityScore({
      websiteStatus: 'obsolete',
      activity: 'PROBABLE',
      contact: { hasPhone: true, hasEmailOrFormOrWhatsapp: false, hasBookingOnly: false },
      economic: { employeesKnown: false, reviewCount: null, reviewsExist: false },
    });
    expect(score.noWebsite).toBe(10);
    expect(score.digitalNeed).toBe(15);
    // Note: the pilot CSV gives Rioclima 60 (potential 10) with no review
    // evidence recorded; the function scores 55 (potential 5). That
    // discrepancy is recorded in docs/phase-c-report.md §4, not fudged here.
    expect(score.total).toBe(55);
  });

  it('boundary: exactly 70 qualifies on score; 69 does not', () => {
    // Obsolete 10 + CONFIRMED 25 + need 15 + phone 10 + 16 reviews 10 = 70.
    const atThreshold = computeOpportunityScore({
      websiteStatus: 'obsolete',
      activity: 'CONFIRMED',
      contact: { hasPhone: true, hasEmailOrFormOrWhatsapp: false, hasBookingOnly: false },
      economic: { employeesKnown: false, reviewCount: 16, reviewsExist: true },
    });
    expect(atThreshold.total).toBe(70);
    const below = computeOpportunityScore({
      websiteStatus: 'obsolete',
      activity: 'PROBABLE',
      contact: { hasPhone: true, hasEmailOrFormOrWhatsapp: false, hasBookingOnly: false },
      economic: { employeesKnown: false, reviewCount: 16, reviewsExist: true },
    });
    expect(below.total).toBe(60);
  });

  it('unknown website status claims no points either way', () => {
    const score = computeOpportunityScore({
      websiteStatus: 'unknown',
      activity: 'UNVERIFIED',
      contact: { hasPhone: false, hasEmailOrFormOrWhatsapp: false, hasBookingOnly: false },
      economic: { employeesKnown: false, reviewCount: null, reviewsExist: false },
    });
    expect(score).toEqual({
      noWebsite: 0,
      activity: 5,
      digitalNeed: 0,
      contactability: 0,
      economicPotential: 5,
      total: 10,
    });
  });

  it('contactability: phone+email 15, phone only 10, booking only 5, none 0', () => {
    expect(
      scoreContactability({ hasPhone: true, hasEmailOrFormOrWhatsapp: true, hasBookingOnly: false }),
    ).toBe(15);
    expect(
      scoreContactability({ hasPhone: true, hasEmailOrFormOrWhatsapp: false, hasBookingOnly: false }),
    ).toBe(10);
    expect(
      scoreContactability({ hasPhone: false, hasEmailOrFormOrWhatsapp: false, hasBookingOnly: true }),
    ).toBe(5);
    expect(
      scoreContactability({ hasPhone: false, hasEmailOrFormOrWhatsapp: false, hasBookingOnly: false }),
    ).toBe(0);
  });

  it('economic potential: headcount/300+ reviews 15, 10+ reviews 10, 1-9 reviews 5', () => {
    expect(scoreEconomicPotential({ employeesKnown: true, reviewCount: null, reviewsExist: false })).toBe(15);
    expect(scoreEconomicPotential({ employeesKnown: false, reviewCount: 300, reviewsExist: true })).toBe(15);
    expect(scoreEconomicPotential({ employeesKnown: false, reviewCount: 16, reviewsExist: true })).toBe(10);
    expect(scoreEconomicPotential({ employeesKnown: false, reviewCount: null, reviewsExist: true })).toBe(10);
    expect(scoreEconomicPotential({ employeesKnown: false, reviewCount: 3, reviewsExist: true })).toBe(5);
    expect(scoreEconomicPotential({ employeesKnown: false, reviewCount: null, reviewsExist: false })).toBe(5);
  });

  it('activity INACTIVE scores 0 and never qualifies on activity points', () => {
    const score = computeOpportunityScore({
      websiteStatus: 'none',
      activity: 'INACTIVE',
      contact: { hasPhone: true, hasEmailOrFormOrWhatsapp: true, hasBookingOnly: false },
      economic: { employeesKnown: true, reviewCount: null, reviewsExist: false },
    });
    expect(score.activity).toBe(0);
    expect(score.total).toBe(25 + 0 + 20 + 15 + 15);
  });
});

describe('activity classification (§1: absence of info is never inactivity)', () => {
  it('CONFIRMED for a dated directory update within 12 months', () => {
    expect(
      classifyActivity([{ kind: 'directory-update', date: '2026-05-25' }], '2026-11-16'),
    ).toBe('CONFIRMED');
  });

  it('PROBABLE for a dated signal older than 12 months', () => {
    expect(
      classifyActivity([{ kind: 'dated-review', date: '2025-01-20' }], '2026-11-16'),
    ).toBe('PROBABLE');
  });

  it('CONFIRMED for a live booking agenda with no date', () => {
    expect(classifyActivity([{ kind: 'live-booking' }], '2026-11-16')).toBe('CONFIRMED');
  });

  it('PROBABLE for an active listing with no verifiable date', () => {
    expect(classifyActivity([{ kind: 'listing-active' }], '2026-11-16')).toBe('PROBABLE');
  });

  it('UNVERIFIED for a bare name mention — and never INACTIVE', () => {
    expect(classifyActivity([{ kind: 'name-mention' }], '2026-11-16')).toBe('UNVERIFIED');
    expect(classifyActivity([], '2026-11-16')).toBe('UNVERIFIED');
  });

  it('INACTIVE only with explicit closure evidence', () => {
    expect(
      classifyActivity([
        { kind: 'listing-active' },
        { kind: 'closure-notice', description: 'Cerrado definitivamente' },
      ]),
    ).toBe('INACTIVE');
  });
});

describe('researchBusiness pipeline', () => {
  it('qualifies a no-website CONFIRMED business and walks the full state path', () => {
    const { dossier, statePath } = researchBusiness(baseEvidence);
    expect(dossier.activity).toBe('CONFIRMED');
    expect(dossier.score.total).toBe(25 + 25 + 20 + 10 + 5);
    expect(dossier.qualified).toBe(true);
    expect(dossier.state).toBe('QUALIFIED');
    expect(dossier.rejectionReason).toBeNull();
    expect(dossier.sourcesVerified).toBe(2);
    expect(dossier.twoSourcesVerified).toBe(true);
    expect(dossier.confidence).toBe('high');
    expect(statePath).toEqual(['DISCOVERED', 'RESEARCHING', 'RESEARCHED', 'QUALIFIED']);
  });

  it('rejects below-threshold businesses with an explicit reason', () => {
    const { dossier, statePath } = researchBusiness({
      ...baseEvidence,
      name: 'Fontanería Godoy',
      websiteStatus: 'current-simple',
      websiteUrl: 'https://www.fontaneria-godoy.com/',
      activitySignals: [{ kind: 'listing-active', description: 'Web propia activa; 51 reseñas' }],
      contact: { hasPhone: true, hasEmailOrFormOrWhatsapp: true, hasBookingOnly: false },
      economic: { employeesKnown: false, reviewCount: 51, reviewsExist: true },
      sources: [{ name: 'búsqueda web 2026-11-16', fetchedAt: '2026-11-16' }],
      pilotScoreTotal: 45,
    });
    expect(dossier.activity).toBe('PROBABLE');
    // 0 (web vigente) + 15 + 5 (web vigente sencilla) + 15 (teléf.+email) + 10 (51 reseñas) = 45,
    // exactly the pilot CSV total: the two sub-criterion differences (need 5 vs 0,
    // potential 10 vs 15) cancel out. No discrepancy note is recorded.
    expect(dossier.score.total).toBe(45);
    expect(dossier.notes.some((n) => n.includes('Discrepancia'))).toBe(false);
  });

  it('rejects a business with no sources at all (insufficient evidence)', () => {
    const { dossier } = researchBusiness({ ...baseEvidence, sources: [], activitySignals: [] });
    expect(dossier.activity).toBe('UNVERIFIED');
    expect(dossier.qualified).toBe(false);
    expect(dossier.state).toBe('REJECTED');
    expect(dossier.rejectionReason).toContain('sin fuentes');
  });

  it('a dossier with unknown fields uses null, never invented values', () => {
    const { dossier } = researchBusiness({
      ...baseEvidence,
      email: null,
      address: null,
      legalName: null,
    });
    expect(dossier.email).toBeNull();
    expect(dossier.address).toBeNull();
    expect(dossier.legalName).toBeNull();
    expect(dossier.fields.email.value).toBeNull();
    expect(dossier.fields.email.source).toBe('fontaneriaelrayo.es');
  });

  it('score >= 70 with UNVERIFIED activity does not qualify (activity gate)', () => {
    // 25 (no web) + 5 (UNVERIFIED) + 20 (need) + 15 (phone+email) + 15 (SL) = 80.
    const { dossier } = researchBusiness({
      ...baseEvidence,
      activitySignals: [],
      email: 'contacto@ejemplo.es',
      contact: { hasPhone: true, hasEmailOrFormOrWhatsapp: true, hasBookingOnly: false },
      economic: { employeesKnown: true, reviewCount: null, reviewsExist: false },
      sources: [{ name: 'directorio X', fetchedAt: '2026-11-16' }],
    });
    expect(dossier.activity).toBe('UNVERIFIED');
    expect(dossier.score.total).toBe(80);
    expect(dossier.qualified).toBe(false);
    expect(dossier.state).toBe('REJECTED');
    expect(dossier.rejectionReason).toContain('actividad no verificada');
  });

  it('reproduces the pilot scores for all 10 leads (segunda tanda 2026-11-17)', () => {
    const mismatches: string[] = [];
    for (const lead of [
      getPilotLead(6)!,
      getPilotLead(8)!,
      getPilotLead(27)!,
      getPilotLead(28)!,
      getPilotLead(29)!,
      getPilotLead(30)!,
      getPilotLead(31)!,
      getPilotLead(32)!,
      getPilotLead(33)!,
      getPilotLead(34)!,
    ]) {
      const { dossier } = researchBusiness(pilotLeadToEvidence(lead));
      if (dossier.score.total !== lead.score.total) {
        mismatches.push(`${lead.name}: piloto ${lead.score.total} vs ${dossier.score.total}`);
      }
      expect(dossier.qualified).toBe(lead.score.total >= 70);
    }
    expect(mismatches).toEqual([]);
  });
});

describe('state machine guardrails (shared)', () => {
  it('allows the research path step by step', () => {
    expect(assertTransition('DISCOVERED', 'RESEARCHING')).toBe('RESEARCHING');
    expect(assertTransition('RESEARCHING', 'RESEARCHED')).toBe('RESEARCHED');
    expect(assertTransition('RESEARCHED', 'QUALIFIED')).toBe('QUALIFIED');
    expect(assertTransition('RESEARCHED', 'REJECTED')).toBe('REJECTED');
  });

  it('rejects jumps (DISCOVERED -> QUALIFIED, DISCOVERED -> APPROVED)', () => {
    expect(() => assertTransition('DISCOVERED', 'QUALIFIED')).toThrow(IllegalTransitionError);
    expect(() => assertTransition('DISCOVERED', 'APPROVED')).toThrow(IllegalTransitionError);
    expect(() => assertTransition('QUALIFIED', 'RESEARCHING')).toThrow(IllegalTransitionError);
  });
});

describe('sources and URLs', () => {
  it('counts distinct source names only (same directory twice = one source)', () => {
    expect(
      countIndependentSources([
        { name: 'Cylex' },
        { name: 'cylex' },
        { name: 'Exa Places' },
      ]),
    ).toBe(2);
  });

  it('accepts public http(s) URLs and drops SSRF targets', () => {
    expect(validateExternalUrl('https://fontaneria-godoy.com/')).toContain('fontaneria-godoy.com');
    expect(validateExternalUrl('http://localhost:4000/admin')).toBeNull();
    expect(validateExternalUrl('https://192.168.1.10/')).toBeNull();
    expect(validateExternalUrl('https://10.0.0.5/')).toBeNull();
    expect(validateExternalUrl('http://169.254.169.254/latest/meta-data/')).toBeNull();
    expect(validateExternalUrl('ftp://example.com/x')).toBeNull();
    expect(validateExternalUrl('not a url')).toBeNull();
    expect(validateExternalUrl(null)).toBeNull();
  });

  it('slugifies names deterministically', () => {
    expect(slugify('Santiago Ferrer Fontanería en General SL', 'Logroño')).toBe(
      'santiago-ferrer-fontaneria-en-general-sl-logrono',
    );
  });
});
