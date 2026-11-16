# WebLead AI — Fase E: Comercial (Sales + CRM) — informe §12 (2026-11-16)

Alcance: solo Sales Agent + CRM (nueva Fase E del plan A–F; antiguas
Fases 4 Sales + 5 CRM). Nada de despliegue en Oracle/Vercel, nada de
envío de emails, nada de pago. Puerta: Fase D (2 demos APPROVED con
auditoría Playwright 100/100/100/100: Santiago Ferrer y Begoña Ruiz).

## 1. Funcionalidades implementadas

- **Sales Agent** (`packages/agent-sales`):
  - Pricing configurable (`PriceConfiguration` en Postgres, fila
    `default-v1` sembrada por `prepareSales` si falta): complejidad,
    páginas, diseño, logo, imágenes, formularios, reservas,
    integraciones, SEO, mantenimiento, hosting y dominio como líneas
    configurables; 3 modalidades BASIC (490 €) / PRO (990 €) /
    PREMIUM (1.990 €). **Los precios por defecto son SOLO valores de
    ejemplo, marcados como no definitivos en cada propuesta** (`isIndicative:
    true` + disclaimer en cada quote): sin validación no hay oferta.
  - `CommercialProposal` por empresa APPROVED a partir de su demo y su
    expediente (modalidad, importe orientativo, demo slug/URL, decisión
    legal, `isIndicative`).
  - Email personalizado **SOLO como borrador LOCAL** (`EmailDraft` en
    Postgres + `GET /api/drafts/:id`): no existe ninguna llamada de envío
    en todo el repo. El cuerpo puede pulirlo el LLM (Top-Tools-Ai-Basic)
    pero se valida contra afirmaciones prohibidas (precios, 24h,
    superlativos, años de experiencia, testimonios, garantías) y si se
    rechaza se usa el texto determinista.
  - Clasificación de respuestas en las 8 categorías del prompt
    (INTERESTED, REQUEST_PRICE, REQUEST_INFORMATION, NEGOTIATION,
    NOT_INTERESTED, UNSUBSCRIBE, COMPLAINT, OTHER) con respuestas
    sugeridas que **nunca** hacen compromisos económicos automáticos
    (ni precios, ni descuentos, ni contratos: todo vuelve a aprobación
    humana; UNSUBSCRIBE/COMPLAINT confirman siempre la baja).
- **Gate legal LSSI** (parte central, `checkLegalBasis`): antes de
  preparar cualquier borrador comprueba, en este orden, baja/oposición
  (`ContactSuppression`), existencia de correo, y base jurídica
  (CONSENT o EXISTING_RELATIONSHIP, excepción LSSI art. 21). **Un
  correo público NO equivale a autorización**; el interés legítimo por
  sí solo se registra como insuficiente y bloquea. Sin base válida:
  oportunidad interna + propuesta interna + contacto no autorizado +
  NO borrador. El panel muestra el estado legal por empresa.
- **Gmail** (`packages/integrations/src/gmail.ts` + `docs/gmail-setup.md`):
  integración OAuth preparada con permisos mínimos documentados
  (`gmail.readonly` + `gmail.compose` para borradores; deliberadamente
  SIN `gmail.send`), **sin conectar ninguna cuenta real y sin
  credenciales**: el stub devuelve `not_connected` con honestidad
  (`GET /api/gmail/status`) y se niega a actuar. La guía deja los pasos
  para Jon, los scopes, y el checklist de lo que falta (proyecto GCP,
  credenciales OAuth solo en `.env`, endpoint de callback futuro,
  almacenamiento seguro de tokens).
- **CRM** (`packages/agent-crm`): pipeline con los **13 estados exactos**
  del prompt (NEW, QUALIFIED, DEMO_CREATED, AUDITED, PROPOSAL_READY,
  AWAITING_APPROVAL, CONTACTED, RESPONDED, INTERESTED, NEGOTIATION,
  CUSTOMER, LOST, SUPPRESSED), derivados del estado del Orchestrator +
  propuestas/borradores/bajas (sin segunda fuente de verdad que derive).
  Histórico completo de interacciones (`CRMActivity`: PROPOSAL, DRAFT,
  APPROVAL, REMINDER, SUPPRESSION, ...), recordatorios (borrador
  aprobado sin enviar, vencimiento +7 días), estadísticas (conversión
  por estado) y gestión de bajas: SUPPRESSED bloquea cualquier borrador
  futuro (el gate lo comprueba primero; test unitario + verificación
  en vivo). **CONTACTED queda documentado como inalcanzable en esta
  fase**: implica un envío real y no se envía nada; el flujo termina en
  SALES_APPROVED con borrador listo.
- **API** (`apps/api`): `POST /api/sales/prepare` (APPROVED →
  SALES_PENDING o bloqueo documentado), `POST /api/sales/approve`
  (aprobación humana, SALES_PENDING → SALES_APPROVED, sin envío),
  `GET /api/drafts/:id`, `POST /api/sales/classify` (8 categorías +
  respuesta sugerida), `GET /api/crm/pipeline` (filas + estadísticas +
  recordatorios), `POST /api/crm/suppress`, `GET /api/crm/business/:id`
  (historial), `GET /api/gmail/status`.
- **Dashboard**: sección comercial con pipeline CRM, propuestas,
  estados legales y recordatorios; cabecera y pie actualizados a Fase E.
- **Migración Prisma** `20261116200637_fase_e_sales_crm`: `EmailDraft`
  suma `legalBasis`/`legalReason`; `CRMActivity` suma `dueAt`.

## 2. Archivos creados o modificados

| Archivo | Cambio |
|---|---|
| `packages/agent-sales/src/index.ts` | Reescrito: pricing, gate LSSI, borrador, clasificador 8/8, `prepareSales`, `approveDraft`. |
| `packages/agent-sales/test/sales.test.ts` | Nuevo. 30 tests. |
| `packages/agent-sales/package.json`, `README.md` | Dep `@weblead/database`; README Fase E. |
| `packages/agent-crm/src/index.ts` | Reescrito: pipeline 13 estados, stats, recordatorios, `suppressContact`, `logCrmActivity`. |
| `packages/agent-crm/test/crm.test.ts` | Nuevo. 22 tests. |
| `packages/agent-crm/package.json`, `README.md` | Dep `@weblead/database`; README Fase E. |
| `packages/integrations/src/gmail.ts` | Nuevo: stub Gmail `not_connected` + scopes mínimos. |
| `packages/integrations/src/index.ts` | Exporta gmail; panel: gmail (stub Fase E), xAI (saldo $0.00 + desglose 3 claves + discrepancia NEXUS), OpenRouter (0,91/10 USD), Top Tools AI (discrepancia tracking), nuevos Serper, Exa, Vercel AI Gateway, Google AI Studio. |
| `packages/integrations/README.md` | Actualizado (16 entradas, Gmail stub). |
| `packages/database/prisma/schema.prisma` | `EmailDraft.legalBasis/legalReason`, `CRMActivity.dueAt`. |
| `packages/database/prisma/migrations/20261116200637_fase_e_sales_crm/` | Nueva migración. |
| `packages/ai-engine/src/index.ts` | xAI: saldo $0.00 + desglose por clave (8jb0/IGKt/4mXW); credencial 400 NO es la clave NEXUS. |
| `packages/ai-engine/test/fallback.test.ts` | 3 tests nuevos: xAI fuera del fallback, nota con $0.00 y sufijos, ningún agente usa grok. |
| `apps/api/src/index.ts` | Endpoints Fase E; `/health` phase `E-commercial`. |
| `apps/api/package.json` | Deps sales/crm/integrations; script `seed:verification-e`. |
| `apps/api/src/seed-verification-e.ts` | Nuevo: 2 fixtures sintéticas APPROVED + demo + permiso simulado (ver §4). |
| `apps/dashboard/src/App.tsx` | Sección comercial (pipeline, estados legales, recordatorios); Fase E. |
| `docs/gmail-setup.md` | Nuevo: pasos OAuth para Jon, scopes, checklist. |
| `docs/architecture.md` | §8 CERRADO (30 citadas / 31 nombres, todas en Prisma); xAI con desglose por clave; inventario de créditos 2026-11-16 (tabla + 2 discrepancias); mapa de fases: Fase E cerrada. |
| `docs/master-prompt-v1.md` | §8 cerrado + matiz 30/31. |
| `docs/search-providers.md` | Serper (candidato principal) y Exa con saldos; pendiente medir coste/empresa. |
| `fase-e/llm-draft-tta.py`, `fase-e/llm-draft-tta.json` | Nuevos: 1 llamada real Top-Tools-Ai-Basic (borrador, aceptado, 0 violaciones). |
| `docs/phase-e-report.md` | Nuevo. Este informe. |
| `pnpm-lock.yaml` | Nuevas deps workspace. |

## 3. Pruebas realizadas (comando + resultado exacto)

- `pnpm build` (global): **verde, exit 0**.
- `pnpm typecheck` (global): **verde, exit 0**.
- `pnpm test`: **144 passed (10 ficheros), 0 failed** — antes 91; **53 nuevos**:
  sales 30 (pricing por modalidad, gate legal bloqueando correo público
  sin base y suppressed, clasificación 8/8, transiciones
  SALES_PENDING/SALES_APPROVED, borrador determinista vs LLM rechazado),
  crm 22 (mapeo 13 estados, stats de conversión, recordatorios,
  suppress idempotente), ai-engine 3 (xAI fuera del fallback). Un fallo
  intermedio fue una expectativa errónea del propio test de conversión
  (NEW no cuenta como ≥ QUALIFIED), corregido en el test, no en el código.
- **API en vivo** (http://localhost:4000, Postgres real):
  - `GET /health` → `{"status":"ok","phase":"E-commercial"}`.
  - `GET /api/gmail/status` → `not_connected`, scopes readonly + compose, `canSend: false`.
  - `POST /api/sales/prepare` Ferrer (pilot 6) → `blocked: true`,
    `reasonCode: NO_LEGAL_BASIS`, `draftId: null`, propuesta interna PRO
    990,00 € (orientativos), estado sigue APPROVED.
  - `POST /api/sales/prepare` Begoña (pilot 17) → `blocked: true`,
    `reasonCode: NO_EMAIL`, `draftId: null`, propuesta interna PRO.
  - Fixture A: `POST /api/sales/prepare` (llmBody + llmUsage reales) →
    `blocked: false`, `statePath: [APPROVED, SALES_PENDING]`,
    `draftId: e5ac4b08-…`, `decision.basis: EXISTING_RELATIONSHIP`,
    `llmRejected: []`.
  - `GET /api/drafts/e5ac4b08-…` → status DRAFT, legalBasis
    EXISTING_RELATIONSHIP, cuerpo LLM aceptado.
  - `POST /api/sales/approve` → SALES_APPROVED, recordatorio con
    vencimiento 2026-11-23.
  - `POST /api/crm/suppress` fixture B (UNSUBSCRIBE) → 201; su
    `POST /api/sales/prepare` posterior → `blocked: true`,
    `reasonCode: SUPPRESSED`, `draftId: null`.
  - `POST /api/sales/classify` × 8 ejemplos → **8/8 correctos**.
  - `GET /api/crm/pipeline` → 12 empresas; stats: QUALIFIED 8, AUDITED 2,
    AWAITING_APPROVAL 1, SUPPRESSED 1, CONTACTED 0; conversión
    qualified 91,7 %, audited 25 %, awaitingApproval 8,3 %, customer 0 %;
    1 recordatorio (fixture A, vence 2026-11-23).
  - `GET /api/crm/business/<fixture A>` → 4 actividades (PROPOSAL,
    DRAFT, APPROVAL, REMINDER), 1 propuesta, 1 borrador, 0 bajas.
- **Dashboard en vivo** (preview del build, http://localhost:5173):
  HTTP 200 sirviendo el build con la sección comercial. El render
  cliente de la sección no se verificó en navegador (sin browser en
  esta VM): build + tipos en verde y datos del endpoint verificados.
- **Migración**: `prisma migrate dev --name fase_e_sales_crm` →
  "Your database is now in sync with your schema." La BD ya contenía
  las 10 Business APPROVED/QUALIFIED de Fase D (sin restauración: el
  clúster sobrevivió esta vez; la consulta inicial falló solo por el
  case de las tablas Prisma, no por BD vacía).

## 4. Resultados: verificación con empresas reales del piloto

| Empresa | Gate legal | Resultado |
|---|---|---|
| Santiago Ferrer Fontanería en General SL (6, APPROVED, email público sanfefo@terra.com) | NO_LEGAL_BASIS: correo público ≠ autorización, sin consentimiento ni relación | Propuesta interna PRO 990 € (orientativos, no definitivos); **sin borrador**; sigue APPROVED |
| Begoña Ruiz Peluquería (17, APPROVED, sin email) | NO_EMAIL: no hay destinatario | Propuesta interna PRO 990 € (orientativos); **sin borrador**; sigue APPROVED |
| Fixture A (sintética, permiso simulado EXISTING_RELATIONSHIP, @example.invalid) | OK | Propuesta PRO + borrador local (texto LLM aceptado) → APPROVED → SALES_PENDING → SALES_APPROVED, recordatorio 2026-11-23 |
| Fixture B (sintética, suprimida en vivo UNSUBSCRIBE) | SUPPRESSED | Propuesta interna BASIC; **sin borrador** |

- **El gate funcionó como diseñado**: las dos empresas reales quedan
  bloqueadas con el motivo documentado, y el flujo completo solo se
  verificó con una fixture sintética claramente marcada, sin inventar
  consentimiento a ninguna empresa real.
- **Nada enviado**: 0 emails enviados, 0 llamadas a Gmail API de envío
  (no existe el código para hacerlo), Gmail `not_connected`.

## 5. Servicios externos utilizados

- **Top Tools AI** (`Top-Tools-Ai-Basic`, único proveedor operativo):
  1 llamada chat real, 226 tokens (127+99), latencia 8,65 s, HTTP 200.
  Coste estimado 0,00 USD; confirmado null (la API no devuelve precio).
  Registrado en `UsageRecord` (servicio `fase-e-sales-draft`) y en
  cost-control (`GET /api/costs/summary`: sales 2 peticiones — 1 Fase B
  + 1 Fase E —, estimado 0, confirmado null).
- **PostgreSQL 16 local** (`weblead_dev`): persistencia real (4
  CommercialProposal, 1 EmailDraft, 1 PriceConfiguration, 8 CRMActivity,
  1 ContactSuppression, 1 UsageRecord Fase E).
- **xAI / Grok: NO usado.** Ver §7.

## 6. Costes reales / estimados (separados)

| Concepto | Real | Estimado |
|---|---|---|
| LLM Fase E (1 borrador, Top-Tools-Ai-Basic, 226 tokens) | — (proveedor sin precio) | 0,00 USD |
| LLM acumulado proyecto (14 llamadas cost-control: 3.375 tokens) | — | 0,00 USD; confirmado null |
| Gmail / Postgres local / resto | 0,00 USD | — |
| Apify / Google Places / APIs de pago | 0,00 USD (nada consumido) | — |

Límite efectivo de gasto sigue en **0 €**; solo corre el tier gratuito
verificado (Top-Tools-Ai-Basic).

## 7. Actualización de proveedor xAI (capturas de Jon, 2026-11-16 21:04)

- Saldo de cuenta **$0.00** (vista 30 días: uso $5.78, 7.088.187 tokens,
  798 requests; el crédito inicial de 5 USD está gastado entero).
- Desglose por clave (solo sufijos): `hermes` (xai-...8jb0) $4.84/30d,
  último uso hace 57 min — mayor gasto, proyecto no identificado;
  `NEXUS` (xai-...IGKt) $0.15/30d, último uso hace 6 días — la clave de
  NEXUS en Oracle EXISTE y está activa, gasta poco; `nexus-credits`
  (xai-...4mXW) sin gasto — management key (Billing: Read).
- La credencial registrada en esta VM que da 400 `Incorrect API key
  provided` **NO es la clave NEXUS**.
- **Discrepancia**: NEXUS dice 4,09/4,21 USD (usados 0,12) pero
  console.x.ai dice $0,00 y uso $5,78 — **manda la consola**; la fila
  NEXUS está desactualizada/errónea. NO se corrige la BD de NEXUS desde
  WebLead (trabajo del hilo NEXUS).
- Consecuencia: grok no usable hasta recarga de pago (solo con
  aprobación expresa de Jon); si recarga, la clave NEXUS debería
  funcionar. Verificado en código y tests: `operationalProviderNames()`
  es `['top-tools-ai']`, xAI queda fuera del fallback y ningún agente
  usa grok por defecto — un fallo de grok nunca bloquea el flujo.

## 8. Cierres del usuario aplicados en esta fase (2026-11-16 21:08)

1. **Pendiente §8 CERRADO**: Jon confirma que el resto literal del
   prompt tras "UUID" NO existe. Cerrado en `docs/master-prompt-v1.md`
   y `docs/architecture.md`: la BD se construye con las entidades
   listadas en §8 + el segundo documento. Matiz de conteo, con
   honestidad: el encargo cita "30 entidades", pero los nombres listados
   son **31 (30 citadas / 31 nombres contados) y las 31 están
   implementadas en Prisma**. No se volverá a pedir.
2. **Inventario de créditos de Jon** (captura NEXUS, 2026-11-16):
   incorporado a `docs/architecture.md` (§7, tabla completa),
   al panel (Serper, Exa, Vercel AI Gateway, Google AI Studio nuevos;
   OpenRouter 0,91/10 USD casi agotado; xAI con discrepancia; Top Tools
   AI con discrepancia de tracking) y a `docs/search-providers.md`
   (Serper candidato principal, Exa segundo). Sin buscar ni copiar
   ninguna clave. Google Flow, Magic Hour y Puter: excluidos del panel
   (no relevantes / no para agentes), solo mencionados en architecture.md.
   **Discrepancia Top Tools AI**: NEXUS muestra 10M/10M con 0 usados
   (filas manuales, no sincronizadas) pero la Fase A ya gastó 805 tokens
   reales por otra vía: los 10M no se presentan como intactos.

## 9. Limitaciones detectadas

1. Las 2 empresas APPROVED reales no tienen base legal para email
   comercial: sin consentimiento o relación documentada no habrá
   borrador para ellas hasta que Jon aporte la base (o decida otro
   canal). Es el resultado correcto del gate, no un fallo.
2. El flujo feliz en vivo se verificó con una fixture sintética (permiso
   simulado, correo @example.invalid): no es evidencia sobre una empresa
   real, y así queda marcado en la BD y en este informe.
3. Gmail sin conectar: borradores solo locales; leer respuestas reales
   y crear borradores en Gmail requieren el OAuth de Jon
   (docs/gmail-setup.md).
4. El clasificador de respuestas es por palabras clave (determinista,
   8/8 en ejemplos): no es un modelo; respuestas ambiguas caerán en
   OTHER y deberán revisarse a mano.
5. El render cliente de la sección comercial del dashboard no se
   verificó en navegador (sin browser en esta VM); build y tipos en
   verde, endpoint verificado.
6. Los servidores de verificación (API :4000, dashboard preview :5173)
   se detuvieron al final de la fase; no queda ninguno corriendo.

## 10. Tareas pendientes

- **Para Jon (preguntas, no acciones)**: (1) ¿Recargar xAI? (pago; sin
  recarga grok sigue fuera; la clave NEXUS debería funcionar tras
  recargar). (2) Conectar Gmail OAuth (docs/gmail-setup.md). (3) ¿Aportar
  base legal (consentimiento/relación) para Ferrer/Begoña, o canal
  alternativo? (4) Medir coste por empresa con Serper (candidato
  principal Researcher) y Exa antes de escalar. (5) Cola §8: cerrada,
  no reabrir.
- Fase F (Optimización) según el plan A–F.
- Endpoint `/api/gmail/oauth/callback` + tokens seguros + crear borrador
  real en Gmail desde un EmailDraft aprobado (futuro, tras el OAuth).
- Leer respuestas reales de Gmail y clasificarlas (el clasificador ya
  existe y está probado con 8 ejemplos).
- Decidir host de producción de la demo-platform (sitemap en
  localhost:5174, pendiente desde Fase D).
- Reconectar Groq / OpenRouter / CoArena / Vercel AI Gateway / Gemini
  como fallback real (hoy todo descansa en Top-Tools-Ai-Basic).
- Generar demos para los 8 leads QUALIFIED restantes cuando se decida.
- Backup diario de Postgres con restauración probada (pendiente desde
  Fase D; el clúster local no sobrevive a reemplazos de VM).

## 11. Instrucciones para continuar

```bash
cd ~/workspace/weblead-ai
# Si la VM se ha reiniciado y Postgres no responde: pg_ctlcluster 16 main start;
# si el clúster está vacío, recrear rol+BD desde .env y aplicar migraciones:
pnpm --filter @weblead/database exec prisma migrate deploy
pnpm --filter @weblead/api seed:research
pnpm --filter @weblead/api generate:designs
# Fixtures de verificación Fase E (sintéticas, idempotentes):
pnpm --filter @weblead/api seed:verification-e
# API + dashboard en vivo:
pnpm --filter @weblead/api dev          # http://localhost:4000
pnpm --filter @weblead/dashboard dev    # http://localhost:5173 (proxy /api -> :4000)
# Preparar propuesta (bloqueo documentado si no hay base legal):
curl -X POST http://localhost:4000/api/sales/prepare \
  -H 'Content-Type: application/json' -d '{"businessId":6,"modality":"PRO"}'
# Pipeline + estado legal:
curl http://localhost:4000/api/crm/pipeline
# Tests / tipos / build:
pnpm test && pnpm typecheck && pnpm build
```
