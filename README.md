# WebLead AI — Autonomous Digital Agency (España)

Agencia digital autónoma: investiga empresas españolas sin web propia o con
presencia deficiente, crea webs personalizadas, las audita, prepara propuestas
comerciales (borradores, sin envío) y gestiona el seguimiento desde un
dashboard centralizado.

> **Estado: FASES A–E COMPLETADAS (2026-11-16).** Monorepo, multiprovider,
> Researcher, Designer + Auditor Playwright, Sales + CRM con gate LSSI.
> Flujo punta a punta verificado por el coordinador con empresas reales del
> piloto (ver [docs/validation-report.md](docs/validation-report.md)).
> **Sin desplegar** (ni Oracle ni Vercel), **0 emails enviados**, coste LLM
> acumulado 0,00 USD estimado. Falta la Fase F (Optimización).

## Arranque rápido (dev)

```sh
cp .env.example .env        # y rellena tus valores; .env nunca va a git
pnpm install                # instala + compila los paquetes (postinstall)
pnpm db:push                # aplica el schema Prisma a la BD local (PostgreSQL 16)
pnpm dev                    # API en http://localhost:4000
pnpm --filter @weblead/dashboard dev      # dashboard en http://localhost:5173
pnpm --filter @weblead/demo-platform dev  # demos en http://localhost:5174
```

Requisitos: Node 24, pnpm 10, PostgreSQL 16 local con BD `weblead_dev`
(ver `docs/architecture.md` § "Base de datos").

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | API en modo watch (tsx) |
| `pnpm dev:all` | API + dashboard + demo-platform en paralelo |
| `pnpm build` | Compila todos los paquetes/apps (orden topológico) |
| `pnpm typecheck` | `tsc --noEmit` por paquete/app (con `-p tsconfig.app.json` en las apps Vite) |
| `pnpm test` | Vitest: 144 tests en verde (estados, fallback, costes, researcher, generator, designer, auditor, sales, crm) |
| `pnpm db:generate` / `db:push` / `db:migrate` | Prisma (3 migraciones: Fase C researcher, Fase D designer/auditor, Fase E sales/crm) |

## Estructura

```
apps/
  api/             Express + TS (puerto 4000): /health, /api/businesses, /api/pipeline,
                   POST /api/businesses/:id/state (validado por la máquina de estados)
  dashboard/       Vite + React + TS: pipeline (18 estados) + 10 leads del piloto
  demo-platform/   Vite + React + TS estático: /demos/{slug} con aviso conceptual
packages/
  shared/          Tipos + máquina de estados del Orchestrator + seed del piloto (solo lectura)
  database/        Prisma schema (PostgreSQL, 31 entidades §8) + cliente
  ai-engine/       Capa común multiprovider (Groq, OpenRouter, Top Tools AI, xAI, CoArena, mock)
                   + selección por agente + fallback + SpendGate
  cost-control/    Módulo de costes (§8): registro, 8 indicadores, límite efectivo 0 €
  agent-core/      Orchestrator: registro de agentes + puerta de transiciones
  agent-researcher/  Researcher: expediente estructurado, scoring 0-100 (umbral 70),
                   actividad CONFIRMED/PROBABLE/UNVERIFIED/INACTIVE, ≥2 fuentes
  agent-designer/    Designer: 2 plantillas sectoriales, generador determinista sin invenciones
  agent-auditor/     Auditor independiente con Playwright (capturas desktop+móvil)
  agent-sales/       Sales: pricing BASIC/PRO/PREMIUM configurable, gate legal LSSI,
                   borradores LOCALES (sin envío), clasificador 8 categorías
  agent-crm/         CRM: pipeline 13 estados, historial, recordatorios, bajas SUPPRESSED
  integrations/    Gmail (stub not_connected) / Places / Overpass / Vercel / Serper / Exa
                   (estados honestos, sin credenciales)
  website-generator/ Generador determinista + validateNoInventedClaims
  website-templates/ 2 plantillas reales: fontaneria-climatizacion, peluqueria-barberia
  testing/         Helpers de test (MockProvider, seed)
docs/
  master-prompt-v1.md   Prompt maestro v1.0 (el resto tras "UUID" NO existe: pendiente §8 CERRADO 2026-11-16)
  instrucciones-equipo-agentes.md  2ª parte: multiprovider, costes, seguridad, panel, fases A–F
  feasibility.md        Fase A: GO CON ALCANCE RECORTADO (piloto Logroño, 10 leads ≥ 70)
  feasibility-data.csv  26 empresas del piloto (fuente y fecha por dato)
  architecture.md       Decisiones de arquitectura + bloqueadores + inventario de créditos
  search-providers.md   Matriz de fuentes (Serper candidato principal; Apify Maps descartado por base legal)
  phase-b-measurements.md  Medición LLM por tarea (Top-Tools-Ai-Basic, 949 tokens)
  phase-c-report.md / phase-d-report.md / phase-e-report.md  Informes §12 por fase
  validation-report.md  Verificación final del coordinador (flujo punta a punta)
  gmail-setup.md        Pasos para conectar Gmail OAuth (pendiente de Jon)
fase-a/            Medición de coste Top Tools AI (4 expedientes, 0,00 USD)
fase-b/            Medición por tarea (4 tareas, 949 tokens)
fase-d/            Borradores de diseño LLM (2 llamadas, 657 tokens)
fase-e/            Borrador comercial LLM (1 llamada, 226 tokens)
```

## Estado por fase

Dos planes reconciliados (ver `docs/architecture.md` §11): la Fase 0 de
este repo corresponde a la nueva Fase A (Infraestructura); el piloto de
viabilidad es la puerta de la nueva Fase C.

| Fase (plan nuevo) | Estado |
|---|---|
| Fase A — Infraestructura (antes "Fase 0 — Esqueleto") | ✅ `d8b8270`: monorepo, estados, schema, API, multiprovider, costes, panel |
| Fase B — Inteligencia artificial | ✅ `6d8a60d`: solo Top Tools AI Basic operativo; fallback, límites, medición 949 tokens |
| Fase C — Investigación (Researcher) | ✅ `8d8af2b`: 10/10 leads reproducidos, 58 tests, persistencia Prisma |
| Fase D — Generación y auditoría (Designer + Auditor) | ✅ `e6227ac`: 2 plantillas, 2 demos APPROVED (Playwright 100/100/100/100), 91 tests |
| Fase E — Comercial (Sales + CRM) | ✅ `afbffdc`: pricing, gate LSSI, borradores locales, CRM 13 estados, 144 tests |
| Fase F — Optimización | ⏳ Pendiente (costes reales, Serper/Exa, backup Postgres, 8 demos restantes) |

Flujo punta a punta verificado por el coordinador el 2026-11-16
([docs/validation-report.md](docs/validation-report.md)): Hidrorioja y Expert
(QUALIFIED → DESIGNING → PREVIEW_READY → AUDITING → APPROVED); prepare de
empresas reales bloqueado correctamente (NO_EMAIL / NO_LEGAL_BASIS);
SALES_PENDING → SALES_APPROVED solo con fixture sintética marcada.

## Pendientes y bloqueadores (actualizado 2026-11-16)

- **xAI / grok FUERA: saldo $0,00** (uso $5,78, 7.088.187 tokens, 798 requests,
  verificado por Jon en console.x.ai). Clave NEXUS (…IGKt) existe y está activa,
  pero sin recarga (pago, solo con aprobación expresa de Jon) grok no funciona.
  La credencial 400 de este entorno NO es la clave NEXUS.
  Discrepancia: NEXUS dice 4,09/4,21 USD; manda la consola. No tocar la BD de
  NEXUS desde WebLead.
- **CoArena: clave revocada** (401). **Groq: sin clave de inferencia**
  (solo "Audio to Text"). **OpenRouter: sin claves**, saldo 0,91/10 USD.
- **Top Tools AI**: único operativo (`Top-Tools-Ai-Basic`). NEXUS dice 0 tokens
  usados pero la Fase A gastó 805 reales (filas manuales, no sincronizadas).
- **Créditos de Jon** (NEXUS 2026-11-16): Serper 2.382/2.500 (candidato principal
  Researcher, coste/empresa sin medir), Exa 19,013/20 USD, Vercel AI Gateway
  4,999/5 USD (LLM alternativo viable), Gemini pendiente de verificar.
- **Sin fuente de discovery masivo conforme**: Apify Maps descartado por base
  legal, Places restringido, Overpass inaccesible desde esta VM.
- **Postgres local no sobrevive a reinicios/reemplazos de esta VM** (ocurrido en
  Fases C y D): falta backup diario con restauración probada.
- **Límite efectivo de gasto: 0 €** hasta aprobación expresa de Jon
  (presupuesto de referencia: 30 €/mes adicionales). Las llamadas LLM de
  pago están bloqueadas por el SpendGate.
- **Preguntas para Jon**: ¿cuándo caduca el crédito Apify de 5 USD? ¿Recargar
  xAI? ¿Base legal o canal alternativo para Ferrer/Begoña/Hidrorioja?
  ¿Clave Groq de inferencia / clave nueva OpenRouter?
- El pendiente §8 quedó **CERRADO 2026-11-16**: no existe resto literal del
  prompt tras "UUID". BD con las entidades de §8 (30 citadas / 31 nombres
  contados, las 31 en Prisma) + segundo documento.

## Reglas

- Nunca desplegar en Oracle o Vercel, crear repo en GitHub, enviar emails ni
  activar APIs de pago sin autorización expresa aparte.
- Nunca inventar datos de empresas: el único seed es el CSV del piloto.
- Secretos solo por env (`.env`, gitignored). Nada de claves en código ni en git.
- Autor: jpecina.
