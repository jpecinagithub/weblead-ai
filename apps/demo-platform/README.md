# @weblead/demo-platform

Vite + React + TS static multi-business demo platform (Fase D).

- Route: `/demos/{slug}` — real generated demos from
  `src/data/generated-demos.ts` (written by `pnpm --filter @weblead/api
  export:demos` from the Postgres `WebsiteProject` rows; do not edit by
  hand). Dashboard at `/` lists every demo with its business state and
  latest audit result.
- Every page shows the visible conceptual notice: "Propuesta conceptual
  independiente, no oficial y pendiente de autorización de la empresa."
- Contact form: local validation only, demo-only, sends nothing anywhere.
- SEO per demo (title + meta description), `public/robots.txt` and
  `public/sitemap.xml` (regenerated with the demos).

```sh
pnpm --filter @weblead/demo-platform dev  # → http://localhost:5174
```
