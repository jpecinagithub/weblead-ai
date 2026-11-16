/**
 * AI abstraction layer — multiprovider (instrucciones-equipo-agentes §3).
 * NO agent may depend on a single provider. Providers are interchangeable
 * through `LlmProvider`; selection is centralised (`AgentModelConfig`),
 * fallback tries providers in order, and every call passes an optional
 * `SpendGate` (see @weblead/cost-control) that blocks paid calls when the
 * authorised spend is 0.
 *
 * Provider status (verified facts only — Fase A 2026-11-16, re-verified Fase B 2026-11-16):
 * - top-tools-ai: OPERATIONAL. Default. Free-tier model Top-Tools-Ai-Basic
 *   measured: Fase A 4 dossiers, 805 tokens, 0.00 USD; Fase B 4 agent tasks,
 *   949 tokens, 0.00 USD. `models` lists exactly 3 ids (Basic/Pro/Max);
 *   old names (Top-Tools-Ai, Kimi-K2.6) return 400 model_not_found.
 *   Pro/Max free-tier inclusion is NOT confirmed — never called.
 * - xai: CONFIGURED, NOT OPERATIONAL. Registered credential INVALID
 *   (400 Incorrect API key, Fase A; re-confirmed Fase B 2026-11-16).
 *   Do not depend on it until reconnected.
 * - coarena: CONFIGURED, NOT OPERATIONAL. Registered key REVOKED
 *   (401 api_key_revoked, Fase A; re-confirmed 401 Fase B 2026-11-16).
 *   Do not depend on it until reconnected.
 * - groq: PENDING CREDENTIAL. First candidate provider (§3), but no key
 *   is assumed: only the "Audio to Text" key remains in NEXUS (seed.ts,
 *   verified Fase B); no Groq connector/helper exists. Pending for Jon.
 * - openrouter: NO KEYS. The 4 keys were deleted 2026-11-14 (MEMORY);
 *   balance 1.09 USD remains but no usable key; no connector/helper
 *   exists. Pending for Jon.
 * - mock: deterministic, for tests. No network, no key, no cost.
 *
 * Free-quota loss detection (Fase B, §4): any 401/403, 429 quota signal
 * or model_not_found marks the provider unavailable at runtime
 * (`markProviderUnavailable`) and the fallback chain never retries it
 * with charges — see `classifyProviderFailure` and `getProviderHealth`.
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
    note: 'First candidate provider (§3). Fase B 2026-11-16: no inference key exists — only the "Audio to Text" key remains in NEXUS (seed.ts) and there is no Groq connector/helper. Pending credential from Jon.',
  },
  openrouter: {
    name: 'openrouter',
    status: 'no-keys',
    baseUrl: 'https://openrouter.ai/api/v1',
    envKey: 'OPENROUTER_API_KEY',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    freeTier: false,
    note: 'Alternative provider (§3). Fase B 2026-11-16: still no keys (the 4 keys were deleted 2026-11-14; balance 1.09 USD without a usable key) and no connector/helper exists. Pending credential from Jon.',
  },
  'top-tools-ai': {
    name: 'top-tools-ai',
    status: 'operational',
    baseUrl: 'https://top-tools-ai.com/api/v1',
    envKey: 'TOP_TOOLS_API_KEY',
    defaultModel: 'Top-Tools-Ai-Basic',
    freeTier: true,
    note: 'Default provider. Top-Tools-Ai-Basic measured Fase A (805 tokens / 4 dossiers) and Fase B (949 tokens / 4 agent tasks), 0.00 USD both. `models` lists exactly Basic/Pro/Max; old names return 400 model_not_found. Pro/Max free-tier inclusion NOT confirmed — never called.',
  },
  xai: {
    name: 'xai',
    status: 'credential-invalid',
    baseUrl: 'https://api.x.ai/v1',
    envKey: 'XAI_API_KEY',
    defaultModel: 'grok-4.7',
    freeTier: false,
    note: 'NOT OPERATIONAL: registered credential invalid (400 Incorrect API key, Fase A; re-confirmed Fase B 2026-11-16). Reconnect before any use.',
  },
  coarena: {
    name: 'coarena',
    status: 'credential-revoked',
    baseUrl: 'https://coarena.ai/api/v1',
    envKey: 'COARENA_API_KEY',
    defaultModel: 'coarena-default',
    freeTier: false,
    note: 'NOT OPERATIONAL: registered key revoked (401 api_key_revoked, Fase A; re-confirmed 401 Fase B 2026-11-16). Reconnect before any use.',
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

/**
 * Typed provider failure (Fase B, §4 — free-quota loss detection).
 * Carries the HTTP status and the provider's error code so the fallback
 * chain can tell a lost free quota apart from a transient failure.
 */
export class LlmProviderError extends Error {
  readonly provider: LlmProviderName;
  readonly status: number;
  readonly code: string;

  constructor(provider: LlmProviderName, status: number, code: string, detail: string) {
    super(`LLM request failed (${provider}, ${status} ${code}): ${detail.slice(0, 300)}`);
    this.name = 'LlmProviderError';
    this.provider = provider;
    this.status = status;
    this.code = code;
  }
}

export type ProviderFailureKind = 'quota-lost' | 'auth' | 'model-not-found' | 'transient' | 'unknown';

/**
 * Classifies a provider failure (Fase B §4). Anything that means "this
 * provider will not serve us for free any more" is `quota-lost` and must
 * NEVER be retried with charges:
 * - 401/403: credential rejected / revoked / quota revoked → quota-lost
 *   (auth and quota loss are indistinguishable from the outside, and the
 *   safe action is the same: stop calling, mark unavailable).
 * - 429: rate/quota limit hit → quota-lost (a free tier that answers 429
 *   is exhausted; retrying could flip to a paid tier).
 * - 400/404 with model_not_found: the model id is gone → model-not-found.
 * - 5xx / network errors: transient, safe to try the next provider.
 */
export function classifyProviderFailure(err: unknown): ProviderFailureKind {
  if (err instanceof LlmProviderError) {
    if (err.status === 401 || err.status === 403) return 'quota-lost';
    if (err.status === 429) return 'quota-lost';
    if (err.code === 'model_not_found') return 'model-not-found';
    if (err.status >= 500) return 'transient';
    return 'unknown';
  }
  const message = err instanceof Error ? err.message : String(err);
  if (/model_not_found/i.test(message)) return 'model-not-found';
  if (/ 401| 403|unauthorized|api_key_revoked|invalid_api_key|Incorrect API key/i.test(message)) return 'quota-lost';
  if (/ 429|rate limit|quota/i.test(message)) return 'quota-lost';
  if (/ 5\d\d|ECONNRESET|ETIMEDOUT|fetch failed|network/i.test(message)) return 'transient';
  return 'unknown';
}

/** A quota-lost / auth / model-not-found failure must never be retried for charges. */
export function isQuotaLossSignal(err: unknown): boolean {
  const kind = classifyProviderFailure(err);
  return kind === 'quota-lost' || kind === 'auth' || kind === 'model-not-found';
}

export type ProviderHealth = {
  available: boolean;
  lastCheckedAt: string | null;
  lastError: string | null;
  lastFailureKind: ProviderFailureKind | null;
};

/** Runtime health, layered over the static PROVIDERS registry. */
const providerHealth = new Map<LlmProviderName, ProviderHealth>();

export function getProviderHealth(name: LlmProviderName): ProviderHealth {
  return (
    providerHealth.get(name) ?? {
      available: isProviderOperational(name),
      lastCheckedAt: null,
      lastError: null,
      lastFailureKind: null,
    }
  );
}

/** Marks a provider unavailable at runtime (free quota lost, key revoked…). Never retries it with charges. */
export function markProviderUnavailable(name: LlmProviderName, err: unknown): ProviderHealth {
  const health: ProviderHealth = {
    available: false,
    lastCheckedAt: new Date().toISOString(),
    lastError: err instanceof Error ? err.message.slice(0, 300) : String(err).slice(0, 300),
    lastFailureKind: classifyProviderFailure(err),
  };
  providerHealth.set(name, health);
  return health;
}

/** Restores a provider to its static registry status (after Jon reconnects a key, for example). */
export function resetProviderHealth(name: LlmProviderName): void {
  providerHealth.delete(name);
}

export function resetAllProviderHealth(): void {
  providerHealth.clear();
}

/** A provider is callable only if its static status is operational AND runtime health has not marked it down. */
export function isProviderAvailable(name: LlmProviderName): boolean {
  return getProviderHealth(name).available;
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
 * un modelo diferente"). Defaults below are the Fase B measurement result:
 * Top-Tools-Ai-Basic verified fit for researcher, designer, auditor and
 * sales tasks (docs/phase-b-measurements.md, 2026-11-16). Orchestrator and
 * CRM reuse Basic until Fase B measures a reasoning model for them — no
 * model is chosen "just because it is free": each default below is either
 * measured or explicitly marked unmeasured.
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

/**
 * Per-agent completion-token cap per call (§3 "Control de tokens").
 * Applied as `maxTokens` on every call for that agent. Designer gets the
 * largest cap (code generation); researcher/sales/crm the smallest.
 * These are per-call caps, not budgets — the cumulative per-agent /
 * per-business / per-website budgets live in @weblead/cost-control
 * (TokenBudgetTracker) and block before any call is made.
 */
export const DEFAULT_AGENT_TOKEN_LIMITS: Record<AgentKind, number> = {
  orchestrator: 500,
  researcher: 300,
  designer: 800,
  auditor: 400,
  sales: 300,
  crm: 300,
};

/** Combined per-agent LLM config: model + per-call token cap. */
export type AgentLlmConfig = Record<AgentKind, { provider: LlmProviderName; model: string; maxTokens: number }>;

export const AGENT_LLM_CONFIG: AgentLlmConfig = Object.fromEntries(
  (Object.keys(DEFAULT_AGENT_MODELS) as AgentKind[]).map((kind) => [
    kind,
    { ...DEFAULT_AGENT_MODELS[kind], maxTokens: DEFAULT_AGENT_TOKEN_LIMITS[kind] },
  ]),
) as AgentLlmConfig;

/** Priority order for the fallback chain. Top Tools AI first because it is the only operational provider (Fase B); Groq/OpenRouter/xAI/CoArena follow in §3 priority order and join the chain only when they become operational. */
export const FALLBACK_PRIORITY: readonly LlmProviderName[] = [
  'top-tools-ai',
  'groq',
  'openrouter',
  'xai',
  'coarena',
];

/** Provider names that are callable right now (static status + runtime health), in fallback priority order. */
export function operationalProviderNames(): LlmProviderName[] {
  return FALLBACK_PRIORITY.filter((name) => isProviderAvailable(name));
}

/** A limit checker consulted before any provider is called (see @weblead/cost-control TokenBudgetTracker). */
export interface CallLimitChecker {
  check(options?: LlmRequestOptions): void;
}

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
    let code = `http_${res.status}`;
    try {
      const parsed = JSON.parse(detail) as { error?: { code?: string; message?: string }; code?: string };
      code = parsed?.error?.code ?? parsed?.code ?? code;
      if (/model_not_found/i.test(detail)) code = 'model_not_found';
    } catch {
      if (/model_not_found/i.test(detail)) code = 'model_not_found';
    }
    throw new LlmProviderError(provider, res.status, code, detail);
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
 * answers. Rules, in order:
 * 1. The optional limit checker runs BEFORE any provider is called; if it
 *    throws SpendBlockedError the call is blocked and no provider is tried.
 * 2. Providers that are not available (static status not operational, or
 *    runtime health marked them down) are skipped without a call.
 * 3. A provider that fails with a transient error never takes the whole
 *    call down — the next provider is tried.
 * 4. A SpendBlockedError is NOT retried on the next provider — a blocked
 *    spend stays blocked.
 * 5. A quota-loss signal (401/403, 429, model_not_found) marks that
 *    provider unavailable at runtime and is never retried with charges.
 */
export class FallbackProvider implements LlmProvider {
  readonly name: LlmProviderName;
  readonly model: string;
  private readonly chain: LlmProvider[];
  private readonly limitChecker?: CallLimitChecker;

  constructor(providers: LlmProvider[], options: { limitChecker?: CallLimitChecker } = {}) {
    if (providers.length === 0) throw new Error('FallbackProvider needs at least one provider.');
    this.chain = providers;
    const first = providers[0] as LlmProvider;
    this.name = first.name;
    this.model = first.model;
    this.limitChecker = options.limitChecker;
  }

  get chainNames(): LlmProviderName[] {
    return this.chain.map((p) => p.name);
  }

  async complete(messages: LlmMessage[], options?: LlmRequestOptions): Promise<LlmResponse> {
    // (1) Limits block before any call is made.
    this.limitChecker?.check(options);
    const errors: string[] = [];
    for (const provider of this.chain) {
      // (2) Never call a provider that is known unavailable.
      if (!isProviderAvailable(provider.name)) {
        const health = getProviderHealth(provider.name);
        errors.push(
          `${provider.name}: skipped (not operational: ${PROVIDERS[provider.name].status}` +
            `${health.lastFailureKind ? `, last failure: ${health.lastFailureKind}` : ''})`,
        );
        continue;
      }
      try {
        return await provider.complete(messages, options);
      } catch (err) {
        // (4) A blocked spend stays blocked.
        if (err instanceof SpendBlockedError) throw err;
        // (5) Free quota lost: mark down, never retry with charges.
        if (isQuotaLossSignal(err)) {
          markProviderUnavailable(provider.name, err);
          errors.push(`${provider.name}: ${err instanceof Error ? err.message : String(err)} (marked unavailable)`);
          continue;
        }
        errors.push(`${provider.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    throw new Error(`All LLM providers failed: ${errors.join(' | ')}`);
  }
}

/**
 * Builds the fallback chain from the providers that are operational right
 * now, in FALLBACK_PRIORITY order. Non-operational providers are left out
 * entirely (they join only when Jon reconnects/provides a credential and
 * their status becomes operational). In Fase B the chain is just
 * [top-tools-ai]; the rest join automatically when they become available.
 */
export function createOperationalFallback(
  spendGate?: SpendGate,
  limitChecker?: CallLimitChecker,
): FallbackProvider {
  const names = operationalProviderNames();
  if (names.length === 0) throw new Error('No LLM provider is operational right now.');
  return new FallbackProvider(
    names.map((name) =>
      createProvider({ provider: name, model: PROVIDERS[name].defaultModel, spendGate }),
    ),
    { limitChecker },
  );
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
