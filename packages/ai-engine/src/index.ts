/**
 * AI abstraction layer — multiprovider (instrucciones-equipo-agentes §3).
 * NO agent may depend on a single provider. Providers are interchangeable
 * through `LlmProvider`; selection is centralised (`AgentModelConfig`),
 * fallback tries providers in order, and every call passes an optional
 * `SpendGate` (see @weblead/cost-control) that blocks paid calls when the
 * authorised spend is 0.
 *
 * Provider status (verified facts only — Fase A 2026-11-16, MEMORY):
 * - top-tools-ai: OPERATIONAL. Default. Free-tier model Top-Tools-Ai-Basic
 *   measured: 4 dossiers, 805 tokens, 0.00 USD. Old model names
 *   (Top-Tools-Ai, Kimi-K2.6) return 400 model_not_found.
 * - xai: CONFIGURED, NOT OPERATIONAL. Registered credential INVALID
 *   (400 Incorrect API key). Do not depend on it until reconnected.
 * - coarena: CONFIGURED, NOT OPERATIONAL. Registered key REVOKED
 *   (401 api_key_revoked). Do not depend on it until reconnected.
 * - groq: PENDING CREDENTIAL. First candidate provider (§3), but no key
 *   is assumed: only the "Audio to Text" key remains in NEXUS (MEMORY
 *   2026-11-14). Real key check is Fase B work, not Phase 0.
 * - openrouter: NO KEYS. The 4 keys were deleted 2026-11-14 (MEMORY);
 *   balance 1.09 USD remains but no usable key. Fase B work.
 * - mock: deterministic, for tests. No network, no key, no cost.
 *
 * Keys come from env only. Never in code, never in git.
 */

export type LlmRole = 'system' | 'user' | 'assistant';

export type LlmMessage = {
  role: LlmRole;
  content: string;
};

export type LlmUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type LlmResponse = {
  text: string;
  model: string;
  provider: LlmProviderName;
  usage: LlmUsage;
};

export type LlmProviderName = 'groq' | 'openrouter' | 'top-tools-ai' | 'xai' | 'coarena' | 'mock';

export type ProviderStatus =
  | 'operational'
  | 'pending-credential'
  | 'no-keys'
  | 'credential-invalid'
  | 'credential-revoked'
  | 'mock';

export type ProviderInfo = {
  name: LlmProviderName;
  status: ProviderStatus;
  baseUrl: string;
  envKey: string;
  defaultModel: string;
  /** Free tier verified by measurement (not assumed). */
  freeTier: boolean;
  note: string;
};

/** Central provider registry — the single place that knows every provider. */
export const PROVIDERS: Readonly<Record<LlmProviderName, ProviderInfo>> = {
  groq: {
    name: 'groq',
    status: 'pending-credential',
    baseUrl: 'https://api.groq.com/openai/v1',
    envKey: 'GROQ_API_KEY',
    defaultModel: 'llama-3.3-70b-versatile',
    freeTier: false,
    note: 'First candidate provider (§3). No key assumed — only the "Audio to Text" key remains (MEMORY 2026-11-14). Key check is Fase B.',
  },
  openrouter: {
    name: 'openrouter',
    status: 'no-keys',
    baseUrl: 'https://openrouter.ai/api/v1',
    envKey: 'OPENROUTER_API_KEY',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    freeTier: false,
    note: 'Alternative provider (§3). The 4 keys were deleted 2026-11-14; no usable key. Key check is Fase B.',
  },
  'top-tools-ai': {
    name: 'top-tools-ai',
    status: 'operational',
    baseUrl: 'https://top-tools-ai.com/api/v1',
    envKey: 'TOP_TOOLS_API_KEY',
    defaultModel: 'Top-Tools-Ai-Basic',
    freeTier: true,
    note: 'Default provider. Model Top-Tools-Ai-Basic measured in Fase A: 805 tokens / 4 dossiers, 0.00 USD. Old names return 400 model_not_found.',
  },
  xai: {
    name: 'xai',
    status: 'credential-invalid',
    baseUrl: 'https://api.x.ai/v1',
    envKey: 'XAI_API_KEY',
    defaultModel: 'grok-4.7',
    freeTier: false,
    note: 'NOT OPERATIONAL: registered credential invalid (400 Incorrect API key, Fase A 2026-11-16). Reconnect before any use.',
  },
  coarena: {
    name: 'coarena',
    status: 'credential-revoked',
    baseUrl: 'https://coarena.ai/api/v1',
    envKey: 'COARENA_API_KEY',
    defaultModel: 'coarena-default',
    freeTier: false,
    note: 'NOT OPERATIONAL: registered key revoked (401 api_key_revoked, Fase A). Reconnect before any use.',
  },
  mock: {
    name: 'mock',
    status: 'mock',
    baseUrl: '',
    envKey: '',
    defaultModel: 'mock',
    freeTier: true,
    note: 'Deterministic provider for tests. No network, no key, no cost.',
  },
};

export function getProviderInfo(name: LlmProviderName): ProviderInfo {
  return PROVIDERS[name];
}

export function isProviderOperational(name: LlmProviderName): boolean {
  return PROVIDERS[name].status === 'operational' || PROVIDERS[name].status === 'mock';
}

/** Default model: the renamed Top Tools AI free-tier model (Fase A measured). */
export const DEFAULT_LLM_MODEL = 'Top-Tools-Ai-Basic';
export const DEFAULT_LLM_PROVIDER: LlmProviderName = 'top-tools-ai';

export type LlmRequestOptions = {
  /** Hard cap on completion tokens for this call (token control, §3). */
  maxTokens?: number;
  /** Agent making the call (usage recording + per-agent limits, §3). */
  agentKind?: string;
  /** Business the call is about (per-business limits, §3). */
  businessId?: string;
  /** Website project the call is about (per-website limits, §3). */
  websiteProjectId?: string;
};

export interface LlmProvider {
  readonly name: LlmProviderName;
  readonly model: string;
  complete(messages: LlmMessage[], options?: LlmRequestOptions): Promise<LlmResponse>;
}

/**
 * Spend gate (implemented by @weblead/cost-control; the interface lives
 * here so ai-engine never imports cost-control). A denied call throws
 * SpendBlockedError before any request leaves the process.
 */
export interface SpendGate {
  check(provider: LlmProviderName, model: string): void;
}

export class SpendBlockedError extends Error {
  readonly provider: LlmProviderName;
  readonly model: string;

  constructor(provider: LlmProviderName, model: string, reason: string) {
    super(`LLM call blocked: ${provider}/${model} — ${reason}`);
    this.name = 'SpendBlockedError';
    this.provider = provider;
    this.model = model;
  }
}

export type AiEngineConfig = {
  provider: LlmProviderName;
  model: string;
  baseUrl?: string;
  apiKey?: string;
  spendGate?: SpendGate;
};

/**
 * Centralised per-agent model selection (§3: "Cada agente podrá utilizar
 * un modelo diferente"). Defaults below are placeholders for Fase B
 * measurement — no model is chosen "just because it is free": Fase B must
 * verify each one works for its job before it becomes the default.
 */
export type AgentKind = 'orchestrator' | 'researcher' | 'designer' | 'auditor' | 'sales' | 'crm';

export type AgentModelConfig = Record<AgentKind, { provider: LlmProviderName; model: string }>;

export const DEFAULT_AGENT_MODELS: AgentModelConfig = {
  orchestrator: { provider: 'top-tools-ai', model: DEFAULT_LLM_MODEL },
  researcher: { provider: 'top-tools-ai', model: DEFAULT_LLM_MODEL },
  designer: { provider: 'top-tools-ai', model: DEFAULT_LLM_MODEL },
  auditor: { provider: 'top-tools-ai', model: DEFAULT_LLM_MODEL },
  sales: { provider: 'top-tools-ai', model: DEFAULT_LLM_MODEL },
  crm: { provider: 'top-tools-ai', model: DEFAULT_LLM_MODEL },
};

/** OpenAI-compatible chat completions call (all five real providers speak it). */
async function openAiCompatibleComplete(
  provider: LlmProviderName,
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: LlmMessage[],
  options?: LlmRequestOptions,
): Promise<LlmResponse> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      ...(options?.maxTokens !== undefined ? { max_tokens: options.maxTokens } : {}),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`LLM request failed (${provider}/${model}, ${res.status}): ${detail.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };
  const text = data.choices?.[0]?.message?.content ?? '';
  const usage = data.usage ?? {};
  return {
    text,
    model,
    provider,
    usage: {
      promptTokens: usage.prompt_tokens ?? 0,
      completionTokens: usage.completion_tokens ?? 0,
      totalTokens: usage.total_tokens ?? 0,
    },
  };
}

/** One class per provider, all OpenAI-compatible. Keys from env only. */
export class OpenAiCompatibleProvider implements LlmProvider {
  readonly name: LlmProviderName;
  readonly model: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly spendGate?: SpendGate;

  constructor(name: LlmProviderName, config: { model?: string; baseUrl?: string; apiKey?: string; spendGate?: SpendGate } = {}) {
    const info = PROVIDERS[name];
    this.name = name;
    this.model = config.model ?? info.defaultModel;
    this.baseUrl = config.baseUrl ?? info.baseUrl;
    this.apiKey = config.apiKey ?? (info.envKey ? process.env[info.envKey] ?? '' : '');
    this.spendGate = config.spendGate;
  }

  async complete(messages: LlmMessage[], options?: LlmRequestOptions): Promise<LlmResponse> {
    this.spendGate?.check(this.name, this.model);
    if (!this.apiKey) {
      throw new Error(`${PROVIDERS[this.name].envKey} is not set (env only, never in code).`);
    }
    return openAiCompatibleComplete(this.name, this.baseUrl, this.apiKey, this.model, messages, options);
  }
}

export class GroqProvider extends OpenAiCompatibleProvider {
  constructor(config: { model?: string; baseUrl?: string; apiKey?: string; spendGate?: SpendGate } = {}) {
    super('groq', config);
  }
}

export class OpenRouterProvider extends OpenAiCompatibleProvider {
  constructor(config: { model?: string; baseUrl?: string; apiKey?: string; spendGate?: SpendGate } = {}) {
    super('openrouter', config);
  }
}

export class TopToolsAiProvider extends OpenAiCompatibleProvider {
  constructor(config: { model?: string; baseUrl?: string; apiKey?: string; spendGate?: SpendGate } = {}) {
    super('top-tools-ai', config);
  }
}

export class XaiProvider extends OpenAiCompatibleProvider {
  constructor(config: { model?: string; baseUrl?: string; apiKey?: string; spendGate?: SpendGate } = {}) {
    // NOTE: unusable until the xAI credential is reconnected (Fase A blocker).
    super('xai', config);
  }
}

export class CoArenaProvider extends OpenAiCompatibleProvider {
  constructor(config: { model?: string; baseUrl?: string; apiKey?: string; spendGate?: SpendGate } = {}) {
    // NOTE: unusable until the CoArena key is reconnected (revoked, Fase A).
    super('coarena', config);
  }
}

/** Deterministic provider for tests — no network, no key, no cost. */
export class MockProvider implements LlmProvider {
  readonly name: LlmProviderName = 'mock';
  readonly model = 'mock';

  async complete(messages: LlmMessage[]): Promise<LlmResponse> {
    const last = messages[messages.length - 1]?.content ?? '';
    return {
      text: `[mock] ${last.slice(0, 120)}`,
      model: 'mock',
      provider: 'mock',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };
  }
}

export function createProvider(config: AiEngineConfig): LlmProvider {
  switch (config.provider) {
    case 'groq':
      return new GroqProvider(config);
    case 'openrouter':
      return new OpenRouterProvider(config);
    case 'top-tools-ai':
      return new TopToolsAiProvider(config);
    case 'xai':
      return new XaiProvider(config);
    case 'coarena':
      return new CoArenaProvider(config);
    case 'mock':
      return new MockProvider();
    default:
      throw new Error(`Unknown LLM provider: ${String(config.provider)}`);
  }
}

/**
 * Fallback engine (§3): tries providers in order and uses the first that
 * answers. A provider that fails (bad key, 400 model_not_found, network)
 * never takes the whole call down, and a SpendBlockedError is NOT retried
 * on the next provider — a blocked spend stays blocked.
 */
export class FallbackProvider implements LlmProvider {
  readonly name: LlmProviderName;
  readonly model: string;
  private readonly chain: LlmProvider[];

  constructor(providers: LlmProvider[]) {
    if (providers.length === 0) throw new Error('FallbackProvider needs at least one provider.');
    this.chain = providers;
    const first = providers[0] as LlmProvider;
    this.name = first.name;
    this.model = first.model;
  }

  get chainNames(): LlmProviderName[] {
    return this.chain.map((p) => p.name);
  }

  async complete(messages: LlmMessage[], options?: LlmRequestOptions): Promise<LlmResponse> {
    const errors: string[] = [];
    for (const provider of this.chain) {
      try {
        return await provider.complete(messages, options);
      } catch (err) {
        if (err instanceof SpendBlockedError) throw err;
        errors.push(`${provider.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    throw new Error(`All LLM providers failed: ${errors.join(' | ')}`);
  }
}

/** Builds the engine from env. Defaults: top-tools-ai / Top-Tools-Ai-Basic. */
export function createEngineFromEnv(
  env: Record<string, string | undefined> = process.env,
  spendGate?: SpendGate,
): LlmProvider {
  const provider = (env.LLM_PROVIDER ?? DEFAULT_LLM_PROVIDER) as LlmProviderName;
  const model = env.LLM_MODEL ?? DEFAULT_LLM_MODEL;
  const info = PROVIDERS[provider];
  if (!info) throw new Error(`Unknown LLM provider: ${String(provider)}`);
  const apiKey = info.envKey ? env[info.envKey] : undefined;
  const primary = createProvider({ provider, model, baseUrl: env.LLM_BASE_URL, apiKey, spendGate });
  const fallbackNames = (env.LLM_FALLBACK_PROVIDERS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is LlmProviderName => s !== '' && s in PROVIDERS && s !== provider);
  if (fallbackNames.length === 0) return primary;
  return new FallbackProvider([
    primary,
    ...fallbackNames.map((name) => {
      const fallbackInfo = PROVIDERS[name];
      return createProvider({
        provider: name,
        model: fallbackInfo.defaultModel,
        apiKey: fallbackInfo.envKey ? env[fallbackInfo.envKey] : undefined,
        spendGate,
      });
    }),
  ]);
}
