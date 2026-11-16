import { describe, expect, it, beforeEach } from 'vitest';
import {
  AGENT_LLM_CONFIG,
  classifyProviderFailure,
  createOperationalFallback,
  DEFAULT_AGENT_TOKEN_LIMITS,
  FallbackProvider,
  getProviderHealth,
  getProviderInfo,
  isProviderAvailable,
  isProviderOperational,
  LlmProviderError,
  MockProvider,
  operationalProviderNames,
  PROVIDERS,
  resetAllProviderHealth,
  SpendBlockedError,
  type LlmProvider,
  type LlmResponse,
} from '../src/index.js';

// Local stand-in for the cost-control gate (ai-engine must not import it).
function createSpendGateShim() {
  return {
    check(provider: string, model: string): void {
      if (provider === 'top-tools-ai') {
        throw new SpendBlockedError(provider as 'top-tools-ai', model, 'effective spend limit is 0 EUR');
      }
    },
  };
}

class FailingProvider implements LlmProvider {
  readonly name = 'groq' as const;
  readonly model = 'llama-3.3-70b-versatile';

  async complete(): Promise<never> {
    throw new Error('LLM request failed (groq, 401): invalid api key');
  }
}

describe('provider registry (instrucciones §3)', () => {
  it('registers all six providers with honest statuses', () => {
    expect(Object.keys(PROVIDERS)).toEqual([
      'groq',
      'openrouter',
      'top-tools-ai',
      'xai',
      'coarena',
      'mock',
    ]);
    expect(getProviderInfo('top-tools-ai').status).toBe('operational');
    expect(getProviderInfo('top-tools-ai').defaultModel).toBe('Top-Tools-Ai-Basic');
    expect(getProviderInfo('xai').status).toBe('credential-invalid');
    expect(getProviderInfo('coarena').status).toBe('credential-revoked');
    expect(getProviderInfo('groq').status).toBe('pending-credential');
    expect(getProviderInfo('openrouter').status).toBe('no-keys');
  });

  it('only top-tools-ai and mock are operational', () => {
    expect(isProviderOperational('top-tools-ai')).toBe(true);
    expect(isProviderOperational('mock')).toBe(true);
    expect(isProviderOperational('groq')).toBe(false);
    expect(isProviderOperational('openrouter')).toBe(false);
    expect(isProviderOperational('xai')).toBe(false);
    expect(isProviderOperational('coarena')).toBe(false);
  });
});

describe('fallback provider (§3)', () => {
  it('falls back to the next provider when the first fails', async () => {
    const engine = new FallbackProvider([new FailingProvider(), new MockProvider()]);
    const res = await engine.complete([{ role: 'user', content: 'hello' }]);
    expect(res.provider).toBe('mock');
    expect(res.text).toContain('[mock]');
  });

  it('throws when every provider fails', async () => {
    const engine = new FallbackProvider([new FailingProvider()]);
    await expect(engine.complete([{ role: 'user', content: 'hello' }])).rejects.toThrow(
      /All LLM providers failed/,
    );
  });

  it('does NOT retry the next provider when spend is blocked', async () => {
    const gate = createSpendGateShim();
    const blocked = new (class implements LlmProvider {
      readonly name = 'top-tools-ai' as const;
      readonly model = 'Top-Tools-Ai-Basic';

      async complete(): Promise<never> {
        gate.check('top-tools-ai', 'Top-Tools-Ai-Basic');
        throw new Error('unreachable');
      }
    })();
    const engine = new FallbackProvider([blocked, new MockProvider()]);
    await expect(engine.complete([{ role: 'user', content: 'hello' }])).rejects.toThrow(SpendBlockedError);
  });
});

describe('fallback provider, Fase B: operational chain, quota loss, limits (§3-§4)', () => {
  beforeEach(() => {
    resetAllProviderHealth();
  });

  it('(a) a transient failure on an operational provider falls back to the next one', async () => {
    let firstCalls = 0;
    const flaky = new (class implements LlmProvider {
      readonly name = 'top-tools-ai' as const;
      readonly model = 'Top-Tools-Ai-Basic';

      async complete(): Promise<never> {
        firstCalls += 1;
        throw new Error('LLM request failed (top-tools-ai, 503): service unavailable');
      }
    })();
    const engine = new FallbackProvider([flaky, new MockProvider()]);
    const res = await engine.complete([{ role: 'user', content: 'hello' }]);
    expect(firstCalls).toBe(1);
    expect(res.provider).toBe('mock');
  });

  it('(a2) a statically non-operational provider is skipped without being called', async () => {
    let calls = 0;
    const dead = new (class implements LlmProvider {
      readonly name = 'xai' as const;
      readonly model = 'grok-4.7';

      async complete(): Promise<LlmResponse> {
        calls += 1;
        return {
          text: 'should not be called',
          model: 'grok-4.7',
          provider: 'xai',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        };
      }
    })();
    const engine = new FallbackProvider([dead, new MockProvider()]);
    const res = await engine.complete([{ role: 'user', content: 'hello' }]);
    expect(calls).toBe(0);
    expect(res.provider).toBe('mock');
  });

  it('(b) a quota-loss signal (429) marks the provider unavailable and falls back without charges', async () => {
    const exhausted = new (class implements LlmProvider {
      readonly name = 'top-tools-ai' as const;
      readonly model = 'Top-Tools-Ai-Basic';

      async complete(): Promise<never> {
        throw new LlmProviderError('top-tools-ai', 429, 'rate_limit_exceeded', 'quota exhausted');
      }
    })();
    const engine = new FallbackProvider([exhausted, new MockProvider()]);
    const res = await engine.complete([{ role: 'user', content: 'hello' }]);
    expect(res.provider).toBe('mock');
    expect(getProviderHealth('top-tools-ai').available).toBe(false);
    expect(getProviderHealth('top-tools-ai').lastFailureKind).toBe('quota-lost');
    expect(isProviderAvailable('top-tools-ai')).toBe(false);
  });

  it('(b2) model_not_found marks the provider unavailable and falls back', async () => {
    const renamed = new (class implements LlmProvider {
      readonly name = 'top-tools-ai' as const;
      readonly model = 'Top-Tools-Ai';

      async complete(): Promise<never> {
        throw new LlmProviderError('top-tools-ai', 400, 'model_not_found', 'model not found');
      }
    })();
    const engine = new FallbackProvider([renamed, new MockProvider()]);
    const res = await engine.complete([{ role: 'user', content: 'hello' }]);
    expect(res.provider).toBe('mock');
    expect(getProviderHealth('top-tools-ai').lastFailureKind).toBe('model-not-found');
  });

  it('(c) a limit checker that blocks runs BEFORE any provider is called', async () => {
    let calls = 0;
    const counting = new (class extends MockProvider {
      override async complete(
        messages: Parameters<MockProvider['complete']>[0],
      ): Promise<LlmResponse> {
        calls += 1;
        return super.complete(messages);
      }
    })();
    const blockingChecker = {
      check(): void {
        throw new SpendBlockedError('mock', 'mock', 'token budget for agent "researcher" exhausted');
      },
    };
    const engine = new FallbackProvider([counting], { limitChecker: blockingChecker });
    await expect(
      engine.complete([{ role: 'user', content: 'hello' }], { agentKind: 'researcher' }),
    ).rejects.toThrow(SpendBlockedError);
    expect(calls).toBe(0);
  });

  it('createOperationalFallback chains only operational providers (Fase B: just top-tools-ai)', () => {
    expect(operationalProviderNames()).toEqual(['top-tools-ai']);
    const engine = createOperationalFallback();
    expect(engine.chainNames).toEqual(['top-tools-ai']);
  });

  it('per-agent token caps exist and designer gets the largest (code generation)', () => {
    expect(DEFAULT_AGENT_TOKEN_LIMITS.designer).toBe(800);
    expect(DEFAULT_AGENT_TOKEN_LIMITS.researcher).toBe(300);
    expect(DEFAULT_AGENT_TOKEN_LIMITS.sales).toBe(300);
    expect(AGENT_LLM_CONFIG.designer).toEqual({
      provider: 'top-tools-ai',
      model: 'Top-Tools-Ai-Basic',
      maxTokens: 800,
    });
    expect(AGENT_LLM_CONFIG.researcher.model).toBe('Top-Tools-Ai-Basic');
  });

  it('classifies failures: 401/429 quota-lost, model_not_found, 5xx transient', () => {
    expect(classifyProviderFailure(new LlmProviderError('xai', 401, 'invalid_api_key', 'x'))).toBe(
      'quota-lost',
    );
    expect(classifyProviderFailure(new LlmProviderError('top-tools-ai', 429, 'x', 'x'))).toBe(
      'quota-lost',
    );
    expect(
      classifyProviderFailure(new LlmProviderError('top-tools-ai', 400, 'model_not_found', 'x')),
    ).toBe('model-not-found');
    expect(classifyProviderFailure(new LlmProviderError('groq', 503, 'x', 'x'))).toBe('transient');
    expect(classifyProviderFailure(new Error('LLM request failed (groq, 401): invalid api key'))).toBe(
      'quota-lost',
    );
  });
});

describe('xAI Fase E: saldo agotado, clave NEXUS válida, grok fuera del fallback', () => {
  it('xAI is not operational and is excluded from the operational chain', () => {
    expect(isProviderOperational('xai')).toBe(false);
    expect(isProviderAvailable('xai')).toBe(false);
    expect(operationalProviderNames()).not.toContain('xai');
    expect(operationalProviderNames()).toEqual(['top-tools-ai']);
  });

  it('the xAI registry note records the $0.00 balance and the per-key breakdown', () => {
    const note = getProviderInfo('xai').note;
    expect(note).toContain('$0.00');
    expect(note).toContain('IGKt');
    expect(note).toContain('8jb0');
    expect(note).toContain('4mXW');
    expect(note).toContain('NO es la clave NEXUS');
  });

  it('no agent defaults to grok: every agent uses Top-Tools-Ai-Basic', () => {
    for (const cfg of Object.values(AGENT_LLM_CONFIG)) {
      expect(cfg.provider).toBe('top-tools-ai');
      expect(cfg.model).toBe('Top-Tools-Ai-Basic');
    }
  });
});
