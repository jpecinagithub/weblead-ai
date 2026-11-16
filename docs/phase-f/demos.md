# WebLead AI — Fase F, Bloque 4: demos restantes — informe

Fecha: 2026-11-16. Alcance: generar + auditar con Playwright las demos de los
leads ≥ 70 de Logroño que aún no tienen demo APPROVED. Nada de despliegue
(Oracle/Vercel), nada de emails, nada inventado: todos los datos de empresa
proceden de `docs/feasibility-data.csv` y
`packages/shared/src/data/pilot-leads.json`.

## 1. Conteo inicial (verificado en la BD, no en memoria)

Consulta a Postgres (`weblead_dev`, tablas `Business`, `WebsiteProject`,
`Audit`) el 2026-11-16 ~21:23 CET. Coincide con lo esperado: **4 APPROVED y
6 restantes**.

| # | Empresa (pilot id) | Score | Estado BD | Demo | Última auditoría |
|---|---|---|---|---|---|
| 1 | Fontanería la Moderna (4) | 85 | QUALIFIED | — | — |
| 2 | Santiago Ferrer Fontanería en General SL (6) | 100 | APPROVED | `santiago-ferrer-fontaneria-en-general-sl-logrono` | PASSED 100/100/100/100, runner `playwright` |
| 3 | Fontanería Chuchi (7) | 75 | QUALIFIED | — | — |
| 4 | Hidrorioja SC (8) | 90 | APPROVED | `hidrorioja-sc-logrono` | PASSED 100/100/100/100, runner `content-only` (*) |
| 5 | Expert Fontaneros Logroño (13) | 90 | APPROVED | `expert-fontaneros-logrono-logrono` | PASSED 100/100/100/100, runner `playwright` |
| 6 | Begoña Ruiz Peluquería (17) | 90 | APPROVED | `begona-ruiz-peluqueria-logrono` | PASSED 100/100/100/100, runner `playwright` |
| 7 | Avalon Stilistas (19) | 75 | QUALIFIED | — | — |
| 8 | Lumberjack Barbershop (24) | 85 | QUALIFIED | — | — |
| 9 | Star Barber Shop (25) | 90 | QUALIFIED | — | — |
| 10 | Peluquería Nuria (26) | 75 | QUALIFIED | — | — |

(*) **Matiz heredado:** la auditoría PASSED de Hidrorioja fue `content-only`
(sin `demoUrl`), así que su 100 técnico no incluye comprobación en navegador
(ya advertido en `docs/validation-report.md` §2). El endpoint rechaza auditar
un negocio en estado APPROVED (409), por lo que no se puede re-auditar con
Playwright sin revertir su estado; no se toca: cuenta como APPROVED según la
BD. Las 6 demos nuevas de este bloque sí se auditan con Playwright real.

Las 2 filas extra de `Business` sin `pilotId` son fixtures de la Fase E
("VERIFICACIÓN FASE E — Empresa de prueba" y "— Baja de prueba"): no son
leads del piloto y no entran en este bloque.

**Conteo final: 10/10 leads ≥ 70 APPROVED** (4 previos + 6 de este bloque).

## 2. Demos generadas en este bloque

Borradores LLM: `fase-f/design-drafts-tta.py` + `fase-f/llm-design-drafts.json`
(Top Tools AI `Top-Tools-Ai-Basic`, mismo procedimiento que Fase D): 6 llamadas,
todas HTTP 200, **1.732 tokens en total** (355 + 254 + 280 + 310 + 260 + 273),
latencias 6,39 / 5,54 / 5,85 / 6,06 / 6,61 / 8,87 s. Coste estimado 0,00 USD,
confirmado null. Ningún borrador inventa nada (solo nombre, sector, dirección,
teléfono y datos verificados del expediente).

Generación: `pnpm --filter @weblead/api generate:designs:fase-f`
(`apps/api/src/generate-designs-fase-f.ts`, modelado sobre el script de Fase D
para los pilot 4, 7, 19, 24, 25, 26). Las 6, QUALIFIED → DESIGNING →
PREVIEW_READY; borrador LLM aceptado en subtítulo y "La empresa" en las 6,
**0 rechazos**. `UsageRecord` de `fase-d-generation`: 8 filas (2 de Fase D + 6
nuevas, sin duplicados en los re-diseños).

| Empresa | Slug | Plantilla | LLM subtítulo / sobre | Estado final |
|---|---|---|---|---|
| Fontanería la Moderna (4) | `fontaneria-la-moderna-logrono` | fontaneria-climatizacion | aceptado / aceptado | APPROVED |
| Fontanería Chuchi (7) | `fontaneria-chuchi-logrono` | fontaneria-climatizacion | aceptado / aceptado | APPROVED |
| Avalon Stilistas (19) | `avalon-stilistas-logrono` | peluqueria-barberia | aceptado / aceptado | APPROVED |
| Lumberjack Barbershop (24) | `lumberjack-barbershop-logrono` | peluqueria-barberia | aceptado / aceptado | APPROVED |
| Star Barber Shop (25) | `star-barber-shop-logrono` | peluqueria-barberia | aceptado / aceptado | APPROVED |
| Peluquería Nuria (26) | `peluqueria-nuria-logrono` | peluqueria-barberia | aceptado / aceptado | APPROVED (tras 2 FAILED, ver §3) |

Servicios en las 6: "pendientes de confirmar con la empresa" (el expediente
no lista servicios contrastados), como en Fase D. Sin precios, horarios,
testimonios, certificaciones ni superlativos.

Exportación: `pnpm --filter @weblead/api export:demos` → **12 demos** en
`apps/demo-platform/src/data/generated-demos.ts` (4 APPROVED previas + 2
fixtures Fase E + 6 nuevas) y `sitemap.xml` regenerado. Las 6 rutas
`/demos/{slug}` devuelven HTTP 200 en `http://localhost:5174`.

## 3. Auditorías Playwright

Runner `playwright` (Chromium 153 en caché), `POST /api/audit/run` con
`demoUrl http://localhost:5174/demos/{slug}`. Listón: PASSED 100/100/100/100
(empresarial/visual/técnica/contenido), 0 hallazgos.

| Empresa | Intento | Resultado | Puntuaciones (emp/vis/téc/con) | Hallazgos | Audit id |
|---|---|---|---|---|---|
| La Moderna | 1 | PASSED | 100/100/100/100 | 0 | `a0540f86-88f8-424c-a326-5aa9f7b5d0c0` |
| Chuchi | 1 | PASSED | 100/100/100/100 | 0 | `74cf4859-5e9f-4992-930d-9f74382bbc51` |
| Avalon | 1 | PASSED | 100/100/100/100 | 0 | `2b12e370-ba24-43c4-b758-71c06cf90eca` |
| Lumberjack | 1 | PASSED | 100/100/100/100 | 0 | `bfa6fb89-3d2a-4c18-9ed8-a3da34a4154a` |
| Star Barber | 1 | PASSED | 100/100/100/100 | 0 | `bdad0caa-38aa-4201-aabb-f61c87d8abd2` |
| Nuria | 1 | FAILED | 75/100/100/100 | 1 CRITICAL | `ddf4c77c-fd7d-4dc7-832e-2f41c13c1da2` |
| Nuria | 2 | FAILED | 75/100/100/100 | 1 CRITICAL (misma) | `27c4c75b-db7d-4e84-82e0-fdf5cc2cded0` |
| Nuria | 3 | PASSED | 100/100/100/100 | 0 | `737e14c4-763c-4b0b-97d8-b3597cb99645` |

### Nuria: bucle DESIGNING → re-auditar (2 FAILED antes del PASSED)

- **Intento 1 (FAILED, empresarial 75):** 1 CRITICAL (BUSINESS): "Afirmación
  no permitida en trust[3]: horario". Causa raíz: el generador incrustaba la
  señal de actividad del expediente **verbatim** como trust item
  ("Señal de actividad: Ficha activa con horarios; última evidencia dura
  2017-2018…"), y la palabra "horarios" dispara el patrón prohibido
  `/horario/` del auditor, aunque no se afirme ningún horario concreto. El
  generador solo validaba los campos del borrador LLM, no los trust items
  que construye él mismo.
- **Corrección (código, no atajo):** `sanitizeActivitySignal()` en
  `packages/website-generator/src/index.ts` — el trust item conserva solo
  las frases de la señal libres de afirmaciones prohibidas (misma lista que
  se aplica a los borradores LLM), en orden y verbatim; si no sobrevive
  ninguna frase, se omite el item. + 2 tests en
  `packages/website-generator/test/generator.test.ts` (15 tests en el
  paquete, todos en verde). El auditor NO se ha debilitado.
- **Intento 2 (FAILED, misma causa):** el re-diseño se lanzó antes de
  reconstruir el paquete: la API importa `@weblead/website-generator`
  desde `dist/` (`"main": "./dist/index.js"`), no desde `src/`, y `tsx
  watch` no reconstruye `dist`. Lección: tras tocar un paquete, `pnpm
  --filter <paquete> build` + reiniciar la API antes de re-auditar.
- **Intento 3 (PASSED 100/100/100/100):** tras `pnpm --filter
  @weblead/website-generator build` + reinicio de la API, re-diseño
  (AUDIT_FAILED → DESIGNING → PREVIEW_READY) y re-auditoría. El trust item
  queda: "Señal de actividad: Última evidencia dura 2017-2018 (oferta
  Colectivia, Carné Joven). Un directorio menciona 'página web disponible'
  sin URL: no verificada." — hechos verificados, sin la cláusula que
  disparaba el patrón.
- Las 2 FAILED de Nuria quedan como 2 `AuditFinding` sin corregir en la BD
  (total 12, antes 10 de Ferrer en Fase D): son el historial de los intentos
  fallidos, igual que en Fase D; las auditorías PASSED finales tienen 0
  hallazgos.

## 4. Capturas

`docs/phase-f/screenshots/{slug}-desktop.png` y `{slug}-mobile.png` por demo
(1280×800 y 390×844, generadas por el runner Playwright del endpoint
`POST /api/audit/run`; el endpoint se cambió para escribir en
`docs/phase-f/screenshots/` en vez de `docs/phase-d/screenshots/` —
`apps/api/src/index.ts`, comentario + rutas; las capturas de Fase D quedan
intactas en `docs/phase-d/screenshots/`). Nota: ese cambio en `index.ts`
quedó commiteado dentro de `71f88c2` (Bloque 1, que commiteó el árbol
compartido mientras este bloque trabajaba en paralelo); este commit
`67a227f` contiene el resto del trabajo del bloque.

Verificadas visualmente: La Moderna desktop, Lumberjack móvil y Nuria
desktop — aviso conceptual visible arriba en las tres ("Propuesta conceptual
independiente, no oficial y pendiente de autorización de la empresa."),
datos verificados correctos, "Servicios pendientes de confirmar con la
empresa", sin desbordamiento móvil aparente.

Nota: en `docs/phase-f/screenshots/` hay además 3 PNG que NO son de este
bloque (`dashboard-desktop.png`, `dashboard-mobile.png`,
`demo-expert-desktop.png`, 20:26–20:27): los generó otro bloque de la Fase F
que trabajaba en paralelo sobre el mismo repo; no se tocan ni se incluyen en
el commit de este bloque.

## 5. Comandos y resultados

- `python3 fase-f/design-drafts-tta.py` → 6/6 HTTP 200, 1.732 tokens,
  estimado 0,00 USD.
- `pnpm --filter @weblead/api generate:designs:fase-f` → 6/6 PREVIEW_READY,
  LLM 6/6 aceptado, 0 rechazos; export 12 demos.
- `POST /api/audit/run` × 8 (6 primeras + 2 re-intentos Nuria) → 6 PASSED
  Playwright 100/100/100/100, 2 FAILED Nuria (documentados en §3).
- `pnpm test` (raíz) → **164 passed, 12 ficheros, 0 failed**. (144 al cierre
  de Fase E + 2 tests nuevos del generador + 18 de otros bloques de Fase F
  que corrían en paralelo en el mismo repo; paquetes afectados por este
  bloque: `website-generator` 15/15.)
- `pnpm typecheck` (raíz) → **NO todo en verde**: todos los paquetes en verde
  **excepto `apps/demo-platform`**, con 2 errores preexistentes:
  `src/data/generated-demos.ts(634,7)` y `(644,7)`: `error TS2353: Object
  literal may only specify known properties, and '"demo"' does not exist in
  type 'GeneratedWebsiteContent'`. Son las 2 fixtures de la Fase E
  (`content: {"demo": true, "fixture": true, ...}`), presentes ya en
  `generated-demos.ts` en HEAD (`e6b0547`, verificado con `git show HEAD`:
  líneas 324/334 con `"demo": true`). No las introduce este bloque y no se
  tocan: arreglarlas implicaría cambiar qué exporta `export-demos.ts` para
  las fixtures, fuera del alcance de este bloque. `apps/api` y
  `@weblead/website-generator` typecheck en verde por separado.
- `pnpm build` (raíz) → igual: todos los paquetes `Done` excepto
  `apps/demo-platform`, que falla por los mismos 2 errores TS2353
  preexistentes (su build empieza con `tsc --noEmit`).
- Servidores de verificación: API propia en `:4000` (reiniciada tras el
  rebuild del generador) y demo-platform en `:5174` (instancia ya en marcha
  desde las 20:25 de otro proceso paralelo, sirviendo el mismo árbol).
  Ambos detenidos al final del bloque solo en lo que respecta a la API
  propia; la instancia `:5174` no es de este bloque y no se toca.

## 6. Limitaciones y pendientes

- Hidrorioja sigue APPROVED con auditoría `content-only` (ver §1, *); sin
  re-auditoría Playwright en este bloque (el endpoint la bloquea en
  APPROVED).
- `pnpm typecheck` / `pnpm build` no están en verde por los 2 errores
  TS2353 preexistentes en `apps/demo-platform` (fixtures Fase E, ver §5).
  Pendiente de decisión del coordinador: si las fixtures deben seguir
  exportándose a la demo-platform o excluirse del export.
- La API importa los paquetes workspace desde `dist/` (no `src/`): tras
  editar un paquete hay que reconstruirlo y reiniciar la API (ver §3,
  intento 2 de Nuria).
- Nada desplegado (ni Oracle ni Vercel), 0 emails enviados, 0 push a GitHub
  (commit local de este bloque, ver `git log`).
