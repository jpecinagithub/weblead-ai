# @weblead/ai-engine

Multiprovider AI abstraction layer (instrucciones-equipo-agentes §3).
No agent depends on a single provider.

- `LlmProvider` — common interface (`complete`). All five real providers
  speak OpenAI-compatible chat completions.
- `PROVIDERS` — central registry with honest status per provider:
  `top-tools-ai` operational (default, `Top-Tools-Ai-Basic`, measured
  0.00 USD in Fase A); `xai` credential-invalid; `coarena`
  credential-revoked; `groq` pending-credential; `openrouter` no-keys;
  `mock` for tests.
- `DEFAULT_AGENT_MODELS` — centralised per-agent model selection
  (placeholders until Fase B verifies each model for its job).
- `FallbackProvider` — tries providers in order; a `SpendBlockedError`
  is never retried on the next provider.
- `SpendGate` — interface implemented by `@weblead/cost-control`;
  blocks paid calls while the effective spend limit is 0.
- `createEngineFromEnv()` — reads `LLM_PROVIDER` / `LLM_MODEL` /
  `LLM_BASE_URL` / `LLM_FALLBACK_PROVIDERS`.

Keys come from env only (`GROQ_API_KEY`, `OPENROUTER_API_KEY`,
`TOP_TOOLS_API_KEY`, `XAI_API_KEY`, `COARENA_API_KEY`). Never in code.
