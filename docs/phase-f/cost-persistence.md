# Fase F — Bloque 1: costes persistidos en PostgreSQL (UsageRecord)

Fecha: 2026-11-16. Estado: **terminado y verificado** (prueba de supervivencia
en verde, tests 167/167 en verde, typecheck de los 3 paquetes afectados en
verde; el typecheck global falla solo por un fichero ajeno a este bloque,
ver §6).

## 1. Qué se hizo

`UsageRecord` (Postgres, BD dev `weblead_dev`) es ahora la fuente de verdad
de costes. `InMemoryUsageStore` queda como espejo/fallback, no se borra.

| Archivo | Cambio |
|---|---|
| `packages/database/prisma/schema.prisma` | 3 columnas nuevas en `UsageRecord`: `requests` (Int, default 1), `imagesGenerated` (Int, default 0), `websiteProjectId` (String?, sin FK) |
| `packages/database/prisma/migrations/20261116202602_fase_f_cost_persistence/migration.sql` | Migración aplicada a `weblead_dev` (`prisma migrate dev`) |
| `packages/cost-control/src/persistent-store.ts` | **Nuevo.** `PrismaUsageStore`: `record()` (best-effort, nunca lanza), `summary()`, `getEntries()`, `seedHistorical()` (idempotente), `loadMirrorFromDb()`; mapeo fila↔`UsageEntry` (`usageRecordRowToEntry`) |
| `packages/cost-control/src/history.ts` | **Nuevo.** `HISTORICAL_MEASUREMENTS`: las 14 llamadas reales Fases A–E, verbatim de los JSON fuente (ver §3) |
| `packages/cost-control/src/index.ts` | Agregación extraída a `summarizeUsageEntries()` (función pura compartida por ambos stores: mismo shape, mismos totales); re-exports del store persistido. **Conservada** la línea Apify editada por el coordinador el 2026-11-16 21:27 (`no expiry`, `NO caduca, Jon 2026-11-16`, `known: true`) |
| `packages/cost-control/test/cost-persistence.test.ts` | **Nuevo.** 11 tests Vitest del store (fake, sin BD) |
| `apps/api/src/index.ts` | Siembra histórica al arrancar (idempotente, en BD); `GET /api/costs/summary` lee de BD con fallback a memoria; records en runtime cableados sin doble conteo (ver §2, punto 4) |
| `docs/phase-f/cost-persistence.md` | Este documento |

## 2. Decisiones de diseño

1. **El store no importa Prisma.** `PrismaUsageStore` habla con un
   delegado mínimo `{ create, findMany }` que la API adapta desde
   `prisma.usageRecord`. Así es unit-testeable con un fake, sin BD.
2. **`record()` es best-effort y nunca lanza.** Si la escritura en BD
   falla, se registra un `console.warn` y la entrada queda en el espejo
   en memoria. Registrar un coste no puede romper jamás la llamada LLM
   que lo originó.
3. **Todo record se espeja en memoria** (escriba o no en BD), así el
   summary de fallback está completo durante una caída de la BD.
   `summary()` lee de BD con la misma agregación pura que el store en
   memoria (`summarizeUsageEntries`); si la lectura falla, usa el espejo.
   Estimado y confirmado siempre separados; confirmado `null` mientras
   ningún proveedor confirme un cargo (nunca 0-como-hecho).
4. **Los records en runtime NO los escribe la API en BD** (decisión
   documentada como pide la tarea). Los agentes ya escriben su propia
   fila `UsageRecord` cuando reciben `llmUsage` (`designWebsite`,
   `prepareSales`, `recordLlmUsage`); si la API escribiese otra, la
   misma llamada se contaría dos veces. Por eso:
   - `POST /api/websites/generate`: `designWebsite` escribe la fila en
     BD; el handler solo la espeja en memoria (`usageStore.record`).
   - `POST /api/sales/prepare`: si el gate **bloquea**, `prepareSales`
     no escribe nada (pero la llamada LLM sí ocurrió) → el handler la
     registra con `recordUsage()` (BD + espejo). Si no bloquea,
     `prepareSales` ya escribió la fila → el handler solo espeja en
     memoria. En ambos casos la llamada queda exactamente una vez.
   - Se verificó que los tests de designer/sales afirman la escritura
     interna (`records LLM usage as a UsageRecord…`), por lo que quitar
     esas escrituras habría roto su contrato; no se tocaron esos paquetes.
5. **Filas históricas marcadas con el prefijo `historic:`** en `service`
   (p. ej. `historic:fase-a-measurement`), estimado 0 céntimos,
   confirmado `null`. Sin precios inventados.
6. **Idempotencia por identidad de medición**, no por id: una medición
   se salta si ya existe una fila con mismo proveedor + modelo +
   agentKind + tokens prompt/completion, bajo el servicio `historic:…`
   **o** bajo el nombre plano. El nombre plano cubre las filas que los
   scripts de fase ya escribieron antes de la Fase F (Fase D
   `fase-d-generation` ×2, Fase E `fase-e-sales-draft` ×1): re-sembrar
   no las duplica. La Fase A se siembra como 4 filas por llamada (el
   seed en memoria las agregaba en una sola entrada `requests: 4`).
7. **Arranque:** `initCostPersistence()` corre antes de `app.listen`
   (await): siembra en BD → carga el espejo desde BD. Si la BD no está
   disponible, siembra el espejo desde `HISTORICAL_MEASUREMENTS` (claves
   pilot-id) y sigue sirviendo desde memoria; un reinicio posterior
   siembra la BD. Nunca bloquea el arranque.
8. **`businessId` de las filas históricas** se resuelve a uuid real de
   `Business` (por pilotId o slug). Sin resolver → `null` (Godoy,
   piloto 1, nunca sembrado por ser REJECTED; ver §3).

## 3. Reconciliación: 13 llamadas / 3.149 tokens vs 14 / 3.375 — CERRADA

Los seeds en memoria sumaban 13 llamadas / 3.149 tokens
(Fase A 4/805 + B 4/949 + C 3/738 + D 2/657); `docs/validation-report.md`
§4 afirma 14 / 3.375. **La llamada que faltaba existe y está localizada:**

- **Fase E, borrador comercial** (`fase-e/llm-draft-tta.json`, generado por
  `fase-e/llm-draft-tta.py` con Top-Tools-Ai-Basic): 1 llamada,
  **127 prompt + 99 completion = 226 tokens**, agente `sales`, empresa
  sintética de verificación `verificacion-fase-e-empresa-de-prueba`,
  estimado 0,00 USD, confirmado `null`. 3.149 + 226 = **3.375**;
  13 + 1 = **14**. ✓
- Nunca se sembró en memoria (la API no tenía `usageStore.record` para
  Fase E), pero el total de validación sí la contó. Corroboración
  independiente: esa llamada **ya estaba persistida** en `UsageRecord`
  (servicio `fase-e-sales-draft`, escrita por `prepareSales` el
  2026-11-16 20:14:31). La discrepancia queda **cerrada, no abierta**.
- Detalle: esa fila tiene `businessId` NULL porque el seed de la
  fixture (`seed-verification-e.ts`) borra y recrea la empresa, y la FK
  `UsageRecord.businessId` es `ON DELETE SET NULL`. La medición
  (127+99) está intacta; solo perdió el enlace a la empresa. No se ha
  reescrito la fila (ver §7, pendiente).

### Siembra histórica (14 filas)

| Fase | Llamadas | Tokens | Servicios sembrados |
|---|---|---|---|
| A (`fase-a/cost-measure-tta.json`) | 4 | 805 | `historic:fase-a-measurement` ×4 (La Moderna 157, Ferrer 228, Lumberjack 220, Star Barber 200) |
| B (`fase-b/measurements-tta.json`) | 4 | 949 | `historic:fase-b-measurement` ×4 (researcher 230, designer 295, auditor 241, sales 183; piloto 4) |
| C (`fase-c/llm-summaries-tta.json`) | 3 | 738 | `historic:fase-c-llm-summary` ×3 (Ferrer 251, Hidrorioja 242, Godoy 245, este último con `businessId` null) |
| D (`fase-d/llm-design-drafts.json`) | 2 | 657 | Ya existían como `fase-d-generation` (Ferrer 316, Begoña 341) → **saltadas como duplicadas**, 0 insertadas |
| E (`fase-e/llm-draft-tta.json`) | 1 | 226 | Ya existía como `fase-e-sales-draft` → **saltada como duplicada**, 0 insertada |
| **Total** | **14** | **3.375** | **11 insertadas, 3 saltadas** |

Estado de la BD tras la siembra (2026-11-16 ~20:30):

```
service                         rows  tokens
fase-d-generation                  8    2389   (2 de validación + 6 nuevas del bloque de demos, ver nota)
fase-e-sales-draft                 1     226
historic:fase-a-measurement        4     805
historic:fase-b-measurement        4     949
historic:fase-c-llm-summary        3     738
Total: 20 filas / 5.107 tokens
```

Nota: las 6 filas `fase-d-generation` extra (20:26:01–02, 1.732 tokens,
La Moderna/Chuchi/Expert/Lumberjack/Star Barber/Nuria) las escribió el
bloque de demos de la Fase F, que trabajaba en paralelo generando las 6
demos restantes. Son consumo real, no duplicados (tokens y
`executionId` distintos en cada una); el summary las incluye y por eso
el total vivo es 20 llamadas / 5.107 tokens, no 14 / 3.375. El total
**histórico** sigue siendo 14 / 3.375.

## 4. Prueba de supervivencia — PASS

La API del puerto 4000 estaba ocupada por instancias `tsx watch` de
otros bloques, así que la prueba se hizo con una instancia propia en el
puerto **4001** (mismo código, misma BD), sin tocar la de :4000.

Arranque 1 (log exacto):

```
[costs] UsageRecord seeded: 0 inserted, 14 already present; mirror loaded with 20 rows.
weblead-api listening on http://localhost:4001 (phase E-commercial, Postgres-backed)
```

`GET http://localhost:4001/api/costs/summary` **antes** del reinicio
(`SUMMARY_EXIT=0`, guardado en `/tmp/summary-4001-before.json`):

- `byProvider[0]`: top-tools-ai, **20 requests, 3.043 prompt + 2.064
  completion = 5.107 tokens**, estimado 0, confirmado `null`
- `totalEstimatedCostCents: 0`, `totalConfirmedCostCents: null`
- `byAgent`: researcher 8, designer 9, sales 2, auditor 1

Se paró la instancia (puerto 4001 libre, verificado) y se arrancó de
nuevo. Arranque 2 (log exacto, otra vez 0 insertadas):

```
[costs] UsageRecord seeded: 0 inserted, 14 already present; mirror loaded with 20 rows.
weblead-api listening on http://localhost:4001 (phase E-commercial, Postgres-backed)
```

`GET /api/costs/summary` **después** del reinicio
(`/tmp/summary-4001-after.json`):

```
diff /tmp/summary-4001-before.json /tmp/summary-4001-after.json
SUMMARIES_IDENTICAL
/tmp/summary-4001-before.json -> requests: 20 tokens: 5107 est: 0 conf: None
/tmp/summary-4001-after.json  -> requests: 20 tokens: 5107 est: 0 conf: None
```

**Los dos summaries son byte a byte idénticos.** Los costes sobreviven
al reinicio. (La instancia 4001 se paró tras la prueba; puerto libre.)

Salida completa del summary (después del reinicio; idéntica a la de
antes):

```json
{"totalEstimatedCostCents":0,"totalConfirmedCostCents":null,"byAgent":{"researcher":{"estimatedCostCents":0,"confirmedCostCents":null,"requests":8},"designer":{"estimatedCostCents":0,"confirmedCostCents":null,"requests":9},"sales":{"estimatedCostCents":0,"confirmedCostCents":null,"requests":2},"auditor":{"estimatedCostCents":0,"confirmedCostCents":null,"requests":1}},"byBusiness":{"892c7d95-0b44-4a5b-a040-9f7a73a561eb":{"estimatedCostCents":0,"confirmedCostCents":null,"requests":6},"cf64a9b5-a6da-4d7b-9cc9-bca9fadbaa1a":{"estimatedCostCents":0,"confirmedCostCents":null,"requests":2},"d736d376-06a5-45e2-a6fb-bebca980acbb":{"estimatedCostCents":0,"confirmedCostCents":null,"requests":2},"80988f4e-1005-4f87-a2cb-617c119f5e2c":{"estimatedCostCents":0,"confirmedCostCents":null,"requests":3},"b5e58d75-3935-4a0a-97d0-1855b42af8ff":{"estimatedCostCents":0,"confirmedCostCents":null,"requests":1},"65cb5947-f1ce-4ae0-8661-43ee2a4d9fad":{"estimatedCostCents":0,"confirmedCostCents":null,"requests":1},"2bc9d1b0-d451-4957-b7ec-071035592d94":{"estimatedCostCents":0,"confirmedCostCents":null,"requests":1},"7e29dd4f-ddae-4765-b0a0-870ba9d82b80":{"estimatedCostCents":0,"confirmedCostCents":null,"requests":1},"c419b833-e9f1-48cc-b649-90be612f8728":{"estimatedCostCents":0,"confirmedCostCents":null,"requests":1}},"byWebsite":{},"byOpportunity":{"892c7d95-0b44-4a5b-a040-9f7a73a561eb":{"estimatedCostCents":0,"confirmedCostCents":null,"requests":1}},"byProvider":[{"provider":"top-tools-ai","requests":20,"promptTokens":3043,"completionTokens":2064,"estimatedCostCents":0,"confirmedCostCents":null}],"freeQuotas":[{"provider":"top-tools-ai","label":"Top Tools AI Basic — 10M tokens/day (free tier)","remaining":null,"known":false},{"provider":"coarena","label":"CoArena Model API — 5 USD/day (free tier)","remaining":null,"known":false},{"provider":"apify","label":"Apify — 5 USD credit available (no expiry)","remaining":"5 USD (NO caduca, Jon 2026-11-16)","known":true}],"alerts":[{"level":"blocked","message":"Effective spend limit is 0 EUR: paid LLM calls are blocked until Jon expressly approves a spend. Only verified free-tier calls are allowed."}],"budget":{"referenceMonthlyBudgetEurCents":3000,"effectiveSpendLimitEurCents":0}}
```

Dos cambios de forma respecto al summary en memoria anterior, ambos
esperados y documentados: (1) las claves de `byBusiness` son ahora
uuids de `Business` (antes cadenas de pilot-id `'4'`, `'6'…`; los
records en runtime ya usaban uuids); (2) `byWebsite` está vacío porque
`designWebsite` no persiste `websiteProjectId` en su fila
`UsageRecord` (la columna nueva existe para futuros writes; ver §7).

## 5. Tests

`npx vitest run packages/cost-control/test/cost-persistence.test.ts
packages/cost-control/test/cost-control.test.ts`:

```
Test Files  2 passed (2)
     Tests  23 passed (23)
```

11 tests nuevos: totales históricos 14/3.375 (guarda de la
reconciliación); siembra 14→0 en re-ejecución; salto de las 3 filas
preexistentes con servicio plano; resolución de uuids / null para
Godoy; `record()` escribe en BD + espeja; `record()` no lanza si la BD
falla (la entrada sobrevive en memoria); `summary()` desde BD con los
8 indicadores; fallback a memoria si la lectura falla; mapeo
fila→entrada (estimado/confirmado separados, fallback a `costCents`
legacy, `agentKind` desconocido descartado).

Suite completa (`pnpm test`): **12 ficheros, 167 tests, 167 passed,
0 failed** (144 previos + 23 de cost-control; el resto de bloques de la
Fase F también sumaron tests en paralelo).

## 6. Typecheck

- `pnpm --filter @weblead/cost-control typecheck`: exit 0.
- `pnpm --filter @weblead/database typecheck`: exit 0.
- `pnpm --filter @weblead/api typecheck`: exit 0.
- `pnpm typecheck` (global): **exit 2 — falla SOLO en
  `apps/demo-platform`**, fichero de otro bloque de la Fase F
  (`src/data/generated-demos.ts:634,7` y `644,7`: `error TS2353:
  Object literal may only specify known properties, and '"demo"' does
  not exist in type 'GeneratedWebsiteContent'`). No es de este bloque;
  no se tocó. Los 3 paquetes afectados por este bloque están en verde.

## 7. Limitaciones y pendientes

1. **Fila Fase E huérfana.** La fila `fase-e-sales-draft` tiene
   `businessId` NULL (ver §3). Un `UPDATE` puntual al uuid de la
   fixture (`verificacion-fase-e-empresa-de-prueba`) la devolvería al
   desglose por empresa; no se hizo por no reescribir filas existentes
   en este bloque.
2. **`byWebsite` vacío.** `designWebsite` no escribe
   `websiteProjectId` en su `UsageRecord`. La columna ya existe; falta
   que el Designer la rellene (o que el handler lo haga con un update
   tras el generate). Pendiente menor: el desglose por web hoy solo
   existe en el espejo en memoria.
3. **Investigación sin espejo en memoria.** `POST /api/research/run`
   no pasa `llmUsage` a `saveDossier`, así que el consumo de Research
   (vía `recordLlmUsage`) llega a la BD pero no al espejo; si la BD
   cae, el summary de fallback lo pierde. Preexistente; no es de este
   bloque, pero conviene unificar el recording en un solo punto.
4. **Dedup por identidad, no por id.** Dos llamadas reales con mismo
   proveedor/modelo/agente/tokens exactos y mismo servicio se
   confundirían en la siembra. Improbable (tokens idénticos + mismo
   servicio) y solo afecta al seed histórico, no a los records en
   runtime (que no deduplican).
5. **Sin backup de Postgres.** La persistencia sobrevive a reinicios
   de la API, no a un reemplazo de la VM (limitación conocida de la
   Fase E; hay un bloque de backup en la Fase F).
6. **Puerto 4000 inestable durante el trabajo.** Había dos procesos
   `tsx watch src/index.ts` simultáneos (20:25 y 20:28, de otros
   bloques) peleando por el puerto: el listener cambió de PID varias
   veces y hubo ventanas de `curl: (7) Failed to connect`. No se tocó
   ninguno; la prueba de supervivencia se hizo en el 4001 para no
   interferir. Conviene que un solo proceso sirva la API en dev.
7. **La BD dev es compartida con los demás bloques de la Fase F.**
   Los totales vivos (20 / 5.107) crecerán si otros bloques generan
   más consumo; el total histórico (14 / 3.375) no cambia.

## 8. Commit

Commit local (sin push, como pide la tarea):

```
Fase F — Bloque 1: costes persistidos en PostgreSQL (UsageRecord)
```
