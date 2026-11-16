# WebLead AI — Architecture (Fase 0)

Decisiones de arquitectura del esqueleto. Las decisiones con coste,
despliegue o envío quedan fuera de esta fase y requieren autorización aparte.

## 1. Despliegue: API Express lista para Oracle, front en Vercel

**Decisión:** la API es un servidor Express persistente (Node + TS, puerto
4000), pensado para el Oracle Linux existente — mismo patrón que NEXUS y
LicitaClima (nginx → 127.0.0.1:puerto, PostgreSQL local, systemd). El
dashboard y la demo-platform son apps Vite + React estáticas, pensadas para
Vercel vía GitHub.

**Por qué no 12 funciones Vercel:** el plan Hobby de Vercel admite como
máximo 12 Serverless Functions (cada `.ts` bajo `api/` cuenta). La API de
WebLead AI (businesses, campañas, tareas, ejecuciones, auditorías,
propuestas, emails, CRM…) superaría ese límite en cuanto crezca, y además
necesita procesos largos (Researcher, Auditor con Playwright) y estado
persistente que no encajan en funciones serverless. La alternativa de
consolidar en ≤12 funciones planas + rewrites (patrón documentado en
`~/AGENTS.md`) se descartó por el mismo motivo: el backend es un servicio
de larga duración, no un conjunto de endpoints sin estado.

**Estado en Fase 0:** nada desplegado (prohibido sin autorización aparte).
La API corre solo en local; dashboard y demo-platform, solo con `vite dev`.

## 2. Diagrama de paquetes

```
apps/dashboard ─────┐
apps/demo-platform ─┤
apps/api ───────────┤
                    ▼
        packages/agent-core ──► packages/shared (estados, tipos, seed)
        packages/agent-researcher / designer / auditor / sales / crm
                    │                     │
                    ▼                     ▼
        packages/ai-engine       packages/database (Prisma, Postgres)
          (multiprovider)                 │
                    │                     ▼
        packages/integrations   packages/cost-control (gastos, límites)
        packages/website-generator + website-templates
        packages/testing (mocks, fixtures)
```

- `shared` no depende de nadie: es la base (tipos, máquina de estados, seed).
- `agent-core` es el Orchestrator: registro de agentes + la única puerta de
  cambio de estado (`transitionBusiness` → `assertTransition`).
- Cada agente depende de `agent-core` + `ai-engine` + `shared`. Ningún
  agente habla directamente con la BD: lo hace vía `database` solo cuando su
  fase lo implemente.
- `ai-engine` no conoce agentes ni BD: solo traduce `LlmProvider.complete`.

## 3. Máquina de estados del Orchestrator (18 estados)

Fuente: prompt maestro §0. Tabla completa en
`packages/shared/src/state-machine.ts` (`BUSINESS_TRANSITIONS`); el test en
`packages/shared/test/state-machine.test.ts` demuestra el rechazo de saltos
ilegales (p. ej. `DISCOVERED → APPROVED`).

Decisiones de diseño (no estaban explícitas en el prompt):

- `RESEARCHED → RESEARCHING` permitido (re-investigar con nuevas fuentes).
- `PREVIEW_READY → DESIGNING` permitido (retrabajo de diseño antes de auditar).
- `AUDIT_FAILED → DESIGNING` (corregir y re-auditar) o `REJECTED`.
- `REJECTED` no es terminal, pero solo puede ir a `ARCHIVED`: re-cualificar
  un rechazo sería un nuevo descubrimiento, no una transición.
- `ARCHIVED` es terminal (sin salidas).
- `SALES_APPROVED → CONTACTED` es la única salida: sin aprobación de ventas
  no hay contacto.

La BD guarda el estado como `String`; la regla vive en TypeScript. Cualquier
cambio de estado en backend debe pasar por `assertTransition`.

## 4. Base de datos

- **PostgreSQL 16 local, BD `weblead_dev`** (usuario `weblead`, solo dev).
  El servicio estaba inactivo en esta VM y se arrancó con
  `pg_ctlcluster 16 main start` (sudo). **No hubo desviación a SQLite.**
- Provider Prisma: `postgresql`. Schema en
  `packages/database/prisma/schema.prisma` con las **31 entidades de §8**
  (User, Role, Campaign, CampaignSector, Business, BusinessSource,
  BusinessEvidence, ResearchReport, OpportunityScore, Agent, AgentExecution,
  AgentMessage, Task, TaskLog, WebsiteProject, WebsiteAsset,
  WebsiteDeployment, Audit, AuditFinding, CommercialProposal,
  ContactPermission, ContactSuppression, EmailDraft, EmailMessage,
  EmailThread, CRMActivity, PriceConfiguration, UsageRecord, BudgetLimit,
  Integration, SystemSetting).
- **Salvedad:** el prompt original llegó truncado al final de §8 ("UUID").
  Los campos de cada entidad se infirieron de los contratos de §§0–5; el
  detalle de campos es decisión de Fase 1, no una afirmación sobre el
  documento original.
- En Fase 0 la API **no usa la BD todavía** (estado en memoria + seed de solo
  lectura). La persistencia llega en Fase 1 (`pnpm db:push` ya aplica el
  schema; migraciones con `pnpm db:migrate`).
- **Desviación de entorno (2026-11-16):** `prisma generate` no pudo
  descargar sus engines en esta VM: el fetcher propio de Prisma recibe
  `ECONNRESET` a través del proxy de salida, mientras `curl` descarga los
  mismos ficheros sin problema. Workaround aplicado: `schema-engine` y
  `libquery_engine` (v6.19.3, `debian-openssl-3.0.x`) descargados con curl
  y colocados a mano en `node_modules/.pnpm/@prisma+engines@6.19.3/...` y
  en el dir del CLI `prisma`. `prisma generate` y `prisma db push` pasan
  desde entonces. Es un problema del entorno, no del schema: en una
  instalación limpia puede repetirse y habrá que repetir el workaround o
  descargar desde otra red. `node_modules` no va a git, así que el
  workaround no queda versionado.
- **Desviación de entorno (2026-11-16):** el contenedor no permite `chown`
  a uid/gid distintos de root (sin CAP_CHOWN); `pnpm install` fallaba con
  `EPERM chown .../pnpm-lock.yaml.*`. Fix: `chgrp root pnpm-lock.yaml
  node_modules/.pnpm/lock.yaml` y reintentar. Si reaparece, repetir el
  `chgrp` antes del install.

## 5. Dónde vive cada agente

| Agente | Paquete | Fase | Estado en Fase 0 |
|---|---|---|---|
| 0 Orchestrator | `agent-core` | 0 | Registro + puerta de transiciones |
| 1 Researcher | `agent-researcher` | 1 | Stub + interfaz de fuente de discovery |
| 2 Designer | `agent-designer` | 2 | Stub + texto del aviso conceptual |
| 3 Auditor | `agent-auditor` | 3 | Stub + tipo de puntuación |
| 4 Sales | `agent-sales` | 4 | Stub + modalidades BASIC/PRO/PREMIUM |
| 5 CRM | `agent-crm` | 5 | Stub |

## 6. LLM: capa común multiprovider, sin dependencia de un solo proveedor

Fuente: instrucciones-equipo-agentes §3 (2026-11-16 20:02), que complementa
el prompt maestro.

- Interfaz `LlmProvider` en `packages/ai-engine` (compatible OpenAI chat
  completions; los cinco proveedores reales la hablan).
- `PROVIDERS` — registro central con estado honesto por proveedor:
  - **top-tools-ai: OPERATIVO (por defecto).** Modelo `Top-Tools-Ai-Basic`,
    medido en Fase A: 4 expedientes, 805 tokens, 0,00 USD.
  - **groq: pendiente de credencial.** Primer candidato (§3), pero sin
    clave asumida: solo queda la clave "Audio to Text" en NEXUS. La
    comprobación real de claves es trabajo de la Fase B, no de la Fase 0.
  - **openrouter: sin claves.** Las 4 claves se eliminaron el 2026-11-14;
    queda un saldo de 1,09 USD sin clave utilizable. Fase B.
  - **xai: credencial inválida** (400 Incorrect API key, Fase A 2026-11-16).
    Configurado pero NO operativo hasta reconectar.
  - **coarena: clave revocada** (401 api_key_revoked). Configurado pero NO
    operativo hasta reconectar.
  - **mock:** determinista, para tests.
- **Selección por agente:** `DEFAULT_AGENT_MODELS` centraliza qué modelo usa
  cada agente (orquestador = razonamiento, researcher = económico, etc.).
  Los valores actuales son marcadores sobre Top Tools AI Basic: la Fase B
  debe verificar que cada modelo funciona para su cometido antes de
  fijarlo — ningún modelo se elige solo por ser gratuito.
- **Fallback:** `FallbackProvider` prueba los proveedores en orden
  (`LLM_FALLBACK_PROVIDERS`); un `SpendBlockedError` nunca se reintenta en
  el siguiente proveedor: un gasto bloqueado sigue bloqueado.
- **Control de tokens:** `LlmRequestOptions.maxTokens` por llamada; cada
  llamada lleva `agentKind` / `businessId` / `websiteProjectId` para el
  registro de consumo y los límites por agente / empresa / web.
- Claves solo por env (`GROQ_API_KEY`, `OPENROUTER_API_KEY`,
  `TOP_TOOLS_API_KEY`, `XAI_API_KEY`, `COARENA_API_KEY`). Nunca en código.
- **Hallazgo Top Tools AI:** el proveedor renombró sus modelos a
  `Top-Tools-Ai-Basic` / `Pro` / `Max`. Los nombres viejos (`Top-Tools-Ai`,
  `Kimi-K2.6`) devuelven 400 `model_not_found`. El `CONNECTOR.md` del
  proveedor sigue desactualizado — actualizarlo queda pendiente y fuera de
  esta fase. `Pro`/`Max` no se probaron (podrían ser de pago).

## 7. Control de costes (módulo `packages/cost-control`, §8)

- `UsageEntry`: proveedor / servicio / modelo / peticiones / tokens /
  imágenes generadas / **coste estimado vs coste confirmado (siempre
  separados)** / empresa / agente / web.
- `InMemoryUsageStore` + `usageStore`: registro y `summary()` con los 8
  indicadores del dashboard §8 (total, por agente, por empresa, por web,
  por oportunidad, por proveedor, cuotas gratuitas, alertas). La API expone
  `GET /api/costs/summary`. Persistencia Prisma (`UsageRecord` /
  `BudgetLimit`) en Fase B; en Fase 0 el store es en memoria y la API
  registra la medición real de Fase A (4 expedientes, 805 tokens, 0,00 USD
  estimados, confirmado = null: el proveedor no devuelve precio).
- **Presupuesto de referencia: 30 €/mes adicionales máx. Límite efectivo
  autorizado: 0 €** hasta aprobación expresa de Jon. `createSpendGate()`
  bloquea las llamadas LLM de pago (`SpendBlockedError`) mientras el
  límite efectivo sea 0; solo pasan las llamadas de nivel gratuito
  verificado (`Top-Tools-Ai-Basic`, medido 0,00 USD; `mock`). La lista de
  "gratuito verificado" es explícita, nunca una suposición.
- El dashboard muestra la sección de costes con los 8 indicadores y el
  panel "Configuración e integraciones" (§10) con Oracle, Vercel, Gmail,
  Groq, OpenRouter, proveedor de búsqueda, generador de imágenes y
  Playwright (estado, función, auth, límites, coste potencial, última
  comprobación; nunca claves completas en frontend).

## 8. Discovery provisional (Researcher, Fase C)

Fase A descartó el discovery masivo gratuito como hipótesis: no hay fuente
escalable, gratuita y legal lista para usar.

- Fuente provisional: búsqueda web + directorios, con fuente y fecha por dato.
- Overpass: inaccesible desde esta VM (406 / timeouts). Pendiente: probar
  desde otro entorno o autoalojar.
- Google Places API: sin probar; requiere clave, leer ToS (almacenamiento
  de leads, uso comercial) y presupuesto (1.000 llamadas gratis/mes).
- El esqueleto solo deja el hueco (interfaz `DiscoverySource`); no implementa
  ninguna búsqueda.

### Matriz comparativa de proveedores de búsqueda/datos (Fase C)

A evaluar en la Fase C antes de elegir fuente de discovery. Precios
verificados el 2026-11-16 en roundups de precios (Katteb, Mapsharvest,
oct 2026) y en la preparación de Fase A — **no verificados en la página
del propio proveedor**: re-confirmar en la página del actor/servicio
antes de presupuestar.

| Fuente | Qué aporta | Coste por 1.000 empresas | Límites | Estado |
|---|---|---|---|---|
| Búsqueda web (+ directorios) | Nombre, dirección, teléfono, web, reseñas, fechas | 0 € (tiempo humano/API de búsqueda según proveedor) | Lenta; ~1 búsqueda por empresa; no escala | Provisional, en uso en el piloto |
| Google Places API (New) | Text Search + campo `website` + teléfono; fecha de reseñas | 1.000 llamadas gratis/mes; después 35 USD/1.000 llamadas; ≤20 resultados/llamada (60 máx./consulta) | Requiere clave + leer ToS sobre almacenar leads y uso comercial | Sin probar |
| OSM / Overpass API | Negocios con tags `phone`, `website`, `opening_hours`, `contact:*`; licencia ODbL, sin clave | 0 € | Cobertura irregular en oficios/pueblos; tags desordenados; instancias públicas piden autoalojar a uso comercial | Inaccesible desde esta VM |
| BORME (BOE) | Verificar existencia/actividad de una empresa ya conocida | 0 € | No es directorio: no lista "sin web" por sector/provincia | Solo verificación |
| APIEmpresas.es | Lookup por CIF (datos registrales) | Free 100 consultas; Pro 19 €/mes (3.000); Business 49 €/mes (10.000) | No cubre autónomos; no es discovery | Solo verificación |
| **Apify (candidato, 2026-11-16)** | Actores de scraping bajo demanda (ver abajo) | **Google Maps Scraper: 4 USD/1.000 lugares en plan Free** (3 Starter, 2 Scale, 1,50 Business); detalles/contactos +2 USD/1.000; reseñas +0,50; filtros +1 USD/1.000 c.u. **Google Search Results Scraper: desde 1,80–4,50 USD/1.000 páginas** según plan. **Website Content Crawler: pago por uso, ~0,20 USD/1.000 págs. (HTTP) a 0,50–5 (headless)** | Plan Free: 5 USD de crédito mensual, sin tarjeta; al agotarse, las ejecuciones se bloquean hasta el ciclo siguiente; crédito no usado no se acumula; Google Maps devuelve ~120 listados máx. por consulta | **Pendiente de evaluar en Fase C. Sin llamadas hechas, sin cuenta creada, sin crédito consumido** |

**Apify — actores que servirían (si la evaluación lo aprueba):**
- `compass/crawler-google-places` (Google Maps Scraper, de Compass/Apify):
  nombre, dirección, teléfono, web, rating, nº de reseñas, horarios, GPS.
- `apify/google-search-scraper` (Google Search Results Scraper): páginas
  de resultados de búsqueda, para discovery por sector/provincia.
- `apify/website-content-crawler` (Website Content Crawler): extraer texto
  de webs y directorios públicos (ToS compatible, caso a caso).
- Actores de directorios sectoriales, solo si su ToS lo permite y caso a caso.

**Apify — crédito de Jon: 5 USD disponibles. Caducidad: DESCONOCIDA.**
Pregunta abierta para Jon: ¿cuándo caduca ese crédito? No se ha inventado
ninguna fecha. El crédito es saldo ya existente, no gasto nuevo, pero sigue
bajo la regla de límite efectivo cero (§7): no se consume sin que el piloto
diga que aporta algo que Places/OSM no den.

**⚠️ AVISO LEGAL — Apify no legaliza el scraping de Google Maps.**
Que exista un actor de Apify para Google Maps **no** convierte el scraping
masivo en conforme a las condiciones de Google. La evaluación de la Fase C
debe incluir ese riesgo (ToS de Google Maps Platform, condiciones del
actor, y base jurídica para almacenar y reutilizar comercialmente los
datos) y, **si Apify no resuelve la base legal, descartarlo para discovery
masivo aunque el crédito sea gratis**. Apify sí puede valer para extraer
datos de webs y directorios públicos con ToS compatible, caso a caso, con
fuente y fecha por dato como exige el Researcher.

## 9. Seed de datos: solo el piloto, solo lectura

`packages/shared/src/data/pilot-leads.json` se genera mecánicamente desde
`docs/feasibility-data.csv` (`scripts/generate-pilot-seed.mjs`): los 10
leads de Logroño con score ≥ 70. No hay empresas inventadas. La API y el
dashboard leen ese seed; ningún lead se contacta en esta fase.

## 10. Seguridad (§9 de las instrucciones)

- **Secretos solo en backend, por env.** `.env.example` no contiene
  secretos: solo nombres de variables vacíos (`GROQ_API_KEY`,
  `OPENROUTER_API_KEY`, `TOP_TOOLS_API_KEY`, `XAI_API_KEY`,
  `COARENA_API_KEY`, `GMAIL_CLIENT_ID/SECRET`) + `LLM_PROVIDER`,
  `LLM_MODEL`, `MONTHLY_BUDGET_EUR=30`, `EFFECTIVE_SPEND_LIMIT_EUR=0`.
  `.env` está en `.gitignore`. El frontend nunca muestra claves completas.
- **Anti-SSRF y validación de URLs:** cualquier URL que el Researcher
  (Fase C) o el Auditor (Fase D) vaya a fetchear debe validarse antes:
  esquema `http(s)` únicamente, sin IPs privadas / localhost / metadatos
  de nube, con timeout y límite de tamaño. Sin validación no hay fetch.
  (Esqueleto en Fase 0: la regla queda documentada; la implementación
  llega con el primer fetch externo en Fase C.)
- **Contenido web externo = datos no confiables, nunca instrucciones.**
  Todo lo que venga de una página, un directorio o un email se trata como
  dato: no puede modificar el comportamiento, los permisos ni los
  objetivos de ningún agente, ni inyectar instrucciones (prompt
  injection). Las reglas del sistema y del operador prevalecen siempre.
- **RGPD / LSSI:** datos personales solo de fuentes públicas y con
  finalidad definida; correo comercial solo con base jurídica válida y
  aprobación humana (ver §5 Sales); bajas y oposiciones se honran
  (`ContactSuppression`) y no se vuelve a contactar.
- **Registro de auditoría de acciones de agentes:** cada ejecución queda
  en `AgentExecution` + `AgentMessage` y cada paso en `Task` + `TaskLog`
  (entidades Prisma §8). Nada de lo que hace un agente es invisible.
- **Backup de PostgreSQL:** backup diario con restauración probada, mismo
  patrón que NEXUS/LicitaClima (pendiente de configurar en el despliegue,
  no en Fase 0).
- **Control de acceso por roles:** `User` + `Role` en Prisma; sin
  autenticación implementada en Fase 0 (llega con el producto).

## 11. Mapa de fases: plan original vs plan nuevo

El encargo llegó en dos partes: el prompt maestro v1.0 (fases A viabilidad
→ 0 esqueleto → 1-5 agentes) y las instrucciones de equipo 2026-11-16
(fases A Infraestructura, B IA, C Investigación, D Generación+auditoría,
E Comercial, F Optimización). Correspondencia:

| Plan original | Plan nuevo | Estado |
|---|---|---|
| Fase A — Viabilidad (piloto Logroño) | **Puerta de la Fase C** | ✅ Cerrada 2026-11-16: GO con alcance recortado (10 leads ≥ 70). Sin su veredicto no se construye el Researcher a escala |
| **Fase 0 — Esqueleto (este repo)** | **Fase A — Infraestructura** | ✅ Este repo: monorepo, estados, schema, API mínima, multiprovider, costes, panel |
| Fase 1 — Researcher | Fase C — Investigación | ⏳ Pendiente (discovery provisional: búsqueda web) |
| Fase 2 — Designer | Fase D — Generación y auditoría | ⏳ Pendiente |
| Fase 3 — Auditor | Fase D — Generación y auditoría | ⏳ Pendiente |
| Fase 4 — Sales | Fase E — Comercial | ⏳ Pendiente (borradores, sin envío, gate LSSI) |
| Fase 5 — CRM | Fase E — Comercial | ⏳ Pendiente |
| (verificación final) | Fase F — Optimización | ⏳ Pendiente (medir costes reales, comparar proveedores) |
| — | Fase B — Inteligencia artificial | ⏳ Pendiente (integrar Groq/OpenRouter, fallback, medir calidad y consumo) |

## 12. Qué NO hace la Fase 0 (explícito)

- Sin despliegue (Oracle ni Vercel), sin repo en GitHub, sin emails, sin
  scraping de Google Maps, sin APIs de pago activadas.
- Sin Researcher/Designer/Auditor/Sales/CRM funcionales.
- Sin persistencia en la API (estado en memoria; se pierde al reiniciar).
- Sin autenticación ni control de acceso (llegan con las fases de producto).
