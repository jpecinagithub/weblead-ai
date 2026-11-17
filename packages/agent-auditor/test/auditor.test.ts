import { describe, expect, it } from 'vitest';
import { assertTransition, canTransition } from '@weblead/shared';
import { buildWebsiteContent, type GeneratorBusinessInput } from '@weblead/website-generator';
import {
  auditWebsiteContent,
  mergePlaywrightFindings,
  type AuditDossierFacts,
} from '../src/index.js';
import { FERRER_INPUT } from '../../website-generator/test/fixtures.js';

const FERRER_DOSSIER: AuditDossierFacts = {
  name: 'Santiago Ferrer Fontanería en General SL',
  address: 'C/ Gonzalo de Berceo, 8, 3-D, 26005 Logroño',
  phone: '941227157',
  email: 'sanfefo@terra.com',
  services: [],
  activity: 'CONFIRMED',
  slug: 'santiago-ferrer-fontaneria-en-general-sl-logrono',
};

function contentFor(input: GeneratorBusinessInput = FERRER_INPUT) {
  return buildWebsiteContent(input);
}

describe('auditor: content audit vs dossier (Fase D, independent of designer)', () => {
  it('approves a clean generated demo with 100s and no findings', () => {
    const report = auditWebsiteContent(contentFor(), FERRER_DOSSIER);
    expect(report.result).toBe('PASSED');
    expect(report.scores).toEqual({ business: 100, visual: 100, technical: 100, content: 100 });
    expect(report.findings).toEqual([]);
  });

  it('detects a planted wrong phone as CRITICAL BUSINESS and fails', () => {
    const content = contentFor();
    content.contact.phone = '941000000';
    const report = auditWebsiteContent(content, FERRER_DOSSIER);
    expect(report.result).toBe('FAILED');
    expect(report.scores.business).toBe(75);
    expect(report.findings.some((f) => f.severity === 'CRITICAL' && f.category === 'BUSINESS')).toBe(true);
  });

  it('detects a planted invented service as CRITICAL', () => {
    const content = contentFor();
    content.services.items = ['Desatascos 24h'];
    content.services.pendingConfirmation = false;
    const report = auditWebsiteContent(content, FERRER_DOSSIER);
    expect(report.result).toBe('FAILED');
    expect(report.findings.some((f) => f.message.includes('Servicios inventados'))).toBe(true);
  });

  it('detects a planted price in the hero subtitle as CRITICAL', () => {
    const content = contentFor();
    content.hero.subtitle = 'Fontanería en Logroño desde 10 €';
    const report = auditWebsiteContent(content, FERRER_DOSSIER);
    expect(report.result).toBe('FAILED');
    expect(report.findings.some((f) => f.message.includes('precio'))).toBe(true);
  });

  it('detects a missing demo notice as CRITICAL', () => {
    const content = contentFor();
    content.notice = '';
    const report = auditWebsiteContent(content, FERRER_DOSSIER);
    expect(report.result).toBe('FAILED');
    expect(report.findings.some((f) => f.severity === 'CRITICAL' && f.category === 'CONTENT')).toBe(true);
  });

  it('detects an image without licence/provenance as CRITICAL VISUAL', () => {
    const content = contentFor();
    content.gallery.images[0]!.license = '';
    content.gallery.images[0]!.source = '';
    const report = auditWebsiteContent(content, FERRER_DOSSIER);
    expect(report.result).toBe('FAILED');
    expect(report.findings.some((f) => f.category === 'VISUAL' && f.severity === 'CRITICAL')).toBe(true);
  });

  it('a MINOR-only defect lowers the score but still passes', () => {
    // Dossier has an email; the demo omits it -> MINOR BUSINESS (90).
    const content = contentFor();
    content.contact.email = null;
    const report = auditWebsiteContent(content, FERRER_DOSSIER);
    expect(report.result).toBe('PASSED');
    expect(report.scores.business).toBe(90);
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]!.severity).toBe('MINOR');
  });

  it('merging Playwright console errors fails the audit as TECHNICAL CRITICAL', () => {
    const base = auditWebsiteContent(contentFor(), FERRER_DOSSIER);
    const merged = mergePlaywrightFindings(base, [
      { severity: 'CRITICAL', category: 'TECHNICAL', message: 'Error de consola: TypeError: x is undefined' },
    ]);
    expect(merged.result).toBe('FAILED');
    expect(merged.scores.technical).toBe(75);
    expect(merged.findings).toHaveLength(1);
  });

  it('stale content still carrying formNote fails as CRITICAL CONTENT (rediseño 2026-11-17)', () => {
    const content = contentFor();
    (content.contact as unknown as Record<string, unknown>).formNote =
      'Formulario de demostración: no envía nada a ningún tercero.';
    const report = auditWebsiteContent(content, FERRER_DOSSIER);
    expect(report.result).toBe('FAILED');
    expect(report.findings.some((f) => f.severity === 'CRITICAL' && f.message.includes('formNote'))).toBe(true);
  });

  it('a Playwright finding of a present form fails the audit as CONTENT CRITICAL', () => {
    const base = auditWebsiteContent(contentFor(), FERRER_DOSSIER);
    const merged = mergePlaywrightFindings(base, [
      {
        severity: 'CRITICAL',
        category: 'CONTENT',
        message: 'Formulario presente (3 controles form/input/textarea/select): el rediseño 2026-11-17 los eliminó de todas las demos.',
      },
    ]);
    expect(merged.result).toBe('FAILED');
    expect(merged.scores.content).toBe(75);
  });

  it('a missing Google Maps link is only a MINOR CONTENT finding', () => {
    const content = contentFor();
    content.contact.mapsHref = null;
    const report = auditWebsiteContent(content, FERRER_DOSSIER);
    expect(report.result).toBe('PASSED');
    expect(report.scores.content).toBe(90);
    expect(report.findings.some((f) => f.message.includes('Google Maps'))).toBe(true);
  });
});

describe('auditor: state-machine gate (master prompt §3)', () => {
  it('AUDIT_FAILED goes back to DESIGNING; AUDITING goes to APPROVED', () => {
    expect(canTransition('AUDIT_FAILED', 'DESIGNING')).toBe(true);
    expect(canTransition('AUDITING', 'APPROVED')).toBe(true);
    expect(canTransition('AUDITING', 'AUDIT_FAILED')).toBe(true);
    expect(() => assertTransition('AUDIT_FAILED', 'APPROVED')).toThrow();
    expect(() => assertTransition('PREVIEW_READY', 'APPROVED')).toThrow();
    expect(() => assertTransition('QUALIFIED', 'APPROVED')).toThrow();
  });
});
