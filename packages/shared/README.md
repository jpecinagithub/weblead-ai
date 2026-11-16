# @weblead/shared

Shared types, the Orchestrator state machine and the read-only pilot seed.

- `state-machine.ts` — the 18 orchestrator states, the allowed-transition
  table, `canTransition` / `assertTransition` / `IllegalTransitionError`.
  Backend validation goes through here; no state jump may bypass it.
- `seed.ts` — the 10 pilot leads (Logroño, score ≥ 70) generated from
  `docs/feasibility-data.csv`. Read-only; no invented businesses.
- CRM pipeline states, Researcher activity statuses and Sales reply types
  live here too (master prompt §1, §4, §5).
