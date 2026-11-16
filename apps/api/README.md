# @weblead/api

Express API (Phase 0 skeleton, port 4000, no DB yet).

- `GET /health` — liveness.
- `GET /api/businesses` — the 10 pilot leads (read-only CSV seed).
- `GET /api/businesses/:id` — one lead.
- `GET /api/pipeline` — the 18 states + allowed transitions.
- `GET /api/costs/summary` — the 8 cost indicators (§8): total, per agent,
  per business, per website, per opportunity, per provider, free quotas,
  alerts. Estimated vs confirmed always separate; Phase 0 data is the Fase A
  measurement only.
- `POST /api/businesses/:id/state` — state change validated by the shared
  state machine; illegal jumps return 400.

Persistence (Prisma/Postgres) lands in Phase 1.
