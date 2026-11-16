# WebLead AI — Fase F (Optimización): informe final

Fecha: 2026-11-16. Coordinador de fase. Repo: https://github.com/jpecinagithub/weblead-ai.
Estado previo: Fases A–E cerradas y verificadas (main `e6b0547`, tests 144/144).
Estado final: **Fase F completa** — 6 bloques; verificación final en verde;
commits `5116a76` (Bloque 3), `71f88c2` (Bloque 1), `d2c32dd` (Bloque 4)
+ commit de cierre del coordinador (Bloques 2, 5, 6 y correcciones).

## Resumen ejecutivo

| Bloque | Resultado |
|---|---|
| 1. Costes persistidos | ✅ Postgres (UsageRecord), 20 requests / 5.107 tokens vivos; histórico 14 llamadas / 3.375 tokens; supervivencia verificada por reinicio |
| 2. Comparativa de proveedores | ✅ Medido por conteo de llamadas × precio de lista; sin llamadas en vivo a Serper/Exa (sin conector ni clave en esta VM) |
| 3. Backup Postgres | ✅ pg_dump + restore probado 32/32 tablas; cron propuesto, NO instalado |
| 4. Demos restantes | ✅ 10/10 leads ≥ 70 APPROVED (9 Playwright + 1 content-only); 6 nuevas PASSED 100/100/100/100 |
| 5. Rendimiento y limpieza | ✅ Dashboard roto en navegador real → corregido y verificado; 17 dependencias sin uso eliminadas; notas de escalabilidad |
| 6. Verificación final | ✅ `pnpm build` + `pnpm typecheck` + `pnpm test` (167/167) en verde; e2e con La Moderna en verde; push a GitHub |

## Bloque 1 — Costes reales persistidos (commit `71f88c2`)

- Migración `20261116202602_fase_f_cost_persistence`: 3 columnas nuevas en
  `UsageRecord` (`requests`, `imagesGenerated`, `websiteProjectId`).
- `packages/cost-control/src/persistent-store.ts` (`PrismaUsageStore`):
  escritura best-effort que nunca lanza (caída de BD → warn + espejo en
  memoria), `summary()` desde BD, `seedHistorical()` idempotente.
- `packages/cost-control/src/history.ts`: las 14 llamadas reales A–E.
- `apps/api/src/index.ts`: siembra histórica al arrancar (antes de
  `listen`, idempotente); `GET /api/costs/summary` lee de BD con fallback
  a memoria; cableado runtime sin doble conteo (los agentes ya escriben
  su propia fila; el handler solo espeja, salvo cuando el gate bloquea
  un sales-prepare).
- **Reconciliación 13/3.149 vs 14/3.375 — CERRADA:** la llamada que
  faltaba es el borrador comercial de Fase E (`fase-e/llm-draft-tta.json`):
  1 llamada, 127 + 99 = 226 tokens, agente `sales`, fixture sintética.
  3.149 + 226 = 3.375; 13 + 1 = 14. Nunca se sembró en memoria.
- **Prueba de supervivencia — PASS:** instancia en :4001 (el :4000 estaba
  ocupado), `diff` de los summaries antes/después del reinicio byte a
  byte idénticos: 20 requests, 3.043 prompt + 2.064 completion = 5.107
  tokens, estimado 0, confirmado `null`; researcher 8 / designer 9 /
  sales 2 / auditor 1. (El total vivo es 20/5.107 y no 14/3.375 porque el
  Bloque 4 generó 6 diseños nuevos — 1.732 tokens — en paralelo.)
- Verificado por el coordinador contra la BD (`weblead_dev`, 2026-11-16):
  `UsageRecord` 20 filas / 20 requests / 5.107 tokens; histórico
  `historic:%` 11 filas insertadas + 3 preexistentes = 14.
- Tests: `packages/cost-control/test/cost-persistence.test.ts`, 11 nuevos.
- Doc: `docs/phase-f/cost-persistence.md`.
- Limitaciones: fila Fase E huérfana (`businessId` NULL por `ON DELETE SET
  NULL` en el re-seed); `byWebsite` vacío (el Designer no persiste
  `websiteProjectId`); `POST /api/research/run` no pasa `llmUsage` al
  espejo en memoria; dedup del seed por identidad de medición.

## Bloque 2 — Comparar proveedores (medido, no estimado)

Doc: `docs/phase-f/provider-comparison.md` (coordinador).

- **Método:** conteo real de llamadas del flujo actual × precio unitario
  publicado. Run log Fase A: 29 búsquedas / 26 empresas (4 discovery +
  25 verificación) → muestra de 10 leads: **12 búsquedas = 1,2/empresa**.
- **Sin llamadas en vivo a Serper ni a Exa:** no existe conector ni clave
  en esta VM (verificado); las claves viven en Oracle y no se extrajeron.
  Precios de lista de fuentes secundarias coincidentes, leídos 2026-11-16.
- Coste por empresa (búsqueda + resumen LLM 201 tokens):
  Serper + Top Tools Basic **0,00 USD en efectivo** (1,2 créditos gratis;
  post-gratis $0,0012); Exa Lite + Top Tools **$0,0048**; Exa Auto
  **$0,0084**; Vercel AI Gateway gpt-4o-mini estimado **$0,00008**/resumen
  (tokens medidos × lista pública, sin llamada real).
- Saldos de Jon: Serper 2.382 créditos (cubre ~1.985 empresas a este
  ratio; después top-up mínimo $50); Exa 19,013 USD; Gateway 4,999 USD.
- **Recomendación por tarea:** Serper para discovery + verificación
  (1ª fuente); Exa Lite como 2ª fuente; Top Tools Basic para LLM
  (primario, medido 0,00 USD); Gateway gpt-4o-mini como fallback LLM
  (integración NO construida ni probada — pendiente).
- **Respuestas de Jon 2026-11-16 21:27 aplicadas:** Apify 5 USD **NO
  caduca** (evaluar sin prisa, gate legal intacto); **xAI SIN recarga —
  grok fuera definitivamente** hasta nuevo aviso, excluido de todo
  fallback (verificado: `createOperationalFallback` solo encadena
  operativos; notas actualizadas en `packages/ai-engine` y
  `packages/integrations`); **Groq pendiente de registro** (Jon tiene
  clave de inferencia; flujo seguro custom.groq enviado; el conector
  aún no existe en esta VM — cuando exista: connector doc + verificación
  con GET /v1/models + chat corta, y añadir su modelo gratuito medido a
  la comparativa); **no contactar con Ferrer, Begoña Ruiz ni Hidrorioja**
  hasta que Jon decida la base legal/canal (Sales sigue bloqueado por el
  gate LSSI).

## Bloque 3 — Backup Postgres (commit `5116a76`)

- `scripts/backup-postgres.sh` (pg_dump -Fc, retención 7 días,
  verificación con `pg_restore -l`, log, exit ≠ 0 si falla),
  `scripts/restore-postgres.sh` (destino por defecto scratch
  `weblead_restore_test`, auto-eliminada; sobreescribir `weblead_dev`
  exige `--force` + `ALLOW_OVERWRITE_WEBLEAD_DEV=1`),
  `scripts/count-rows.sh` (conteos para comparar con `diff`).
- **Prueba real 2026-11-16 ~20:24 UTC:** backup exit 0 en 0,25 s →
  `backups/weblead_dev-2026-11-16_202455.dump`, 76.200 bytes; restore
  exit 0 en 2,8 s; **`diff` sin diferencias — 32/32 tablas coinciden**
  (Business 12/12, WebsiteProject 6/6, Audit 6/6, AuditFinding 10/10,
  UsageRecord 3/3 en ese momento). `weblead_dev` intacta tras la prueba.
- **Cron propuesto, NO instalado:** sin crontab en esta VM (ni siquiera
  existe el binario `crontab`); línea propuesta diaria 03:30 en
  `docs/phase-f/backup-restore.md` §3, con instrucciones paso a paso
  para Jon (patrón `crontab -l | ... | crontab -`, lección del incidente
  LicitaClima 2026-11-14). Estado previo guardado en
  `docs/phase-f/crontab-before.txt`.
- Limitaciones: el backup vive en la misma VM (no protege contra
  reemplazo de la VM; pendiente copia externa rsync a Oracle);
  restore sobre `weblead_dev` no probado por diseño (runbook documentado).

## Bloque 4 — Demos restantes (commit `d2c32dd`)

- Conteo inicial desde BD: 4 APPROVED / 6 QUALIFIED (Ferrer, Begoña Ruiz,
  Expert, Hidrorioja APPROVED; resto QUALIFIED).
- Borradores LLM (`fase-f/design-drafts-tta.py`, Top Tools Basic): 6/6
  HTTP 200, **1.732 tokens**, 0,00 USD estimado; 0 rechazos; servicios =
  "pendientes de confirmar" en las 6; nada inventado.
- `apps/api/src/generate-designs-fase-f.ts`: 6/6 QUALIFIED → DESIGNING →
  PREVIEW_READY; `export:demos` → 12 demos + sitemap.
- **Resultado: 10/10 leads ≥ 70 APPROVED**, verificado por el coordinador
  contra la BD (2026-11-16): 9 PASSED con Playwright 100/100/100/100
  (La Moderna, Chuchi, Avalon, Lumberjack, Star Barber, Nuria + Ferrer,
  Begoña, Expert) y 1 PASSED content-only (Hidrorioja, sin re-auditar en
  APPROVED). Capturas desktop + móvil en `docs/phase-f/screenshots/`
  (12 PNG); aviso conceptual visible en las verificadas visualmente.
- Nuria: 2 FAILED antes del PASSED (misma causa: la señal de actividad
  incrustada verbatim disparaba el patrón prohibido del auditor).
  Corrección en código: `sanitizeActivitySignal()` en
  `packages/website-generator/src/index.ts` + 2 tests (15/15); el
  auditor no se debilitó. Lección registrada: tras tocar un paquete,
  rebuild + reiniciar la API (la API importa desde `dist/`).
- Doc: `docs/phase-f/demos.md`.
- Historial de auditorías en BD: 10 PASSED (9 playwright + 1 content-only),
  4 FAILED históricos (2 Ferrer de Fase D + 2 Nuria de Fase F, todos
  superados por un PASSED posterior).

## Bloque 5 — Rendimiento y limpieza (coordinador)

### Dashboard roto en navegador real → corregido

- **Hallazgo:** el dashboard renderizaba en blanco en Chromium real
  (solo se había verificado HTTP 200). Causa: `GET /api/businesses`
  serializa `scoreTotal: number | null` (Postgres) pero el dashboard
  leía `l.score.total` (forma PilotLead del seed). Con la BD sembrada
  (caso normal) `l.score` es undefined → `TypeError: Cannot read
  properties of undefined (reading 'total')` y React rompía. Con la BD
  vacía el fallback del seed sí devolvía PilotLead y no se veía.
- **Corrección:** `apps/dashboard/src/leads.ts` (`normalizeLead`,
  acepta `scoreTotal`, `score.total` y `score` numérico; `null` se
  muestra "—", nunca se inventa un 0) + `App.tsx` (usa `scoreTotal` y
  clave React estable `key` para ids uuid) + favicon (el 404 de
  `/favicon.ico` era el otro error de consola) + "Por empresa
  investigada" muestra nombres en vez de UUIDs (`businessNameForKey`).
- **Verificación:** Playwright local (Chromium 153): dashboard desktop
  1280×800 y móvil 390×844, **0 errores de consola, 0 peticiones
  fallidas**; 12 empresas · 10 con score ≥ 70; pipeline CRM y costes
  (8 indicadores) visibles. Demo Expert y demo La Moderna renderizan
  con aviso conceptual visible. Capturas en `docs/phase-f/screenshots/`
  (`dashboard-desktop.png`, `dashboard-mobile.png`,
  `demo-expert-desktop.png`, `e2e-la-moderna-desktop.png`).
- Tests: `apps/dashboard/src/leads.test.ts`, 10 tests (6 normalización +
  1 claves uuid + 3 mapeo de nombres).

### Dependencias innecesarias eliminadas (con evidencia)

- Auditoría por paquete: imports reales en `src/`, `test/` y configs
  vs `package.json`. **17 dependencias declaradas sin uso eliminadas**
  (de 18 iniciales; 1 restaurada — ver abajo):
  `@weblead/ai-engine` de agent-auditor, agent-crm, agent-designer,
  agent-researcher y agent-sales; `@weblead/shared` de ai-engine,
  website-generator, website-templates y demo-platform; `@weblead/shared`
  de agent-auditor **restaurada** (la usaba `test/auditor.test.ts` —
  el primer barrido solo miró `src/`); `@weblead/agent-core` de
  integrations, testing, website-generator y website-templates.
- **NO tocadas:** `typescript` (la usan los scripts `tsc`), `tsx`
  (script `dev`), `@vitejs/plugin-react`/`vite` (vite.config.ts),
  `@types/node` en database (el `process.env` de su `src/index.ts` lo
  necesita), `@weblead/shared` en cost-control (el Bloque 1 trabaja
  ese paquete; queda como pendiente de revisar).
- Verificación: typecheck limpio en los 10 paquetes editados;
  `pnpm test` final 167/167. `pnpm-lock.yaml` actualizado.

### Escalabilidad (10 → 100 empresas)

Doc: `docs/phase-f/scalability.md`. Orden de rotura: (1) demo-platform
(bundle único con todas las demos en `generated-demos.ts` — a 100 demos
el JS crece ~14×; arreglo: JSON estático por demo); (2) dashboard sin
paginación (a partir de ~100–200 filas); (3) discovery manual / sin cola
(operativo); (4) auditorías Playwright en serie (tiempo); (5) Postgres y
API sin cambios hasta miles de empresas. Costes a 100 empresas: Serper
120 créditos, Exa Lite $0,48, LLM 0,00 USD.

## Bloque 6 — Verificación final (coordinador)

- **Corrección del coordinador (preexistente, HEAD `e6b0547`):**
  `export:demos` exportaba las 2 fixtures de Fase E con contenido stub
  (`{ demo: true, fixture: true, businessName }`), sin templateId, y
  `generated-demos.ts` fallaba el typecheck (TS2353 `'demo'`, líneas
  634/644; verificado presente ya en `e6b0547`). La demo-platform
  habría roto al renderizarlas (`content.templateId` undefined).
  Fix en la fuente: `apps/api/src/export-demos.ts` excluye proyectos
  con `content.fixture === true` (son datos de prueba del flujo de
  ventas, no demos). Re-export: **10 demos reales, 0 fixtures**;
  sitemap actualizado. La seed de fixtures no se toca.
- **Verificación final (árbol final, 2026-11-16 ~20:41–20:45 CET):**
  - `pnpm typecheck` → **exit 0** (todos los paquetes, incluido
    demo-platform).
  - `pnpm build` → **exit 0** (dashboard 160 KB JS, demo-platform
    223 KB JS).
  - `pnpm test` → **12 ficheros, 167 tests, 167 passed, 0 failed**
    (144 Fase E + 2 generador + 11 persistencia de costes + 10 dashboard).
- **Flujo punta a punta con 1 empresa (La Moderna) contra los builds**
  (API `node dist/index.js` :4000, dashboard y demo-platform `vite
  preview`): API 12 negocios, La Moderna APPROVED score 85; costes
  persistidos 20 requests / top-tools-ai 5.107 tokens / confirmado null;
  demo `/demos/fontaneria-la-moderna-logrono` HTTP 200, aviso conceptual
  visible, nombre y teléfono verificado (941251317) visibles; dashboard
  "10 con score ≥ 70" y "Costes (8 indicadores)" visibles; **0 errores
  de consola**.

## Archivos (Fase F completa)

| Archivo | Bloque |
|---|---|
| `packages/database/prisma/schema.prisma` + migración `20261116202602_fase_f_cost_persistence` | 1 |
| `packages/cost-control/src/persistent-store.ts`, `src/history.ts`, `src/index.ts`, `test/cost-persistence.test.ts` | 1 |
| `docs/phase-f/cost-persistence.md` | 1 |
| `docs/phase-f/provider-comparison.md` | 2 |
| `scripts/backup-postgres.sh`, `scripts/restore-postgres.sh`, `scripts/count-rows.sh` | 3 |
| `docs/phase-f/backup-restore.md`, `docs/phase-f/crontab-before.txt` | 3 |
| `apps/api/src/generate-designs-fase-f.ts`, `fase-f/design-drafts-tta.py`, `fase-f/llm-design-drafts.json` | 4 |
| `packages/website-generator/src/index.ts` (`sanitizeActivitySignal`) + tests | 4 |
| `docs/phase-f/demos.md`, 12 capturas en `docs/phase-f/screenshots/` | 4 |
| `apps/dashboard/src/leads.ts`, `src/leads.test.ts`, `src/App.tsx`, `index.html`, `public/favicon.svg` | 5 |
| 11 `package.json` editados + `pnpm-lock.yaml` (17 deps eliminadas) | 5 |
| `docs/phase-f/scalability.md` | 5 |
| `apps/api/src/export-demos.ts` (exclusión de fixtures) | 6 |
| `docs/phase-f-report.md` (este informe) | 6 |

## Servicios externos y costes reales

| Servicio | Uso en Fase F | Coste |
|---|---|---|
| Top Tools AI Basic (único LLM usado) | 14 llamadas históricas + 6 borradores (1.732 tokens) + verificaciones | **0,00 USD medido; confirmado null** (el proveedor no devuelve precio) |
| Serper | 0 llamadas (sin conector/clave en esta VM) | 0 créditos gastados de 2.382 |
| Exa | 0 llamadas | 0 USD de 19,013 |
| Vercel AI Gateway | 0 llamadas | 0 USD de 4,999 |
| xAI / grok | 0 llamadas; saldo $0,00; SIN recarga por decisión de Jon | 0 USD |
| Apify | 0 llamadas; crédito 5 USD NO caduca | 0 USD |
| Groq | Sin conector (pendiente de registro por Jon) | — |
| Gmail / envíos | 0 emails enviados | — |
| Despliegues | Nada en Oracle ni Vercel | — |

**Totales medidos acumulados (BD, vivos): 20 requests, 5.107 tokens,
0,00 USD estimado, confirmado null.** Histórico A–E: 14 llamadas /
3.375 tokens.

## Limitaciones y pendientes

1. **Hidrorioja** sigue APPROVED con auditoría `content-only` (sin
   Playwright); el endpoint bloquea re-auditar en APPROVED.
2. **Groq pendiente de registro:** cuando Jon complete el flujo seguro
   custom.groq, crear el connector doc, verificar con GET /v1/models +
   chat corta, y añadir su modelo gratuito medido a la comparativa.
3. **Serper/Exa sin medición en vivo:** la comparativa es conteo real ×
   precio de lista; una medición en vivo exigiría la clave por el flujo
   seguro y 12 llamadas reales. Precios de lista de fuentes secundarias:
   re-confirmar antes de presupuestar.
4. **Backup sin copia externa** (misma VM) y **cron sin instalar**
   (falta el paquete `cron` en esta VM; línea propuesta en
   `docs/phase-f/backup-restore.md` §3).
5. **Base legal/canal para Ferrer, Begoña Ruiz e Hidrorioja:** pendiente
   de Jon; no contactar hasta que decida. Sales bloqueado por el gate LSSI.
6. **xAI/grok fuera definitivamente** hasta nuevo aviso (sin recarga).
7. **Apify:** crédito 5 USD no caduca; Google Maps Scraper descartado por
   base legal; evaluar Search/Content Crawler solo con aprobación.
8. **Costes:** `byWebsite` vacío; fila Fase E huérfana (`businessId`
   NULL); `POST /api/research/run` no alimenta el espejo en memoria;
   `@weblead/shared` en cost-control sin revisar (Bloque 1).
9. **Escalabilidad:** demo-platform con bundle único (techo ~100 demos
   sin refactorizar); dashboard sin paginación.
10. **Discrepancia xAI en NEXUS** (4,09/4,21 USD vs $0,00 en consola):
    trabajo del hilo NEXUS, no tocada aquí.
11. **Postgres local no sobrevive a reemplazos de VM** (backup cubre
    corrupción/borrado, no reemplazo); **el dashboard y la demo-platform
    no están desplegados** (Vercel pendiente de Jon) y **la API no está
    en Oracle** (prohibido sin autorización expresa).
