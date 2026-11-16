import { describe, expect, it } from 'vitest';
import { SpendBlockedError } from '@weblead/ai-engine';
import {
  createSpendGate,
  DEFAULT_EFFECTIVE_SPEND_LIMIT_EUR_CENTS,
  InMemoryUsageStore,
  REFERENCE_MONTHLY_BUDGET_EUR_CENTS,
} from '../src/index.js';

describe('spend gate (effective limit ZERO until Jon approves)', () => {
  it('reference budget is 30 EUR/month, effective limit is 0', () => {
    expect(REFERENCE_MONTHLY_BUDGET_EUR_CENTS).toBe(3000);
    expect(DEFAULT_EFFECTIVE_SPEND_LIMIT_EUR_CENTS).toBe(0);
  });

  it('blocks paid providers while the effective limit is 0', () => {
    const gate = createSpendGate(0);
    expect(() => gate.check('groq', 'llama-3.3-70b-versatile')).toThrow(SpendBlockedError);
    expect(() => gate.check('openrouter', 'meta-llama/llama-3.3-70b-instruct:free')).toThrow(SpendBlockedError);
    expect(() => gate.check('xai', 'grok-4.7')).toThrow(SpendBlockedError);
    expect(() => gate.check('coarena', 'coarena-default')).toThrow(SpendBlockedError);
    expect(() => gate.check('top-tools-ai', 'Top-Tools-Ai-Pro')).toThrow(SpendBlockedError);
  });

  it('allows verified-free calls while the effective limit is 0', () => {
    const gate = createSpendGate(0);
    expect(() => gate.check('top-tools-ai', 'Top-Tools-Ai-Basic')).not.toThrow();
    expect(() => gate.check('mock', 'mock')).not.toThrow();
  });

  it('allows paid calls once a limit above 0 is approved', () => {
    const gate = createSpendGate(3000);
    expect(() => gate.check('groq', 'llama-3.3-70b-versatile')).not.toThrow();
  });
});

describe('costs summary (the 8 dashboard indicators, §8)', () => {
  it('returns all 8 indicators with zeros when nothing was recorded', () => {
    const store = new InMemoryUsageStore();
    const s = store.summary(0);
    expect(s.totalEstimatedCostCents).toBe(0);
    expect(s.totalConfirmedCostCents).toBeNull();
    expect(s.byAgent).toEqual({});
    expect(s.byBusiness).toEqual({});
    expect(s.byWebsite).toEqual({});
    expect(s.byOpportunity).toEqual({});
    expect(s.byProvider).toEqual([]);
    expect(s.freeQuotas.length).toBeGreaterThan(0);
    expect(s.alerts.some((a) => a.level === 'blocked')).toBe(true);
    expect(s.budget.referenceMonthlyBudgetEurCents).toBe(3000);
    expect(s.budget.effectiveSpendLimitEurCents).toBe(0);
  });

  it('keeps estimated and confirmed costs separate, always', () => {
    const store = new InMemoryUsageStore();
    store.record({
      provider: 'top-tools-ai',
      service: 'llm',
      model: 'Top-Tools-Ai-Basic',
      requests: 4,
      promptTokens: 373,
      completionTokens: 432,
      imagesGenerated: 0,
      estimatedCostCents: 0,
      confirmedCostCents: null,
      agentKind: 'researcher',
      businessId: '4',
    });
    const s = store.summary(0);
    expect(s.totalEstimatedCostCents).toBe(0);
    // No provider confirmed any charge: confirmed stays null, never 0-as-fact.
    expect(s.totalConfirmedCostCents).toBeNull();
    expect(s.byAgent.researcher?.requests).toBe(4);
    expect(s.byBusiness['4']?.requests).toBe(4);
    expect(s.byProvider[0]?.provider).toBe('top-tools-ai');
    expect(s.byProvider[0]?.promptTokens).toBe(373);
  });
});
