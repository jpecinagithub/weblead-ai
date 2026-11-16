# @weblead/dashboard

Vite + React + TS dashboard (Phase 0 skeleton).

Shows the 18-state pipeline and the 10 pilot leads (Logroño, score ≥ 70)
fetched from the API (`GET /api/businesses`). Dev proxy forwards `/api`
to `http://localhost:4000` — run the API first.

```sh
pnpm --filter @weblead/api dev   # terminal 1
pnpm --filter @weblead/dashboard dev  # terminal 2 → http://localhost:5173
```
