# @weblead/agent-auditor

Auditor Agent (Fase D). Independent from the Designer: separate code,
separate criteria, reads the generated content as data.

- Content audit (pure, always runs): demo facts vs dossier (name, address,
  phone, email, services), forbidden claims, demo notice, demo-only form,
  visual coherence, SEO/links. Scores business/visual/technical/content
  0-100; PASSED needs no CRITICAL finding and every score >= 60.
- Playwright audit (`src/playwright-runner.ts`): live Chromium (cached
  binary, no download) — console/HTTP errors, broken images, bad links,
  mobile overflow, load time, desktop + mobile screenshots.
  When Chromium is unavailable it throws `PlaywrightUnavailableError` and
  the audit is recorded as `playwright-unavailable` — never as passed.
- Rule: AUDIT_FAILED -> DESIGNING (fix and re-audit); only
  AUDITING -> APPROVED opens the commercial step.

```sh
curl -X POST http://localhost:4000/api/audit/run \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"<slug>","demoUrl":"http://localhost:5174/demos/<slug>"}'
```
