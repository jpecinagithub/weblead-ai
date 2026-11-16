# WebLead AI — Fase D: Generación y auditoría (Website Designer + Auditor) — informe §12 (2026-11-16)

Alcance: solo Website Designer/Developer + demo-platform + Auditor con
Playwright (nueva Fase D del plan A–F; antiguas Fases 2 Designer + 3
Auditor). Nada de Sales/CRM, nada de despliegue en Oracle/Vercel, nada de
emails, nada de pago. Puerta: Fase C (Researcher terminado, 11 Business en
Postgres, 10 QUALIFIED).

## 1. Funcionalidades implementadas

- **2 plantillas sectoriales REALES y diferenciadas** (`packages/website-templates`):
  `fontaneria-climatizacion` (azul petróleo + cobre, títulos condensados,
  confianza primero, sección "Cómo trabajamos", FAQ de averías) y
  `peluqueria-barberia` (carbón + dorado, serif de escaparate, galería
  protagonista, FAQ de cita/servicios). Distintas en paleta, tipografía,
  orden de secciones y FAQ (no una genérica con colores cambiados).
- **Generador determinista** (`packages/website-generator`): construye el
  contenido solo desde el expediente (nombre, sector, dirección, teléfono,
  email, servicios, actividad, fuentes). **Servicios: solo los
  contrastados.** Los expedientes del piloto no listan servicios, así que
  las demos muestran "Servicios pendientes de confirmar con la empresa"
  en vez de inventar una lista sectorial. `validateNoInventedClaims`
  rechaza precios, horarios, testimonios, superlativos, certificaciones,
  años de experiencia y urgencias 24h en cualquier texto, incluidos los
  borradores LLM (campo rechazado → texto determinista, rechazo registrado).
  WhatsApp solo con teléfono público español verificado. Formulario solo
  demo (validación local, no envía nada). SEO (title, description, OG,
  robots, sitemap), responsive, accesibilidad básica (alt, roles, labels),
  aviso legal de demo en cada página.
- **Identidad visual por empresa**: logotipo CONCEPTUAL propio (SVG con
  iniciales + motivo sectorial — tubería/tijera —, nunca marcas de
  terceros), paleta y tipografía coherentes con sector y localidad.
- **Imágenes**: 6 fotos Unsplash License, cada una verificada visualmente
  (abierta y mirada, no confiada por su id) el 2026-11-16, servidas EN
  LOCAL desde `apps/demo-platform/public/images/` con su URL Unsplash
  original guardada como procedencia en `WebsiteAsset.source`. La foto de
  electricista `photo-1621905251189-08b45d6a269e` fue RECHAZADA para
  fontanería (muestra trabajo eléctrico, no fontanería).
- **Designer** (`packages/agent-designer`): `designWebsite` — entrada
  QUALIFIED (primer diseño), AUDIT_FAILED (re-diseño tras suspender) o
  PREVIEW_READY (reelaboración); flujo validado paso a paso
  `→ DESIGNING → PREVIEW_READY`. Persiste `WebsiteProject` (contenido JSON
  en `brandConfig` + `content`), `WebsiteAsset` (logo + fotos, licencia y
  fuente) y `UsageRecord` por llamada LLM real (estimado/confirado
  separados). Migración Prisma `20261116210000_fase_d_designer_auditor`
  (nuevo `WebsiteProject.content`; nuevos `Audit.runner/demoUrl/screenshots`).
- **Demo-platform** (`apps/demo-platform`): rutas `/demos/{slug}` reales
  desde `src/data/generated-demos.ts` (generado desde Postgres, datos
  aislados por proyecto), aviso conceptual visible en cada demo y en el
  dashboard `/` (tabla con empresa, sector, plantilla, estado y última
  auditoría + enlace). SEO por demo, `robots.txt` + `sitemap.xml`
  regenerados con las demos, favicon propio.
- **Auditor independiente** (`packages/agent-auditor`): código y criterios
  separados del Designer. Auditoría de contenido (pura, siempre): datos de
  la demo contra el expediente (nombre/dirección/teléfono/email/servicios),
  afirmaciones prohibidas, aviso, formulario honesto, coherencia visual
  (paleta, fuentes, imágenes con licencia/procedencia), técnica (SEO,
  enlaces `tel:`/`wa.me`, URLs de imagen). Puntuación 0–100 por dimensión
  (CRITICAL −25, MINOR −10, RECOMMENDATION −3); PASSED exige 0 críticas y
  todas ≥ 60. **Playwright real** (`playwright-runner.ts`, `playwright-core`
  + Chromium 153 en caché, sin descarga): errores de consola/HTTP, imágenes
  rotas, enlaces rotos, alt, desbordamiento móvil, tiempos de carga,
  capturas desktop 1280×800 + móvil 390×844. Si Chromium no existe, lanza
  `PlaywrightUnavailableError` y la auditoría queda como
  `playwright-unavailable`, nunca como Playwright aprobado.
- **API** (`apps/api`): `POST /api/websites/generate`, `GET /api/websites`,
  `GET /api/websites/:id`, `POST /api/audit/run` (PREVIEW_READY → AUDITING
  → APPROVED | AUDIT_FAILED, validado; guarda Audit + AuditFinding),
  `GET /api/websites/:id/audit`. Scripts `generate:designs` (diseña las 2
  demos desde los borradores LLM) y `export:demos` (exporta demos a la
  demo-platform sin diseñar, para refrescar estados tras auditar).
- **Generación real**: 2 demos de empresas QUALIFIED del piloto —
  Santiago Ferrer Fontanería en General SL (pilot 6, score 100) y Begoña
  Ruiz Peluquería (pilot 17, score 90) — con sus datos del expediente.
  Borradores LLM aceptados en ambos campos (subtítulo + "La empresa"), 0
  rechazos. Flujo completo verificado en vivo en ambas:
  QUALIFIED → DESIGNING → PREVIEW_READY → AUDITING → APPROVED.
- **Auditorías en Postgres**: 4 Audit (2 FAILED de Ferrer durante la
  corrección + 2 PASSED finales) y 10 AuditFinding. Informes finales:
  ambas demos **PASSED 100/100/100/100** (empresarial/visual/técnica/
  contenido), 0 hallazgos, runner `playwright`.

## 2. Archivos creados o modificados

| Archivo | Cambio |
|---|---|
| `packages/website-templates/src/index.ts` | Reescrito: 2 plantillas sectoriales reales. |
| `packages/website-templates/test/templates.test.ts` | Nuevo. 5 tests. |
| `packages/website-generator/src/index.ts` | Reescrito: generador determinista + anti-invención. |
| `packages/website-generator/test/generator.test.ts` | Nuevo. 13 tests. |
| `packages/website-generator/test/fixtures.ts` | Nuevo. Datos reales Ferrer/Begoña para tests. |
| `packages/agent-designer/src/index.ts` | Reescrito: `designWebsite` + persistencia. |
| `packages/agent-designer/test/designer.test.ts` | Nuevo. 6 tests (stub Prisma). |
| `packages/agent-auditor/src/index.ts` | Reescrito: auditoría de contenido + `saveAudit`. |
| `packages/agent-auditor/src/playwright-runner.ts` | Nuevo. Runner Playwright con Chromium en caché. |
| `packages/agent-auditor/test/auditor.test.ts` | Nuevo. 9 tests (defectos plantados). |
| `packages/database/prisma/schema.prisma` | `WebsiteProject.content`, `Audit.runner/demoUrl/screenshots`. |
| `packages/database/prisma/migrations/20261116210000_fase_d_designer_auditor/` | Nueva migración. |
| `apps/api/src/index.ts` | Endpoints Fase D + seed de costes Fase D. |
| `apps/api/src/generate-designs.ts` | Nuevo. Generación real de las 2 demos. |
| `apps/api/src/export-demos.ts` | Nuevo. Exporta demos a la demo-platform. |
| `apps/api/package.json` | Deps designer/auditor/generator; scripts `generate:designs`, `export:demos`. |
| `apps/demo-platform/src/App.tsx` | Reescrito: dashboard + render de demos reales. |
| `apps/demo-platform/src/styles.css` | Reescrito: estilos por plantilla (variables CSS). |
| `apps/demo-platform/src/data/generated-demos.ts` | Generado (2 demos, no editar a mano). |
| `apps/demo-platform/public/images/*.jpg` | Nuevas. 6 fotos Unsplash servidas en local. |
| `apps/demo-platform/public/favicon.svg`, `robots.txt`, `sitemap.xml` | Nuevos/actualizados. |
| `apps/demo-platform/index.html` | Favicon. |
| `apps/demo-platform/package.json` | Deps generator/templates. |
| `fase-d/design-drafts-tta.py` | Nuevo. 2 borradores LLM con Top-Tools-Ai-Basic. |
| `fase-d/llm-design-drafts.json` | Nuevo. Respuestas reales con usage. |
| `docs/phase-d/screenshots/*.png` | Nuevas. 4 capturas de auditoría + dashboard. |
| `docs/phase-d-report.md` | Nuevo. Este informe. |
| `docs/architecture.md` | Tabla de fases: Fase D cerrada. |
| READMEs de designer/auditor/generator/templates/demo-platform | Actualizados (ya no son esqueletos). |
| `pnpm-lock.yaml` | `playwright-core`, `@types/node`, nuevas deps workspace. |

## 3. Pruebas realizadas (comando + resultado exacto)

- `pnpm build` (global): **verde, exit 0** (todos los paquetes + apps).
- `pnpm typecheck` (global): **verde, exit 0**.
- `pnpm test`: **91 passed (8 ficheros), 0 failed** — antes 58; **33 nuevos**:
  templates 5, generator 13, designer 6, auditor 9. Nuevos: plantillas
  diferenciadas, generador sin inventos (servicios vacíos → pendiente,
  borrador LLM con precio/años rechazado, borrador limpio aceptado),
  transiciones DESIGNING/PREVIEW_READY/AUDITING/APPROVED/AUDIT_FAILED,
  auditor detectando defectos plantados (teléfono, servicio inventado,
  precio, aviso ausente, imagen sin licencia).
- **API en vivo** (http://localhost:4000, Postgres real):
  - `GET /health` → `{"status":"ok","phase":"D-design-audit"}`.
  - `GET /api/websites` → 2 proyectos PREVIEW_READY (antes de auditar).
  - `GET /api/costs/summary` → 13 llamadas, 3.149 tokens, estimado 0,
    confirmado null.
  - `POST /api/businesses/4/state {"to":"APPROVED"}` → HTTP 400
    (QUALIFIED → APPROVED ilegal).
  - `POST /api/audit/run` sobre APPROVED → HTTP 409.
  - `POST /api/websites/generate` sobre REJECTED (empresa de prueba
    creada y luego eliminada) → HTTP 409.
- **Demo-platform en vivo** (http://localhost:5174): `/` muestra el
  dashboard con las 2 demos (APPROVED, PASSED (playwright), enlace), 0
  errores de consola; `/demos/santiago-ferrer-fontaneria-en-general-sl-logrono`
  y `/demos/begona-ruiz-peluqueria-logrono` renderizan aviso, datos
  correctos y responsive (ver capturas).
- **Auditorías Playwright en vivo** (runner `playwright`, Chromium 153):
  - Ferrer, 1ª: FAILED — 9 CRITICAL: 3 imágenes Unsplash rotas
    (`ERR_TUNNEL_CONNECTION_FAILED` en el Chromium de la VM), 1 clave
    React duplicada, 1 favicon 404, resto errores de consola por las
    imágenes. Técnica 0.
  - Ferrer, 2ª: FAILED — 1 CRITICAL: solo el 404 de `/favicon.ico`.
  - Ferrer, 3ª: **PASSED 100/100/100/100, 0 hallazgos** → APPROVED.
  - Begoña: **PASSED 100/100/100/100, 0 hallazgos** → APPROVED.
  - Capturas en `docs/phase-d/screenshots/` (desktop + móvil por demo +
    dashboard), revisadas visualmente: aviso, datos, imágenes y responsive
    correctos.
- **Migración**: `prisma migrate deploy` → "All migrations have been
  successfully applied." (Fase C + Fase D).
- **Siembra**: `seed:research` → 10/10 QUALIFIED con scores idénticos al
  piloto (85, 100, 75, 90, 90, 90, 75, 85, 90, 75).
- **Generación**: `generate:designs` → 2/2 PREVIEW_READY; LLM aceptado en
  ambos campos, 0 rechazos; 2 WebsiteProject, 8 WebsiteAsset,
  2 UsageRecord `fase-d-generation`.

## 4. Resultados: verificación con empresas reales del piloto

| Empresa | Plantilla | Flujo de estados | Auditoría final |
|---|---|---|---|
| Santiago Ferrer Fontanería en General SL (6, score 100) | fontaneria-climatizacion | QUALIFIED → DESIGNING → PREVIEW_READY → AUDITING → APPROVED (con 2 FAILED intermedios corregidos) | PASSED 100/100/100/100, Playwright, 0 hallazgos |
| Begoña Ruiz Peluquería (17, score 90) | peluqueria-barberia | QUALIFIED → DESIGNING → PREVIEW_READY → AUDITING → APPROVED | PASSED 100/100/100/100, Playwright, 0 hallazgos |

- **La auditoría funcionó como diseñada**: encontró defectos reales (no
  plantados) y bloqueó el paso comercial hasta corregirlos — imágenes
  externas inalcanzables en esta VM, clave React duplicada, favicon
  ausente. Los tres se corrigieron con cambios reales (fotos en local,
  keys por índice, favicon SVG) y la re-auditoría pasó.
- **Nada inventado**: sin precios, horarios, testimonios,
  certificaciones ni servicios; servicios = "pendientes de confirmar" en
  ambas demos (el expediente no lista servicios). Teléfonos, direcciones
  y emails, solo los verificados.

## 5. Servicios externos utilizados

- **Top Tools AI** (`Top-Tools-Ai-Basic`, único proveedor operativo):
  2 llamadas chat reales, 657 tokens (232+84 Ferrer, 253+88 Begoña),
  latencias 7,39 / 6,61 s, HTTP 200. Coste estimado 0,00 USD; confirmado
  null (la API no devuelve precio).
- **Unsplash** (licencia Unsplash): 6 fotos descargadas y servidas en
  local; procedencia registrada por foto. Sin cuenta, sin coste.
- **PostgreSQL 16 local** (`weblead_dev`): persistencia real.
- **Playwright / Chromium 153** (caché local, sin descarga): auditoría
  en vivo. Sin coste.

## 6. Costes reales / estimados (separados)

| Concepto | Real | Estimado |
|---|---|---|
| LLM Fase D (2 borradores, Top-Tools-Ai-Basic, 657 tokens) | — (proveedor sin precio) | 0,00 USD |
| LLM acumulado proyecto (13 llamadas, 3.149 tokens) | — | 0,00 USD; confirmado null |
| Unsplash / Playwright / Postgres local | 0,00 USD | — |
| Apify / Google Places / APIEmpresas | 0,00 USD (nada consumido) | — |

Límite efectivo de gasto sigue en **0 €**; solo corre el tier gratuito
verificado (Top-Tools-Ai-Basic).

## 7. Limitaciones detectadas

1. **Incidente de entorno (VM reemplazada a mitad de fase)**: al
   rearrancar, `pnpm` había desaparecido del PATH y PostgreSQL 16 ya no
   existía en la máquina (sin clúster, sin usuario `postgres`, sin
   binarios). Se reinstaló pnpm 10.34.9 y PostgreSQL 16 desde los .deb de
   la caché local de apt (`postgresql-16`, `postgresql-client-16`,
   `postgresql-common`, `libpq5`, `libllvm17t64`, `ssl-cert`,
   `libjson-perl` y dependencias; `apt-get update` del sistema llevaba
   >10 min bloqueado en el índice y no se usó). Se recrearon rol
   `weblead` + BD `weblead_dev` desde `.env`, se aplicaron las 2
   migraciones y se resembró el piloto (10/10 QUALIFIED, scores
   idénticos). **Lección**: el estado de Postgres local no sobrevive a
   los reinicios/reemplazos de esta VM; en un despliegue real (Oracle)
   haría falta el backup diario con restauración probada que ya prevé
   `architecture.md` §10. La BD de esta fase se reconstruyó desde cero
   (sin Godoy: era un REJECTED de una investigación puntual de Fase C,
   no parte de la siembra de los 10 leads).
2. **El Chromium de la VM no alcanza images.unsplash.com**
   (`ERR_TUNNEL_CONNECTION_FAILED`; curl sí llega). Por eso las fotos se
   sirven en local. En un navegador normal las URLs Unsplash cargarían,
   pero el autoalojamiento es además más robusto para el despliegue.
3. **El favicon 404 no aparece como respuesta HTTP en Playwright**
   (solo como error de consola con `location: /favicon.ico`): el runner
   lo detecta vía consola, no vía `response`. Añadido `favicon.svg`.
4. **Doble conteo de tests (corregido)**: el test del auditor importaba
   `generator.test.ts` y Vitest ejecutaba sus 13 tests dos veces (104
   totales, 22 en auditor). Se extrajeron los fixtures a
   `test/fixtures.ts`: ahora 91 tests únicos (58 + 33 nuevos).
5. **Duplicado de UsageRecord (corregido)**: un re-diseño volvió a
   registrar el mismo consumo LLM (3 filas para 2 llamadas). Se borró la
   fila duplicada de Ferrer y `generate-designs` solo registra el uso
   cuando el proyecto es nuevo.
6. **Secuencia manual errónea (corregida en vivo)**: tras un AUDIT_FAILED
   se movió la empresa a DESIGNING a mano antes de regenerar, pero el
   Designer realiza él mismo la transición de entrada y rechazó DESIGNING
   como estado inicial. Se devolvió a PREVIEW_READY (transición válida) y
   el re-diseño funcionó (PREVIEW_READY → DESIGNING → PREVIEW_READY).
   El Designer acepta QUALIFIED, AUDIT_FAILED y PREVIEW_READY como
   entrada; nunca DESIGNING ni APPROVED.
7. La auditoría Playwright cubre una URL por proyecto (la demo); no
   navega enlaces internos (la demo tiene pocos: `tel:`/`mailto`/WhatsApp
   y vuelta al dashboard, verificados por contenido).
8. El logo conceptual de fontanería (glifo de tubería) es abstracto; no
   es una marca ni pretende serlo.
9. Los servidores de verificación (API :4000, demo :5174) se detuvieron
   al final de la fase; no queda ninguno corriendo en esta VM.

## 8. Tareas pendientes

- Fase E (Comercial: Gmail OAuth, Sales, CRM) según el plan A–F.
- Decidir el host de producción de la demo-platform (el sitemap usa
  `http://localhost:5174` como host de dev; pendiente de decisión).
- Reconectar xAI / Groq / OpenRouter / CoArena (Fase B: ninguno
  operativo) para tener fallback real; hoy todo descansa en
  Top-Tools-Ai-Basic.
- Modelar conflictos multi-fuente en el expediente (ej. 2 direcciones de
  Ferrer) — pendiente desde Fase C, sin cambios en esta fase.
- Generar demos para los 8 leads QUALIFIED restantes cuando se decida
  (el pipeline ya lo soporta: `POST /api/websites/generate` por empresa).
- Backup diario de Postgres con restauración probada (ver §7.1).

## 9. Instrucciones para continuar

```bash
cd ~/workspace/weblead-ai
# Si la VM se ha reiniciado: reinstalar pnpm si falta (npm i -g pnpm@10.34.9);
# si PostgreSQL 16 no existe, instalarlo desde la caché apt (ver §7.1) o
# apt-get install -y postgresql-16; arrancar (pg_ctlcluster 16 main start);
# si el clúster está vacío, recrear rol+BD desde .env y aplicar migraciones:
pnpm --filter @weblead/database exec prisma migrate deploy
pnpm --filter @weblead/api seed:research
# Generar las 2 demos (idempotente) + exportar a la demo-platform:
pnpm --filter @weblead/api generate:designs
# API + demos en vivo:
pnpm --filter @weblead/api dev          # http://localhost:4000
pnpm --filter @weblead/demo-platform dev # http://localhost:5174
# Auditar una demo:
curl -X POST http://localhost:4000/api/audit/run \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"santiago-ferrer-fontaneria-en-general-sl-logrono","demoUrl":"http://localhost:5174/demos/santiago-ferrer-fontaneria-en-general-sl-logrono"}'
# Tests / tipos / build:
pnpm test && pnpm typecheck && pnpm build
```
