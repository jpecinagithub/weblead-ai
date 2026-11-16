# WebLead AI — Autonomous Digital Agency (España)

Agencia digital autónoma: investiga empresas españolas sin web propia o con
presencia deficiente, crea webs personalizadas, las audita, prepara propuestas
comerciales (borradores, sin envío) y gestiona el seguimiento desde un
dashboard centralizado.

> **Estado: FASE 0 — ESQUELETO.** Solo estructura, tipos, máquina de estados,
> schema de BD y endpoints mínimos. Ningún agente funcional todavía.
> Ver [docs/architecture.md](docs/architecture.md) y el estado por fase abajo.

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
| `pnpm test` | Vitest (máquina de estados) |
| `pnpm db:generate` / `db:push` / `db:migrate` | Prisma |

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
  agent-researcher/  Esqueleto Fase 1 (discovery provisional: búsqueda web + directorios)
  agent-designer/    Esqueleto Fase 2 (webs + aviso conceptual)
  agent-auditor/     Esqueleto Fase 3 (auditoría Playwright)
  agent-sales/       Esqueleto Fase 4 (borradores Gmail, sin envío)
  agent-crm/         Esqueleto Fase 5 (pipeline + bajas)
  integrations/    Gmail / Google Places / Overpass / Vercel (estados, sin credenciales)
  website-generator/ Esqueleto Fase 2
  website-templates/ Esqueleto Fase 2 (catálogo de plantillas)
  testing/         Helpers de test (MockProvider, seed)
docs/
  master-prompt-v1.md   Prompt maestro v1.0 (ORIGINAL TRUNCADO al final de §8)
  feasibility.md        Fase A: GO CON ALCANCE RECORTADO (piloto Logroño, 10 leads ≥ 70)
  feasibility-data.csv  26 empresas del piloto (fuente y fecha por dato)
  architecture.md       Decisiones de arquitectura + bloqueadores
fase-a/            Medición de coste Top Tools AI (4 expedientes, 0,00 USD)
```

## Estado por fase

Dos planes reconciliados (ver `docs/architecture.md` §11): la Fase 0 de
este repo corresponde a la nueva Fase A (Infraestructura); el piloto de
viabilidad es la puerta de la nueva Fase C.

| Fase (plan nuevo) | Estado |
|---|---|
| Fase A — Infraestructura (antes "Fase 0 — Esqueleto") | ✅ Este repo: monorepo, estados, schema, API mínima, multiprovider, costes, panel |
| Fase B — Inteligencia artificial (Groq/OpenRouter, fallback, medición) | ⏳ Pendiente (claves sin comprobar) |
| Fase C — Investigación (Researcher) | ⏳ Pendiente — puerta: piloto Fase A ✅ GO con alcance recortado |
| Fase D — Generación y auditoría (Designer + Auditor) | ⏳ Pendiente |
| Fase E — Comercial (Sales + CRM) | ⏳ Pendiente (borradores, sin envío, gate LSSI) |
| Fase F — Optimización | ⏳ Pendiente |

## Pendientes y bloqueadores (de Fase A, sin resolver en Fase 0)

- **xAI: credencial registrada INVÁLIDA** (400 Incorrect API key, 2026-11-16).
  Ningún agente depende de xAI; el proveedor es configurable por env.
- **CoArena: clave revocada** (401 api_key_revoked). Configurada pero no operativa.
- **Groq / OpenRouter: sin claves asumidas.** Groq es el primer candidato
  (§3) pero solo queda la clave "Audio to Text"; las 4 claves OpenRouter se
  eliminaron el 2026-11-14. La comprobación real de claves es Fase B.
- **Top Tools AI renombró sus modelos**: `Top-Tools-Ai` y `Kimi-K2.6` devuelven
  400 `model_not_found`; el vigente es `Top-Tools-Ai-Basic` (también Pro/Max,
  sin probar). El `CONNECTOR.md` del proveedor sigue con los nombres viejos
  y queda pendiente de actualizar (fuera de esta fase).
- **Límite efectivo de gasto: 0 €** hasta aprobación expresa de Jon
  (presupuesto de referencia: 30 €/mes adicionales). Las llamadas LLM de
  pago están bloqueadas por el SpendGate.
- **Overpass inaccesible desde esta VM**; **Google Places API sin probar**
  (requiere clave + revisión de ToS). El Researcher usará búsqueda web como
  fuente provisional.
- El §8 del prompt maestro llegó **truncado**; el schema Prisma implementa la
  lista de 31 entidades tal como aparece, con campos inferidos de §§0–5.

## Reglas

- Nunca desplegar en Oracle o Vercel, crear repo en GitHub, enviar emails ni
  activar APIs de pago sin autorización expresa aparte.
- Nunca inventar datos de empresas: el único seed es el CSV del piloto.
- Secretos solo por env (`.env`, gitignored). Nada de claves en código ni en git.
- Autor: jpecina.
