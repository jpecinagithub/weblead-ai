# WebLead AI — Informe final de validación (coordinador, 2026-11-16)

Verificación punta a punta realizada por el coordinador (no delegada) el 2026-11-16
~20:19 CET, tras el cierre de la Fase E. Comandos y resultados exactos abajo.

## 1. Estado del build

| Comando | Resultado |
|---|---|
| `pnpm build` | Verde, exit 0 (paquetes + dashboard + demo-platform) |
| `pnpm typecheck` (`tsc -p tsconfig.app.json` donde aplica) | Verde, exit 0 |
| `pnpm test` (Vitest) | **144 passed, 0 failed, 10 ficheros** |
| `git log` | 6 commits locales: `d8b8270` Fase 0, `6d8a60d` Fase B, `8d8af2b` Fase C, `e6227ac` Fase D, `afbffdc` Fase E (+ este informe) |

## 2. Flujo punta a punta (API en vivo :4000, Postgres real)

Empresa real del piloto: **Hidrorioja SC** (score 90, QUALIFIED) y
**Expert Fontaneros Logroño** (score 90, QUALIFIED).

| Paso | Evidencia |
|---|---|
| Hidrorioja: generate | `POST /api/websites/generate` → `PREVIEW_READY`, slug `hidrorioja-sc-logrono`, plantilla `fontaneria-climatizacion` |
| Hidrorioja: audit | `POST /api/audit/run` sin `demoUrl` → PASSED 100/100/100/100, runner **content-only**, estado APPROVED |
| Expert: generate | `POST /api/websites/generate` → `PREVIEW_READY`, slug `expert-fontaneros-logrono-logrono` |
| Expert: export + audit | `export:demos` (6 demos) → `POST /api/audit/run` con `demoUrl http://localhost:5174/demos/expert-fontaneros-logrono-logrono` → PASSED 100/100/100/100, runner **playwright**, capturas desktop (858 KB) y móvil (505 KB) en `docs/phase-d/screenshots/` |
| Sales prepare (reales) | Expert → bloqueado `NO_EMAIL`; Hidrorioja → bloqueado `NO_LEGAL_BASIS` (correo público ≠ autorización, LSSI art. 21). `draftId: null` en ambos. **0 emails enviados.** |
| Sales prepare (fixture sintética) | `VERIFICACIÓN FASE E — Empresa de prueba` (`@example.invalid`, permiso simulado) → `SALES_PENDING` + borrador `b28d0a40-…` → `POST /api/sales/approve` → `SALES_APPROVED`, recordatorio 2026-11-23, borrador APPROVED |
| Supresión | Fixture B suprimida → prepare bloqueado `SUPPRESSED` |
| Clasificación | `"Me interesa mucho, ¿cuánto cuesta la web?"` → `REQUEST_PRICE` + respuesta sugerida sin compromiso económico |
| Transición ilegal | `SALES_APPROVED → WON` → 400 `Illegal business transition` (solo CONTACTED permitido) |
| Re-prepare | Sobre `SALES_APPROVED` → 409 (espera APPROVED) |
| Gmail | `GET /api/gmail/status` → `not_connected`, `canSend: false` |
| Proveedores | `GET /api/providers` → solo `top-tools-ai` operativo; resto no disponibles |

**Matiz importante:** la auditoría de Hidrorioja fue *content-only* (sin `demoUrl`),
así que su 100 técnico no incluye comprobación en navegador. La auditoría Playwright
real quedó demostrada con Expert (y con Ferrer/Begoña en Fase D). El endpoint solo
ejecuta Playwright cuando se pasa `demoUrl`; sin él no finge una auditoría técnica.

## 3. Números del piloto (Fase A, recomputados por el coordinador)

26 empresas (Logroño, 13 fontanería/climatización + 13 peluquerías/barberías);
10 sin web propia verificada (38,5 %); 10 con score ≥ 70 (38,5 %);
actividad CONFIRMED 11 / PROBABLE 15 / UNVERIFIED 0 / INACTIVE 0; media 61,15.
Veredicto: **GO con alcance recortado** (solo Logroño, solo los 10 leads ≥ 70).

## 4. Coste medido (acumulado, estimado vs confirmado separados)

| Concepto | Estimado | Confirmado |
|---|---|---|
| LLM total: 14 llamadas, 3.375 tokens (Top-Tools-Ai-Basic) | 0,00 USD | null (el proveedor no devuelve precio) |
| Resto (despliegues, envíos, Apify, Places) | 0,00 € | — |

Límite efectivo de gasto: **0 €** (presupuesto de referencia 30 €/mes sin aprobar).
Ningún crédito consumido: Apify 0,00 USD; Places/APIEmpresas sin llamadas.

## 5. Estado de proveedores (2026-11-16)

- **Top Tools AI Basic**: único operativo (medido en Fases A, B, D, E).
- **xAI / grok**: FUERA. Saldo $0,00 (uso $5,78, 7.088.187 tokens, 798 requests,
  verificado por Jon en console.x.ai). 3 claves: hermes (…8jb0, $4,84/30d, proyecto
  no identificado), NEXUS (…IGKt, $0,15/30d, existe y activa), nexus-credits
  (…4mXW, management key sin gasto). La credencial 400 de este entorno NO es la
  clave NEXUS. Si Jon recarga, la clave NEXUS debería funcionar.
- **CoArena**: revocada (401). **Groq**: sin clave de inferencia (solo "Audio to Text").
  **OpenRouter**: sin claves; saldo 0,91/10 USD, casi agotado.
- **Discrepancia xAI**: NEXUS dice 4,09/4,21 USD; manda la consola ($0,00).
  NO se corrige la BD de NEXUS desde WebLead (trabajo del hilo NEXUS).
- **Discrepancia Top Tools**: NEXUS dice 0 tokens usados, pero la Fase A gastó
  805 tokens reales por otra vía (filas manuales, no sincronizadas).
- **Créditos de Jon** (NEXUS 2026-11-16): Serper 2.382/2.500 (candidato principal
  Researcher, pendiente medir coste/empresa), Exa 19,013/20 USD, Vercel AI Gateway
  4,999/5 USD (LLM alternativo viable), Gemini pendiente de verificar, Puter
  991,99/1.000 (no para agentes), Flow/Magic Hour no relevantes.

## 6. Limitaciones y pendientes

1. **Sin fuente de discovery masivo conforme**: Apify Maps descartado por base legal
   (Google §3.2.3), Places igual de restringido, Overpass inaccesible desde esta VM.
   Discovery operativo: búsqueda web + directorios. Serper (2.382 créditos) es el
   candidato principal a evaluar; coste por empresa sin medir.
2. **Postgres local no sobrevive a reinicios/reemplazos de esta VM**: ocurrió en
   Fase C (clúster vacío) y Fase D (VM reemplazada, PostgreSQL 16 reinstalado desde
   caché apt). Hace falta backup diario con restauración probada. La siembra actual
   tiene 10 Business (Godoy REJECTED, puntual de Fase C, no está en la siembra).
3. **API sin persistencia de costes en memoria**: `usageStore` en memoria; las
   mediciones se pierden al reiniciar (persistencia Prisma pendiente, Fase F).
4. **Dashboard**: render cliente no verificado en navegador (sin browser en la VM);
   solo HTTP 200 y contenido del `dist`.
5. **Gmail OAuth sin conectar** (`docs/gmail-setup.md` con los pasos para Jon).
6. **Pendiente §8 CERRADO 2026-11-16**: no existe resto literal del prompt tras
   "UUID". BD con las entidades de §8 (30 citadas / 31 nombres contados, las 31
   en Prisma) + segundo documento. No volver a pedirlo.
7. **Preguntas abiertas para Jon**: ¿cuándo caduca el crédito Apify de 5 USD?
   ¿Recargar xAI? ¿Base legal o canal alternativo para Ferrer/Begoña/Hidrorioja?
   ¿Clave Groq de inferencia / clave nueva OpenRouter?
8. **Sin desplegar**: nada en Oracle ni en Vercel; el sitemap de demos usa
   `http://localhost:5174`; 8 leads QUALIFIED sin demo todavía.

## 7. Cómo continuar

```bash
cd ~/workspace/weblead-ai
# Si la VM se reinició: npm i -g pnpm@10.34.9; pg_ctlcluster 16 main start;
# si el clúster está vacío, recrear rol+BD desde .env:
pnpm --filter @weblead/database exec prisma migrate deploy
pnpm --filter @weblead/api seed:research
pnpm --filter @weblead/api generate:designs
pnpm --filter @weblead/api dev          # :4000
pnpm --filter @weblead/demo-platform dev # :5174
pnpm test && pnpm typecheck && pnpm build
```

Fase siguiente: **F** (Optimización): medir costes reales, comparar proveedores
(Serper, Exa, Vercel AI Gateway), persistir costes, backup diario de Postgres,
demos de los 8 QUALIFIED restantes, escalabilidad.
