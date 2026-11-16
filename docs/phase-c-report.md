# WebLead AI — Fase C: Investigación (Research Agent) — informe §12 (2026-11-16)

Alcance: solo el Research Agent y la evaluación de fuentes de búsqueda.
Nada de Designer/Auditor/Sales/CRM, nada de despliegue, nada de emails,
nada de pago. Puerta: Fase A (GO con alcance recortado, piloto Logroño,
26 empresas, 10 leads ≥ 70).

## 1. Funcionalidades implementadas

- **Research Agent determinista** (`packages/agent-researcher`): el LLM
  nunca decide un hecho — solo escribe resúmenes. El expediente, la
  actividad, el score y la decisión son código puro y testeable:
  - **Scoring 0-100** con los pesos del prompt maestro (sin web 25,
    actividad 25, necesidad 20, contacto 15, potencial 15) y los
    subcriterios explícitos de `feasibility.md` §3; **umbral 70**.
  - **Actividad** CONFIRMED / PROBABLE / UNVERIFIED / INACTIVE. Señal
    fechada ≤ 12 meses o agenda de reservas en vivo → CONFIRMED; ficha
    activa sin fecha → PROBABLE; solo mención → UNVERIFIED. **Ausencia
    de información ≠ inactividad**: INACTIVE exige evidencia explícita
    de cierre. `classifyActivity` no marca INACTIVE por falta de datos.
  - **Expediente estructurado** con todos los campos del prompt maestro
    (nombre, razón social, sector/subsector, dirección, municipio,
    provincia, CP, teléfono, email, fuente por dato, URL de referencia,
    fecha de consulta, evidencias de actividad, estado de la web, redes,
    servicios, público objetivo, oportunidad, puntuación, confianza,
    motivo de calificación/descarte). **Desconocido = `null`, nunca
    inventado.** Verificación con al menos 2 fuentes independientes
    cuando sea posible (`sourcesVerified`, `twoSourcesVerified`);
    una sola fuente limita la confianza.
  - **Decisión**: QUALIFIED si score ≥ 70 Y actividad CONFIRMED/PROBABLE;
    si no, REJECTED con motivo explícito (score, actividad, falta de
    fuentes). Flujo de estados validado paso a paso por la máquina
    compartida: DISCOVERED → RESEARCHING → RESEARCHED → QUALIFIED/REJECTED.
  - **Anti-SSRF** (`validateExternalUrl`): solo http(s), sin IPs
    privadas/localhost/link-local (169.254.x) ni metadatos de nube.
    Una URL inválida se descarta, nunca se almacena.
  - **Adaptador del piloto** (`pilotLeadToEvidence`): convierte las 10
    leads del seed en evidencia estructurada, parseando nº de reseñas y
    plantilla del texto de señal registrado en Fase A (sin datos nuevos).
    Regla aclarada por la verificación: presencia "social-only" (20
    puntos) solo ante presencia alternativa *funcional* (Instagram +
    reservas en vivo, Lumberjack); una página de Facebook sin más
    (Chuchi) sigue siendo "sin web" (25).
- **Persistencia real en Postgres** (`saveDossier`): la API deja de ser
  solo en memoria para los negocios investigados. Cada expediente crea
  Business + BusinessSource + BusinessEvidence + ResearchReport (con
  `scoreBreakdown`, `confidence`, `sourcesVerified`, `rejectionReason`,
  `llmSummary`) + OpportunityScore + AgentExecution. Re-investigar
  reemplaza fuentes/evidencia y añade informe + score nuevos (histórico).
  Uso LLM en UsageRecord con estimado y confirmado **separados**
  (confirmado null: Top Tools AI no devuelve precio).
- **Migración Prisma** `20261116192830_fase_c_researcher`: nuevos campos
  en Business (legalName, subsector, municipio, provincia, CP,
  websiteStatus, socialProfiles, services, targetAudience, opportunity,
  confidence, rejectionReason, consultedAt, pilotId), ResearchReport y
  UsageRecord (service, agentKind, estimated/confirmedCostCents).
  Es la primera migración del repo: Fase 0 usaba `db push` sin
  historial, así que esta migración es la baseline de las 31 entidades.
- **API** (`apps/api`):
  - `POST /api/research/run` — investiga 1–10 empresas por llamada
    (tope 10; 11 → 400). Acepta `{ name, sector, city?, evidence? }`;
    un lead del piloto por nombre usa el seed de Fase A; sin evidencia
    y sin coincidencia, el expediente es UNVERIFIED con nulls y acaba
    REJECTED por evidencia insuficiente (score 10 en la prueba).
  - `GET /api/businesses/:id/report` — expediente completo desde
    Postgres (negocio + fuentes + evidencia por dato + último informe +
    último score). Acepta uuid de BD o id numérico del piloto.
  - `GET /api/businesses` y `GET /api/businesses/:id` — ahora leen de
    Postgres (seed solo como fallback si la BD está vacía);
    `POST /api/businesses/:id/state` persiste el cambio en Postgres
    cuando el negocio existe allí.
  - `GET /api/costs/summary` — ahora 11 llamadas registradas (8 de
    Fases A+B + 3 de Fase C).
- **Siembra del piloto** (`pnpm --filter @weblead/api seed:research`):
  las 10 leads pasan por el pipeline real y quedan QUALIFIED con
  informe + score persistidos. Idempotente (upsert por slug).
- **Matriz de fuentes** (`docs/search-providers.md`): Google Places API,
  OSM/Overpass, búsqueda web, BORME, APIEmpresas y Apify, con discovery
  vs verificación, coste por 1.000 empresas, límites, ToS y veredicto.
  **Veredicto: sin fuente de discovery masivo conforme disponible.**
  Apify Maps Scraper queda **descartado para discovery masivo por base
  legal, no por precio** (4 USD/1.000 en Free): las condiciones de
  Google (§3.2.3 "No Scraping"/"No Caching") prohíben extraer contenido
  de Maps para construir una base de leads persistente, y un actor de
  Apify no cambia las condiciones de Google. Places API sufre la misma
  restricción (solo Place IDs indefinidamente, lat/lng 30 días): sirve
  solo para verificación puntual en vivo. Discovery operativo: búsqueda
  web + directorios. Apify Search Scraper y Content Crawler quedan como
  candidatos para una prueba pequeña posterior, con aprobación.
- **Arreglo previo**: `pnpm typecheck` global en verde. Causa: a
  `@weblead/database` le faltaba `@types/node` (`process` en
  `src/index.ts`). Fix: `@types/node@^22.0.0` como devDependency del
  paquete (lockfile actualizado). Hallazgo añadido: el paquete database
  nunca se compilaba (su `build` era solo `prisma generate`, sin
  `dist/`); `build` ahora es `prisma generate && tsc -p tsconfig.json`.
  El `pnpm add` inicial falló con EPERM chown (quirk del contenedor,
  ver `architecture.md` §4); se resolvió editando `package.json` a mano
  y corriendo `pnpm install`.

## 2. Archivos creados o modificados

| Archivo | Cambio |
|---|---|
| `docs/search-providers.md` | Nuevo. Matriz de 8 fuentes con veredictos y re-tests. |
| `docs/phase-c-report.md` | Nuevo. Este informe. |
| `packages/agent-researcher/src/scoring.ts` | Nuevo. Scoring 0-100 + umbral 70. |
| `packages/agent-researcher/src/activity.ts` | Nuevo. Clasificación CONFIRMED/PROBABLE/UNVERIFIED/INACTIVE. |
| `packages/agent-researcher/src/dossier.ts` | Nuevo. Tipos de expediente, fuentes independientes, anti-SSRF. |
| `packages/agent-researcher/src/researcher.ts` | Nuevo. Pipeline, decisión, adaptador del piloto. |
| `packages/agent-researcher/src/persistence.ts` | Nuevo. `saveDossier`, `recordLlmUsage`. |
| `packages/agent-researcher/src/index.ts` | Reescrito: agente real (run por id de piloto) + exports. |
| `packages/agent-researcher/test/researcher.test.ts` | Nuevo. 26 tests. |
| `packages/agent-researcher/package.json` | + dep `@weblead/database`. |
| `packages/database/package.json` | + `@types/node` devDep; `build` ahora compila `dist/`. |
| `packages/database/prisma/schema.prisma` | Nuevos campos Business / ResearchReport / UsageRecord. |
| `packages/database/prisma/migrations/20261116192830_fase_c_researcher/` | Nueva. Primera migración (baseline). |
| `apps/api/src/index.ts` | Reescrito: Postgres, `/research/run`, `/report`, costes Fase C. |
| `apps/api/src/seed-research.ts` | Nuevo. Siembra de las 10 leads por el pipeline real. |
| `apps/api/src/apply-llm-summaries.ts` | Nuevo. Aplica resúmenes LLM + UsageRecord. |
| `apps/api/package.json` | + deps `dotenv`, `@weblead/agent-researcher`, `@weblead/database`; scripts `seed:research`, `apply:llm-summaries`. |
| `fase-c/verify-dossiers-tta.py` | Nuevo. 3 resúmenes LLM reales (patrón Fase A/B). |
| `fase-c/llm-summaries-tta.json` | Nuevo. Respuestas reales con usage. |
| `docs/architecture.md` | §8/§11: puntero a la matriz Fase C y estado de la fase. |
| `packages/agent-researcher/README.md` | Actualizado (ya no es esqueleto). |
| `pnpm-lock.yaml` | `@types/node`, `dotenv`, nuevas deps workspace. |

## 3. Pruebas realizadas (comando + resultado exacto)

- `pnpm typecheck` (global): **verde, exit 0** (17 proyectos; antes
  fallaba solo en `@weblead/database` por `Cannot find name 'process'`).
- `pnpm build` (global): **verde, exit 0** (todos los paquetes + apps).
- `pnpm test`: **58 passed (4 ficheros), 0 failed** — shared 7,
  ai-engine 13, **agent-researcher 26 nuevos**, cost-control 12.
  Tests nuevos: scoring (casos límite 70/69, web obsoleta, social-only,
  contacto 15/10/5/0, potencial, INACTIVE=0, `unknown`=0), clasificación
  de actividad (fechada ≤12m, >12m, live-booking, solo mención,
  INACTIVE solo con cierre), pipeline (QUALIFIED/REJECTED, motivos,
  nulls, gate de actividad con score 80 UNVERIFIED), reproducción de los
  10 scores del piloto, transiciones válidas/inválidas, fuentes
  independientes, anti-SSRF (localhost, 10/8, 192.168, 172.16/12,
  169.254, metadata, ftp).
- **API en vivo** (http://localhost:4000, Postgres real):
  - `GET /health` → `{"status":"ok","phase":"C-research"}`.
  - `GET /api/businesses` → 11 negocios (10 QUALIFIED + 1 REJECTED).
  - `GET /api/businesses/6/report` → expediente completo de Santiago
    Ferrer (score 100, CONFIRMED, 2 fuentes, evidencia por dato).
  - `GET /api/businesses/1/report` → Godoy REJECTED, score 45, con
    `llmSummary` aplicado.
  - `GET /api/costs/summary` → 11 llamadas, 1.091 prompt + 1.401
    completion = 2.492 tokens, estimado 0, confirmado null.
  - Tope: 11 empresas en una llamada → HTTP 400.
  - Transición ilegal QUALIFIED → APPROVED → HTTP 400.
  - Empresa sin evidencia → score 10, REJECTED ("sin fuentes; score
    10/100 por debajo del umbral 70; actividad no verificada").
    (Esa empresa de prueba se eliminó después de la BD; no queda
    ninguna empresa inventada.)
- **Siembra**: `pnpm --filter @weblead/api seed:research` → 10/10
  QUALIFIED con scores idénticos al piloto (85, 100, 75, 90, 90, 90,
  75, 85, 90, 75).
- **Migración**: `prisma migrate deploy` → "All migrations have been
  successfully applied."
- **Re-tests de fuentes** (2026-11-16, esta VM): Overpass
  `overpass-api.de` → HTTP 406 en 0,95 s; mirror `overpass.kumi.systems`
  → timeout 45 s, 0 bytes (igual que Fase A). Apify: `apify.com/pricing`
  no accesible desde esta VM (bloqueo por política del entorno, no de
  Apify); precios re-confirmados en 6 fuentes secundarias coincidentes
  (sep–nov 2026), no en la página del propio proveedor.

## 4. Resultados: verificación con empresas reales del piloto

| Empresa | Score piloto | Score recomputado | Actividad | Estado | Discrepancia |
|---|---|---|---|---|---|
| Santiago Ferrer Fontanería en General SL (id 6) | 100 | **100** | CONFIRMED | QUALIFIED | Ninguna |
| Hidrorioja SC (id 8) | 90 | **90** | CONFIRMED | QUALIFIED | Ninguna |
| Fontanería Godoy (CSV id 1) | 45 | **45** | PROBABLE | REJECTED ("score 45/100 por debajo del umbral 70") | Ninguna en el total; por subcriterio: necesidad 5 vs 0 y potencial 10 vs 15 se cancelan |

- **Los 10 leads del piloto se reproducen exactamente** (10/10) con el
  scoring implementado literalmente desde `feasibility.md` §3, tras
  aclarar dos reglas que el texto dejaba ambiguas: (a) "social-only"
  (20 puntos) solo con presencia alternativa funcional (reservas en
  vivo), no con una simple página de Facebook; (b) "pequeño con
  reseñas" (10 puntos) = ≥ 10 reseñas o reseñas fechadas sin conteo
  registrado; 1–9 reseñas = 5.
- **Discrepancia restante (fuera de los 10)**: Rioclima, CSV 60 vs 55
  recomputado: el piloto le dio potencial 10 sin evidencia de reseñas
  registrada. Se anota, no se maquilla la función para igualarla.
- **Conflicto de datos conocido sin resolver**: Santiago Ferrer tiene
  dos direcciones en fuentes distintas (Gonzalo de Berceo 8, 3-D vs.
  Av. Pérez Galdós 63, ver `feasibility.md` §4). El expediente guarda
  una; el seguimiento de conflictos multi-fuente queda pendiente.
- **LLM**: 3 resúmenes con Top-Tools-Ai-Basic, todos HTTP 200
  (latencias 5,84 / 7,44 / 5,28 s), fieles a los datos dados — sin
  inventar servicios, precios ni testimonios. Matiz: el resumen de
  Ferrer atribuye el 100/100 a "la ficha de eInforma"; el score es
  nuestro, no de eInforma. El resumen determinista del expediente es
  el autoritativo; el LLM solo redacta presentación.
- **BD final** (contado con SQL): 11 Business (10 QUALIFIED + 1
  REJECTED), 13 ResearchReport / OpportunityScore / AgentExecution
  (10 de siembra + 2 re-verificaciones + 1 Godoy), 77 BusinessEvidence,
  16 BusinessSource, 3 UsageRecord.

## 5. Servicios externos utilizados

- **Top Tools AI** (`Top-Tools-Ai-Basic`, único proveedor operativo):
  3 llamadas chat reales, 738 tokens (251 + 242 + 245). Coste
  estimado 0,00 USD; confirmado null (la API no devuelve precio).
- **PostgreSQL 16 local** (`weblead_dev`): persistencia real.
- **Búsqueda web** (solo lectura, para la matriz): condiciones de
  Google Maps Platform y precios de Apify/APIEmpresas. Sin claves
  creadas, sin llamadas a Places/APIEmpresas/Apify.
- **Apify: 0 USD consumidos**, sin cuenta creada, sin llamadas.
  **Google Places API: sin clave, sin llamadas.**

## 6. Costes reales / estimados (separados)

| Concepto | Real | Estimado |
|---|---|---|
| LLM Fase C (3 resúmenes, Top-Tools-Ai-Basic, 738 tokens) | — (proveedor sin precio) | 0,00 USD |
| LLM acumulado proyecto (11 llamadas, 2.492 tokens) | — | 0,00 USD; confirmado null |
| Apify | 0,00 USD (nada consumido) | — |
| Google Places / APIEmpresas | 0,00 USD (sin claves) | — |
| Infraestructura | 0 € (Postgres local existente) | — |

Límite efectivo de gasto sigue en **0 €**; solo corre el tier gratuito
verificado (Top-Tools-Ai-Basic).

## 7. Limitaciones detectadas

1. **Incidente de entorno (VM reiniciada a mitad de fase)**: al
   rearrancar, `pnpm` había desaparecido del PATH y el clúster de
   Postgres estaba vacío (sin rol `weblead` ni BD `weblead_dev`).
   Se recrearon desde `.env` (rol + BD, script temporal en /tmp, ya
   eliminado el uso), se reinstaló pnpm 10.34.9 y se re-aplicó la
   migración + siembra. **Lección para el coordinador**: el estado de
   Postgres local no sobrevive a reinicios de esta VM; en un despliegue
   real (Oracle) haría falta el backup diario con restauración probada
   que ya prevé `architecture.md` §10.
2. `prisma migrate dev` exigió `CREATEDB` para la shadow DB (concedido
   al rol `weblead`) y un `migrate reset --force` previo porque la BD
   venía de `db push` sin historial. La BD estaba vacía (0 filas en
   todas las tablas), así que el reset no perdió datos.
3. **Bug encontrado y corregido en esta fase**: `apply-llm-summaries`
   leía `promptTokens` camelCase de un JSON con `prompt_tokens`
   snake_case y creó 3 UsageRecord a 0 tokens. Se borraron, se corrigió
   el mapeo y se re-aplicaron con los valores reales (122/129, 120/122,
   128/117).
4. Overpass sigue inaccesible desde esta VM (406 + timeout): sin fuente
   OSM operativa aquí.
5. `apify.com` no accesible desde esta VM: precios de Apify y
   condiciones de Places son de fuentes secundarias (coincidentes entre
   sí), no verificados en la página del propio proveedor.
6. El expediente guarda una sola dirección por empresa: los conflictos
   entre fuentes (Ferrer, 2 direcciones) no quedan modelados.
7. Sin búsqueda web en vivo dentro del Researcher: la evidencia llega
   estructurada (seed del piloto o cuerpo de la llamada). La búsqueda
   web automatizada queda para una fase posterior (candidato: Apify
   Search Scraper, con aprobación).
8. La API `tsx watch` de verificación se detuvo al final de la fase;
   no queda ningún servidor corriendo en esta VM.

## 8. Tareas pendientes

- Pregunta abierta para Jon: **¿cuándo caduca el crédito Apify de
  5 USD?** (sin respuesta, no se planifica ninguna prueba con él).
- Decisión: crear clave de Google Places API solo para verificación
  puntual en vivo (sin almacenar más que Place IDs) — requiere cuenta
  Google Cloud con facturación; coste estimado < 1 USD para el piloto.
- Decisión: cuenta gratuita de APIEmpresas (100 consultas, sin
  tarjeta) para verificar SL del piloto.
- Decisión futura: prueba pequeña de Apify Search Scraper / Content
  Crawler (con el crédito existente, si no ha caducado).
- Modelar conflictos multi-fuente en el expediente (ej. 2 direcciones
  de Ferrer) en vez de guardar solo una.
- Reconectar xAI / Groq / OpenRouter / CoArena (Fase B: ninguno
  operativo) para tener fallback real; hoy todo descansa en
  Top-Tools-Ai-Basic.
- Investigación de las 7 leads restantes del piloto por el endpoint
  (ya están sembradas como QUALIFIED desde la siembra; re-investigar
  por `POST /api/research/run` añade informes nuevos).
- Fase D (Designer + Auditor) según el plan A–F.

## 9. Instrucciones para continuar

```bash
cd ~/workspace/weblead-ai
# Si la VM se ha reiniciado: reinstalar pnpm si falta (npm i -g pnpm@10.34.9),
# arrancar Postgres (sudo pg_ctlcluster 16 main start) y, si el clúster
# está vacío, recrear rol+BD desde .env y aplicar migraciones:
pnpm --filter @weblead/database exec prisma migrate deploy
# Siembra (idempotente) + API:
pnpm --filter @weblead/api seed:research
pnpm --filter @weblead/api dev   # http://localhost:4000
# Investigar una empresa:
curl -X POST http://localhost:4000/api/research/run \
  -H 'Content-Type: application/json' \
  -d '{"businesses":[{"name":"Santiago Ferrer Fontanería en General SL","sector":"fontanería/climatización"}]}'
# Expediente completo:
curl http://localhost:4000/api/businesses/6/report
# Tests / tipos / build:
pnpm test && pnpm typecheck && pnpm build
```
