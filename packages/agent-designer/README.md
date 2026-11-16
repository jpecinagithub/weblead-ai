# @weblead/agent-designer

Designer Agent (Fase D). Generates a business demo website from the
Researcher dossier — never from invented data.

- Entry states: QUALIFIED (first design), AUDIT_FAILED (re-design after a
  failed audit), PREVIEW_READY (rework). Flow, validated step by step:
  `QUALIFIED|AUDIT_FAILED|PREVIEW_READY -> DESIGNING -> PREVIEW_READY`.
- Content is built by `@weblead/website-generator` (deterministic; the LLM
  may only draft the hero subtitle and the "about" paragraph, each field
  validated against the dossier and the forbidden-claims list).
- Persists `WebsiteProject` (content JSON) + `WebsiteAsset` rows (logo SVG
  + stock photos, each with licence + source) and a `UsageRecord` per real
  LLM call (estimated/confirmed cost kept separate).
- Every demo carries the visible notice (see `DEMO_NOTICE`).

```sh
pnpm --filter @weblead/api generate:designs   # real generation run (2 pilot demos)
```
