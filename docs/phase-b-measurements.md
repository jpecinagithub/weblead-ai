# WebLead AI — Fase B: verificación de proveedores y medición por tarea (2026-11-16)

Alcance: solo integración y medición de proveedores de IA. Nada de Researcher/
Designer/Auditor/Sales/CRM funcionales, nada de despliegue, nada de emails,
nada de pago. Datos brutos: `fase-b/measurements-tta.json`; script:
`fase-b/measure-tasks-tta.py`.

## 1. Estado real de proveedores (verificado con llamada real, 2026-11-16)

| Proveedor | Estado | Evidencia (comando + resultado, sin secretos) |
|---|---|---|
| Top Tools AI | **OPERATIVO** | `top-tools-ai.py models` → 200, exactamente 3 modelos: `Top-Tools-Ai-Basic`, `Top-Tools-Ai-Pro`, `Top-Tools-Ai-Max`. 4 llamadas chat con Basic → 200. |
| xAI | **NO OPERATIVO — credencial inválida** | `xai.py models` → 400 `{"code":"invalid-argument","error":"Incorrect API key provided..."}`. Igual que en Fase A; una sola lectura, sin reintentos. |
| CoArena | **NO OPERATIVO — clave revocada** | `coarena.py limits` → 401 `Unauthorized` (HTTPError). Igual que en Fase A (`api_key_revoked`); una sola lectura, sin reintentos. |
| Groq | **PENDIENTE DE CREDENCIAL** | No existe conector ni helper de Groq en `~/workspace/custom-connectors/`. En NEXUS (`apps/api/src/seed.ts:123`) solo queda la clave "Audio to Text - Text to Audio" (creada 2026-10-06, último uso 2026-10-08): clave de audio, no de inferencia. No se llamó a Groq, no se creó cuenta. Pendiente de Jon. |
| OpenRouter | **SIN CLAVES** | No existe conector ni helper de OpenRouter. Las 4 claves fueron eliminadas el 2026-11-14 (caducadas); queda un saldo de 1,09 USD sin clave utilizable. No se llamó a OpenRouter. Pendiente de Jon. |

Mismos estados visibles en el panel "Configuración e integraciones" del
dashboard (`packages/integrations`, entradas nuevas: Top Tools AI, xAI,
CoArena; Groq/OpenRouter actualizados con fecha 2026-11-16) y en
`GET /api/providers`.

**Nombres de modelo Top Tools AI (actualizado también en el CONNECTOR.md del
proveedor):** los nombres viejos `Top-Tools-Ai` y `Kimi-K2.6` devuelven 400
`model_not_found`. Vigentes: `Top-Tools-Ai-Basic` / `Pro` / `Max`.
**Pro/Max NO se llamaron:** aparecen en la lista de modelos, pero su
inclusión en el tier gratuito NO está confirmada; ante la duda de pago, no
se usan. Tampoco se llamó a ningún modelo PAYG (`gpt-5.6-sol`,
`claude-opus-5`).

## 2. Medición de calidad y consumo por tarea (Top-Tools-Ai-Basic, 2026-11-16)

Prompts reales y pequeños sobre el lead piloto 4 (Fontanería la Moderna,
Logroño). Coste estimado 0,00 USD en las 4 tareas (tier gratuito, 10M
tokens/día según el conector); coste confirmado **null** en las 4 (la API no
devuelve precio, solo `usage` en tokens). Respuestas completas en
`fase-b/measurements-tta.json`.

| Agente / tarea | Prompt | Completion | Total | Latencia | HTTP | Calidad: ¿sirve? |
|---|---|---|---|---|---|---|
| researcher / resumen-expediente | 87 | 143 | 230 | 5,72 s | 200 | **Sí.** 3 frases fieles a los datos dados (sin web, teléfono, 4,8/5, score 85), sin inventar nada; recomendación coherente (web propia orientada a SEO local). |
| designer / generación-sección-web | 86 | 209 | 295 | 5,31 s | 200 | **Sí.** Hero HTML válido (título, subtítulo con valoración, CTA `tel:`). Usa solo el teléfono y la valoración dados y declara que no inventa servicios ni testimonios. Alcance medido: una sección, no una web completa. |
| auditor / revisión-contenido | 95 | 146 | 241 | 6,15 s | 200 | **Sí.** Detecta los 4 problemas plantados (superlativo sin respaldo, 50 años sin soporte, "miles de clientes" sin fuente, precio 10 € irreal) y cita la Ley 3/1991. Matiz: la última frase quedó cortada a mitad ("...puede entenderse como reclamo engañoso y"), contenido útil igualmente. |
| sales / borrador-comercial-corto | 80 | 103 | 183 | 6,56 s | 200 | **Sí, como borrador.** 65 palabras, tono profesional, sin prometer precios ni plazos; deja `[Nombre]`/`[Empresa]` como huecos en vez de inventar la identidad del remitente. No es un envío. |
| **Total 4 tareas** | **348** | **601** | **949** | **5,3–6,6 s** | — | — |

**Conclusión:** Top-Tools-Ai-Basic sirve para las 4 tareas medidas (resumen,
sección web, revisión de contenido, borrador comercial). Latencias de
~5–7 s por llamada: aceptables para trabajo de agente en segundo plano, no
para interacción en tiempo real. A 949 tokens por 4 tareas, 1.000 tareas
serían ~237.000 tokens, el 2,4 % del cupo diario gratuito.

Cada medición está registrada en el cost-control (`usageStore`, servicio
`fase-b-measurement`, una entrada por agente, lead 4) y es visible en
`GET /api/costs/summary`: 8 llamadas registradas en total (4 Fase A + 4
Fase B), 1.754 tokens, 0,00 € estimado, confirmado null.

## 3. Fallback y límites (implementado, con tests)

- `FallbackProvider` encadena solo proveedores operativos
  (`createOperationalFallback`, orden Top Tools AI → Groq → OpenRouter →
  xAI → CoArena; en Fase B la cadena real es solo `[top-tools-ai]`).
  Los no operativos se saltan sin llamar.
- `SpendBlockedError` nunca se reintenta en el siguiente proveedor.
- `TokenBudgetTracker` (`@weblead/cost-control`): presupuestos acumulados
  por agente (20.000 tokens; designer 40.000), por empresa (10.000) y por
  web (50.000); `check()` bloquea **antes** de llamar. Caps por llamada en
  `DEFAULT_AGENT_TOKEN_LIMITS` (designer 800, researcher/sales/crm 300,
  orchestrator 500, auditor 400).
- Detección de pérdida de cuota gratuita (`classifyProviderFailure`):
  401/403, 429 y `model_not_found` marcan el proveedor como no operativo
  en tiempo de ejecución (`markProviderUnavailable`) y la cadena no lo
  vuelve a intentar con cargos. Errores 5xx/red se tratan como transitorios
  y sí prueban el siguiente proveedor.

## 4. Limitaciones

1. Solo un proveedor operativo: toda la medición descansa en
   Top-Tools-Ai-Basic. Sin Groq/OpenRouter/xAI/CoArena no hay comparación
   entre modelos ni fallback real entre proveedores distintos (el fallback
   entre proveedores solo se demuestra con mocks en tests).
2. Pro/Max sin probar (inclusión en tier gratuito no confirmada).
3. Orquestador y CRM no tienen medición propia: reutilizan Basic sin
   verificar un modelo de razonamiento para el orquestador.
4. La medición cubre una sección web, no una web completa; la generación
   completa costará mucho más (a medir en Fase D).
5. La respuesta del auditor quedó cortada en la última frase (ver tabla).
6. El `usageStore` sigue siendo en memoria: las mediciones se pierden al
   reiniciar la API (persistencia Prisma pendiente, como en Fase 0).
