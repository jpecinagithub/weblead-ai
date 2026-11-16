import { describe, expect, it } from 'vitest';
import { businessNameForKey, normalizeLead, type ApiBusinessRow } from './leads';

const base: ApiBusinessRow = {
  id: 6,
  name: 'Santiago Ferrer Fontanería en General SL',
  sector: 'fontanería/climatización',
  phone: '941227157',
  email: null,
  activity: 'CONFIRMED',
  state: 'QUALIFIED',
};

describe('normalizeLead (Fase F, Bloque 5: el dashboard no debe romper con scoreTotal)', () => {
  it('acepta la forma Postgres (scoreTotal numérico)', () => {
    const lead = normalizeLead({ ...base, scoreTotal: 100 });
    expect(lead.scoreTotal).toBe(100);
    expect(lead.score.total).toBe(100);
    expect(lead.name).toBe(base.name);
  });

  it('acepta la forma PilotLead (score.total)', () => {
    const lead = normalizeLead({ ...base, score: { total: 85 } });
    expect(lead.scoreTotal).toBe(85);
  });

  it('acepta score como número', () => {
    const lead = normalizeLead({ ...base, score: 75 });
    expect(lead.scoreTotal).toBe(75);
  });

  it('sin score registrado deja scoreTotal en null (no inventa un 0)', () => {
    const lead = normalizeLead({ ...base, scoreTotal: null });
    expect(lead.scoreTotal).toBeNull();
  });

  it('sin ningún campo de score deja scoreTotal en null', () => {
    const lead = normalizeLead({ ...base });
    expect(lead.scoreTotal).toBeNull();
  });

  it('prefiere scoreTotal cuando vienen ambas formas', () => {
    const lead = normalizeLead({ ...base, scoreTotal: 90, score: { total: 10 } });
    expect(lead.scoreTotal).toBe(90);
  });

  it('ids uuid (string) producen claves distintas, no 0', () => {
    const a = normalizeLead({ ...base, id: '2bc9d1b0-d451-4957-b7ec-071035592d94' });
    const b = normalizeLead({ ...base, id: 'b5e58d75-3935-4a0a-97d0-1855b42af8ff' });
    expect(a.key).toBe('2bc9d1b0-d451-4957-b7ec-071035592d94');
    expect(b.key).not.toBe(a.key);
  });
});

describe('businessNameForKey', () => {
  const leads = [
    normalizeLead({ ...base, id: 6, dbId: '2bc9d1b0-d451-4957-b7ec-071035592d94' }),
  ];
  it('resuelve por id de piloto', () => {
    expect(businessNameForKey(leads, '6')).toBe('Santiago Ferrer Fontanería en General SL');
  });
  it('resuelve por uuid de BD', () => {
    expect(businessNameForKey(leads, '2bc9d1b0-d451-4957-b7ec-071035592d94')).toBe(
      'Santiago Ferrer Fontanería en General SL',
    );
  });
  it('devuelve la clave tal cual si no hay lead', () => {
    expect(businessNameForKey(leads, 'desconocido')).toBe('desconocido');
  });
});
