import { describe, expect, it } from 'vitest';
import {
  FallbackProvider,
  getProviderInfo,
  isProviderOperational,
  MockProvider,
  PROVIDERS,
  SpendBlockedError,
  type LlmProvider,
} from '../src/index.js';

// Local stand-in for the cost-control gate (ai-engine must not import it).
function createSpendGateShim() {
  return {
    check(provider: string, model: string): void {
      if (provider === 'groq') {
        throw new SpendBlockedError(provider as 'groq', model, 'effective spend limit is 0 EUR');
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
      readonly name = 'groq' as const;
      readonly model = 'llama-3.3-70b-versatile';

      async complete(): Promise<never> {
        gate.check('groq', 'llama-3.3-70b-versatile');
        throw new Error('unreachable');
      }
    })();
    const engine = new FallbackProvider([blocked, new MockProvider()]);
    await expect(engine.complete([{ role: 'user', content: 'hello' }])).rejects.toThrow(SpendBlockedError);
  });
});
