# @weblead/agent-researcher

Research Agent — Fase C (implemented 2026-11-16).

Deterministic core (the LLM never decides a fact, it only writes
summaries): activity classification (CONFIRMED / PROBABLE / UNVERIFIED /
INACTIVE), opportunity scoring 0-100 with threshold 70, structured
dossier with a source per datum (`null` when unknown), state path
DISCOVERED → RESEARCHING → RESEARCHED → QUALIFIED / REJECTED, Prisma
persistence (`saveDossier`).

- `src/scoring.ts` — weights from the master prompt §1 + sub-criteria
  from `docs/feasibility.md` §3.
- `src/activity.ts` — dated signal ≤ 12 months (or live booking) →
  CONFIRMED; absence of information is never INACTIVE.
- `src/dossier.ts` — dossier types, independent-source counting,
  anti-SSRF URL validation.
- `src/researcher.ts` — pipeline + pilot-seed adapter.
- `src/persistence.ts` — Business / BusinessSource / BusinessEvidence /
  ResearchReport / OpportunityScore / AgentExecution / UsageRecord.

Discovery: provisional web search + directories (see
`docs/search-providers.md`). Overpass re-tested in Fase C and still
unreachable from this VM (406 / timeout); Google Places API untested
(no key) and restricted by §3.2.3 for storing leads; Apify Maps Scraper
discarded for mass discovery on legal grounds (not price).
