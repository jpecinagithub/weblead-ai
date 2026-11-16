import { describe, expect, it } from 'vitest';
import { SpendBlockedError } from '@weblead/ai-engine';
import {
  createSpendGate,
  DEFAULT_AGENT_TOKEN_BUDGETS,
  DEFAULT_BUSINESS_TOKEN_BUDGET,
  DEFAULT_EFFECTIVE_SPEND_LIMIT_EUR_CENTS,
  DEFAULT_WEBSITE_TOKEN_BUDGET,
  InMemoryUsageStore,
  REFERENCE_MONTHLY_BUDGET_EUR_CENTS,
  TokenBudgetTracker,
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

describe('token budgets (Fase B §3: per agent / business / website, block before the call)', () => {
  it('defaults allow dozens of Fase B tasks (~200-300 tokens each)', () => {
    expect(DEFAULT_AGENT_TOKEN_BUDGETS.researcher).toBe(20000);
    expect(DEFAULT_AGENT_TOKEN_BUDGETS.designer).toBe(40000);
    expect(DEFAULT_BUSINESS_TOKEN_BUDGET).toBe(10000);
    expect(DEFAULT_WEBSITE_TOKEN_BUDGET).toBe(50000);
  });

  it('passes while under budget and records consumption', () => {
    const tracker = new TokenBudgetTracker();
    expect(() => tracker.check('researcher', '4')).not.toThrow();
    tracker.record('researcher', 230, '4');
    expect(tracker.agentTokens('researcher')).toBe(230);
    expect(tracker.businessTokens('4')).toBe(230);
    expect(() => tracker.check('researcher', '4')).not.toThrow();
  });

  it('blocks the agent when its budget is exhausted', () => {
    const tracker = new TokenBudgetTracker({ agentBudgets: { researcher: 300 } });
    tracker.record('researcher', 300, '4');
    expect(() => tracker.check('researcher', '4')).toThrow(SpendBlockedError);
    expect(() => tracker.check('researcher', '4')).toThrow(/token budget for agent "researcher"/);
    // Another agent is unaffected.
    expect(() => tracker.check('sales', '4')).not.toThrow();
  });

  it('blocks the business when its budget is exhausted', () => {
    const tracker = new TokenBudgetTracker({ businessBudget: 500 });
    tracker.record('researcher', 300, '4');
    tracker.record('sales', 200, '4');
    expect(() => tracker.check('sales', '4')).toThrow(/token budget for business "4"/);
    expect(() => tracker.check('sales', '5')).not.toThrow();
  });

  it('blocks the website when its budget is exhausted', () => {
    const tracker = new TokenBudgetTracker({ websiteBudget: 500 });
    tracker.record('designer', 500, '4', 'web-1');
    expect(() => tracker.check('designer', '4', 'web-1')).toThrow(/token budget for website "web-1"/);
  });

  it('asLimitChecker adapts to the ai-engine checker shape', () => {
    const tracker = new TokenBudgetTracker({ agentBudgets: { auditor: 100 } });
    const checker = tracker.asLimitChecker();
    tracker.record('auditor', 100);
    expect(() => checker.check({ agentKind: 'auditor' })).toThrow(SpendBlockedError);
    expect(() => checker.check({ agentKind: 'researcher' })).not.toThrow();
    expect(() => checker.check()).not.toThrow();
  });
});
