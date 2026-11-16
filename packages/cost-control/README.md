# @weblead/cost-control

Cost-control module (instrucciones-equipo-agentes §8). Skeleton, Phase 0.

- `UsageEntry` — one consumption record: provider/service/model, requests,
  tokens, images, **estimated cost vs confirmed cost (always separate)**,
  business/agent/website attribution. Providers are `ServiceProvider`:
  the six LLM providers plus `apify`, `gmail`, `vercel`, `other` — Apify
  runs, if ever approved in Fase C, are recorded like any other provider.
  No Apify call is made in Phase 0.
- `InMemoryUsageStore` + `usageStore` — recording + `summary()` with the 8
  dashboard indicators (§8): total, per agent, per business, per website,
  per opportunity, per provider, free quotas, alerts. Prisma persistence
  (`UsageRecord`/`BudgetLimit`) lands in Fase B.
- `createSpendGate()` — enforces the **effective spend limit of 0 EUR**:
  paid LLM calls throw `SpendBlockedError` until Jon expressly approves a
  spend. Only verified-free calls pass: `Top-Tools-Ai-Basic` (measured
  0.00 USD in Fase A) and `mock`.
- Reference budget: 30 EUR/month additional (`REFERENCE_MONTHLY_BUDGET_EUR_CENTS`).
