# WebLead AI — Fase F: comparativa de proveedores (medido, 2026-11-16)

Comparativa del coste por empresa del Researcher con los créditos YA
existentes de Jon. Método: conteo real de llamadas del flujo actual
× precio unitario publicado. **No se hizo ninguna llamada en vivo a
Serper ni a Exa**: en esta VM no existe conector ni clave de ninguno de
los dos (verificado por búsqueda en el workspace: solo menciones en
MEMORY.md; las claves viven en el servidor Oracle, en /opt/nexus/.env,
y no se extrajeron — no había autorización para ello). Lo medido es el
número de llamadas; el precio unitario es de lista pública, con fuente
y fecha. Re-confirmar en la página del proveedor antes de presupuestar.

## 1. Llamadas reales por empresa (medido, no estimado)

Fuente: run log de la Fase A (`docs/feasibility.md` §2): **29 búsquedas
para 26 empresas** = 4 de discovery (2 por sector) + 25 de verificación
individual (1 por empresa, por nombre).

Muestra acotada (máx. 10, según el encargo): los 10 leads ≥ 70.

| Empresa | Búsquedas de verificación (Fase A) |
|---|---|
| Fontanería la Moderna | 1 (fontaneriaelrayo.es + Exa Places) |
| Santiago Ferrer Fontanería en General SL | 1 (eInforma + Exa Places) |
| Fontanería Chuchi | 1 (búsqueda web) |
| Hidrorioja SC | 1 (Cylex + Exa Places) |
| Expert Fontaneros Logroño | 1 (buscafontaneros.com) |
| Begoña Ruiz Peluquería | 1 (mispelus.com + directorios) |
| Avalon Stilistas | 1 (búsqueda web) |
| Lumberjack Barbershop | 1 (Booksy + Exa Places) |
| Star Barber Shop | 1 (Exa Places) |
| Peluquería Nuria | 1 (búsqueda web) |
| **Discovery compartido (2 sectores)** | **2** |
| **Total muestra (10 empresas)** | **12 búsquedas = 1,2 por empresa** |

El Researcher en código (`packages/agent-researcher`) no llama a
ninguna API de búsqueda: la evidencia llega estructurada (seed del
piloto o cuerpo de la llamada). El conteo de arriba es el del flujo
manual que el Researcher automatizaría 1:1 con Serper/Exa.

## 2. Precios unitarios publicados (verificados 2026-11-16)

| Proveedor | Precio unitario | Fuente y fecha |
|---|---|---|
| Serper | **1 crédito por búsqueda** (≤ 10 resultados); 2.500 créditos gratis una sola vez, sin tarjeta; después $50 / 50.000 créditos = **$1,00 / 1.000 búsquedas**; créditos de pago caducan a los 6 meses | serper.dev vía startupperks.co / coldiq.com / everyinfra.com, leído 2026-11-16 (varias fuentes coincidentes; no verificado en la propia página de Serper) |
| Exa `/search` Lite | **$4 / 1.000 requests** ($0,004 por búsqueda, hasta 10 resultados con texto incluido) | exa.ai pricing vía crustdata.com (16 oct 2026), twitterapi.io, stork.ai (10 nov 2026) |
| Exa `/search` Auto/Fast | **$7 / 1.000 requests** ($0,007 por búsqueda) | mismas fuentes |
| Exa Deep | $12–15 / 1.000 | mismas fuentes (no necesario para el Researcher) |
| Vercel AI Gateway `openai/gpt-4o-mini` | **$0,15 / 1M tokens de entrada, $0,60 / 1M de salida**; sin markup de la Gateway | vercel.com/ai-gateway/models/gpt-4o-mini + LiteLLM, leído 2026-11-16 |

Saldos de Jon (captura tabla Créditos NEXUS, 2026-11-16; la fila xAI
está desactualizada, manda console.x.ai — no se toca la BD de NEXUS):

| Proveedor | Saldo restante | Total |
|---|---|---|
| Serper | **2.382 créditos** (usados 118) | 2.500 (one-time, no mensual) |
| Exa | **19,013 USD** (usados 0,987) | 20 USD (prepago) |
| Vercel AI Gateway | **4,999 USD** (usados 0,001) | 5 USD/mes, crédito gratuito mensual (lo no usado no se acumula) |
| Top Tools AI Basic | 10M tokens/día (free tier) | medido 0,00 USD |

## 3. Coste por empresa (12 búsquedas / 10 empresas = 1,2 búsquedas/empresa)

| Ruta | Búsqueda / empresa | LLM resumen / empresa | Total / empresa | Saldo restante tras 10 empresas |
|---|---|---|---|---|
| **Serper + Top Tools Basic** | 1,2 créditos (saldo gratis) | 0,00 USD (medido) | **0,00 USD en efectivo; 1,2 créditos gratis** | Serper 2.382 → 2.370 |
| Serper (post-gratis) + Top Tools | $0,0012 | 0,00 USD | **$0,0012** | — (top-up mínimo $50) |
| **Exa Lite + Top Tools** | $0,0048 | 0,00 USD | **$0,0048** | Exa 19,013 → 19,012,952 USD |
| Exa Auto + Top Tools | $0,0084 | 0,00 USD | **$0,0084** | Exa 19,013 → 19,012,916 USD |
| Serper + Vercel Gateway gpt-4o-mini | 1,2 créditos | $0,00008 (estimado, ver §4) | **$0,00008 en efectivo** mientras duren los saldos gratis | Serper 2.370; Gateway 4,999 → 4,9982 USD |

Escala (mismo ratio 1,2 búsquedas/empresa):

| Empresas | Serper (créditos) | Exa Lite (USD) | Exa Auto (USD) |
|---|---|---|---|
| 10 | 12 | $0,048 | $0,084 |
| 100 | 120 | $0,48 | $0,84 |
| 1.000 | 1.200 | $4,80 | $8,40 |
| 1.985 | 2.382 (saldo gratis agotado) | $9,53 | $16,67 |

El saldo gratis de Serper cubre **~1.985 empresas** a este ratio;
después, el top-up mínimo es $50 (50.000 créditos, 6 meses de
validez). El saldo Exa cubre ~3,96 M de búsquedas Lite (~3,3 M de
empresas): no es el límite.

## 4. Coste LLM por expediente (tokens medidos × precio de lista)

Tokens medidos reales (Top Tools Basic): resumen Fase A **201,25
tokens/expediente** de media (prompt 93,25 + completion 108);
tareas de agente Fase B 237 tokens de media; borradores de diseño
Fase D 328,5 tokens/demo.

| Proveedor LLM | Coste por resumen (201 tokens) | Coste por tarea agente (237 tokens) |
|---|---|---|
| Top Tools AI Basic | **0,00 USD medido** (14 llamadas, 3.375 tokens acumulados; confirmado null: el proveedor no devuelve precio) | 0,00 USD medido |
| Vercel AI Gateway gpt-4o-mini (estimado, NO medido en vivo) | 93,25 × $0,15/1M + 108 × $0,60/1M = **$0,00008** | ~87 × $0,15/1M + 150 × $0,60/1M ≈ **$0,00010** |
| xAI grok | NO MEDIBLE: saldo $0,00 — **fuera definitivamente hasta nuevo aviso (decisión de Jon 2026-11-16 21:27: SIN recarga)** | — |

Con el saldo Gateway de 4,999 USD caben ~63.000 resúmenes a
$0,00008. **La búsqueda cuesta 15–100× más que el LLM por empresa**:
el LLM no es el factor limitante; el discovery sí (igual que en Fase A).

## 5. Recomendación por tarea

| Tarea | Proveedor recomendado | Motivo |
|---|---|---|
| Discovery por sector/provincia | **Serper** | 1 crédito/búsqueda; SERP de Google = misma fuente que el flujo manual actual; no toca Maps (sin problema §3.2.3); saldo gratis cubre ~1.985 empresas |
| Verificación por empresa (nombre, web, teléfono, fecha de actividad) | **Serper** (1ª fuente) + **Exa Lite** (2ª fuente, cuando haga falta) | Serper da el SERP; Exa Lite añade texto/highlights en la misma llamada ($0,004) y sirve como fuente independiente para la regla de 2 fuentes del Researcher |
| Exa Places | Solo verificación puntual en vivo | Misma restricción §3.2.3 que Places: solo Place IDs almacenables; nunca base de leads desde Places |
| Resumen/clasificación LLM | **Top Tools AI Basic** (primario, medido 0,00 USD) | Único operativo y medido; 201 tokens/expediente |
| LLM fallback | **Vercel AI Gateway gpt-4o-mini** (estimado $0,00008/expediente) | Coste despreciable; **integración NO construida ni probada en vivo en este repo** — pendiente: conector + medición real con la clave del Gateway (no pedida, no copiada) |
| Generación de webs / auditoría LLM | Top Tools Basic | Borradores Fase D medidos (657 tokens / 2 demos, 0,00 USD) |
| xAI / grok | NO USAR hasta recarga aprobada por Jon | Saldo $0,00 (console.x.ai 2026-11-16) |
| Apify | NO USADO en esta fase — **crédito de 5 USD NO caduca (confirmado por Jon 2026-11-16 21:27)**; se puede evaluar sin prisa por la fecha | Google Maps Scraper descartado por base legal en Fase C; Search/Content Crawler solo con aprobación |
| Groq | **PENDIENTE DE REGISTRO (2026-11-16 21:27)** — Jon tiene clave de inferencia; flujo seguro custom.groq enviado, sin registrar aún en esta VM (no existe `custom.groq`, verificado). Cuando exista la conexión: crear connector doc, verificar con GET /v1/models + chat corta, y añadir su modelo gratuito medido a esta comparativa. NO pedir la clave en chat. | Primer candidato (§3 instrucciones); sin conector aún |
| OpenRouter | NO USAR (sin claves) | Sin claves; saldo 0,91/10 USD |

## 6. Limitaciones (sin adornar)

1. **Sin llamadas en vivo a Serper ni Exa**: sin conector ni clave en
   esta VM; las claves viven en Oracle y no se extrajeron. El coste
   por empresa es conteo real de llamadas × precio de lista, no una
   medición de API. Una medición en vivo exigiría la clave de Serper
   por el flujo seguro (o una clave nueva de Exa) y 12 llamadas reales.
2. Precios de lista de fuentes secundarias coincidentes (Serper y Exa),
   no verificados en la propia página del proveedor: re-confirmar
   antes de presupuestar o de agotar el saldo gratis.
3. El ratio 1,2 búsquedas/empresa es el del piloto manual de Logroño;
   empresas con datos conflictivos (Ferrer: 2 direcciones) o sin
   rastro pueden exigir 2–3 búsquedas. El ratio es un suelo, no un techo.
4. Serper: los 2.500 créditos gratis son one-time, no mensuales; el
   top-up mínimo post-gratis es $50. Exa: saldo en USD prepago; no se
   verificó caducidad del saldo.
7. **Respuestas de Jon 2026-11-16 21:27 aplicadas**: Apify 5 USD NO
   caduca (evaluar sin prisa, gate legal intacto); xAI SIN recarga —
   grok fuera definitivamente hasta nuevo aviso y excluido de todo
   fallback (el registro ya lo marcaba no operativo; verificado que
   `createOperationalFallback` solo encadena operativos); Groq
   pendiente de registro (flujo seguro enviado, conector aún no
   existe); **no contactar con Ferrer, Begoña Ruiz ni Hidrorioja
   hasta que Jon decida la base legal/canal** — las demos siguen
   APPROVED y Sales bloqueado por el gate LSSI.
5. Vercel AI Gateway: precio estimado desde tokens medidos × lista
   pública; sin llamada real, sin conector en el repo.
6. No se midió el coste de generar una web completa con LLM (los
   borradores Fase D son resúmenes de diseño, no webs enteras).
