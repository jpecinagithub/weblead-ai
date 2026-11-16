# WebLead AI — Fase A: veredicto de viabilidad (piloto real, 2026-11-16)

**Veredicto: GO CON ALCANCE RECORTADO.** Hay mercado real en Logroño (10 de 26 empresas sin web propia
verificada y con score ≥ 70), pero no hay fuente de discovery escalable, gratuita y legal lista para usar:
el piloto se hizo a mano, búsqueda a búsqueda, y la verificación de actividad reciente es el cuello de
botella. No es un NO-GO: es un GO limitado al piloto comercial de Logroño con los 10 leads ≥ 70, sin
escalar a otras provincias hasta resolver la fuente de discovery y la credencial de xAI.

## 1. Números del piloto (recomputados desde `feasibility-data.csv`)

| Métrica | Valor |
|---|---|
| Empresas candidatas revisadas individualmente | 35 |
| Empresas en la muestra final (únicas) | 26 |
| Candidatas excluidas tras revisión | 9 |
| Duplicados en la tabla final | 0 |
| Fontanería/climatización | 13 |
| Peluquerías/barberías | 13 |
| Sin web propia (verificada caso a caso) | 10 / 26 (38,5 %) |
| Con web propia | 16 / 26 (61,5 %) |
| Actividad CONFIRMED | 11 / 26 |
| Actividad PROBABLE | 15 / 26 |
| Actividad UNVERIFIED / INACTIVE | 0 / 0 |
| Score ≥ 70 (umbral del prompt maestro) | 10 / 26 (38,5 %) |
| Score medio de la muestra | 61,2 / 100 |

Por sector: fontanería 5 sin web y 5 ≥ 70 (de 13); peluquería/barbería 5 sin web y 5 ≥ 70 (de 13).
Los 10 leads ≥ 70 son exactamente los 10 sin web propia: Fontanería la Moderna (85), Santiago Ferrer
(100), Fontanería Chuchi (75), Hidrorioja (90), Expert Fontaneros (90), Begoña Ruiz (90), Avalon
Stilistas (75), Lumberjack Barbershop (85), Star Barber Shop (90) y Peluquería Nuria (75).
Ninguna empresa con web vigente llega a 70; la única con web que se acerca es Rioclima (60), cuya
web existe pero no se actualiza desde hace ~11 años.

## 2. Cómo se hizo el piloto (run log, skill bounded_bulk_pull)

- Cursor: búsquedas web por nombre de negocio, una por candidata; sin paginación automática porque la
  fuente es búsqueda web manual, no una API paginada.
- Caps fijados antes de empezar: máx. ~40 candidatas revisadas; muestra final 20–30 empresas.
- Páginas/consultas: 29 búsquedas web en total (4 de discovery por sector + 25 de verificación
  individual). Ninguna página repetida; ningún bucle de reintento.
- Candidatas revisadas: 35 únicas. Excluidas (9): Zorzano Fontanería, Fontanería Pachi y Marín
  Fontanería (fuera de ámbito: Villamediana de Iregua y Lardero, no Logroño); Fontanería y
  Calefacción Terren (no verificable: la búsqueda por nombre no devolvió ningún resultado útil);
  Grupo Jetcam, Márquez Fontanería, Fontanería Anselmo González, Fontanería IBRA y Peluquería
  Gonzalo (con web propia verificada, fuera del cupo de muestra).
- Conteos recomputados desde el CSV guardado (no desde resúmenes intermedios): 26 filas, 10 sin web,
  11 CONFIRMED / 15 PROBABLE, 10 con score ≥ 70. Verificación con script sobre el CSV, 2026-11-16.

## 3. Reglas de scoring aplicadas (tabla del prompt maestro, con subcriterios explícitos)

- **Sin web (25):** sin web propia = 25; solo Instagram/redes o plataformas de reserva = 20
  (Lumberjack); web obsoleta = 10 (Rioclima); web vigente = 0.
- **Actividad verificada (25):** CONFIRMED = 25 (señal fechada ≤ 12 meses: reseña con fecha,
  actualización/verificación de ficha en 2026, consulta eInforma en 2026, reserva en vivo en
  Booksy); PROBABLE = 15 (ficha activa con reseñas/horarios, sin fecha verificable); UNVERIFIED = 5.
  Ausencia de información ≠ inactividad: ningún caso se marcó INACTIVE por falta de datos.
- **Necesidad digital (20):** sin web = 20; solo redes/reservas = 15; web obsoleta = 15; web vigente
  sencilla = 5; web vigente elaborada = 0.
- **Contactabilidad (15):** teléfono + email/formulario/WhatsApp = 15; solo teléfono = 10; solo
  reserva online sin teléfono verificado = 5.
- **Potencial económico (15):** SL con plantilla conocida (10–27 empleados) o ≥ 300 reseñas = 15;
  negocio pequeño con reseñas = 10; sin datos = 5.

## 4. Verificación de "sin web": el hallazgo principal

"Sin web en la ficha" NO es "sin web propia": de las 6 empresas de la mini-muestra previa, 1 resultó
tener web (Fontanería Rubio, fontaneriarubio.es). La verificación caso a caso cambió el resultado en
varios candidatos más: Grupo Jetcam, Márquez, Anselmo González, IBRA, YGRA, Chely, Carmen Delia,
Teresa Ojeda, You & Me, Octavio, La Navaja del Marqués, Álvaro The Barber y Muy Lolitas tienen web
propia aunque en algún listado no constara. Por eso el 38,5 % sin web es una cifra verificada, no una
estimación de ficha.

Conflictos de datos anotados en el CSV (no resueltos inventando): Santiago Ferrer tiene dos
direcciones en fuentes distintas (Gonzalo de Berceo 8, 3-D vs. Av. Pérez Galdós 63); Muy Lolitas
tiene dos sedes/teléfonos (Av. Colón 2, 680285303 vs. Av. Colón 3, 941238782); Chely muestra
941259971 en directorios y 660680930 en su propia web; Hidrorioja muestra 941255266 y 670300077;
Star Barber muestra 641216748 y 614261461; Begoña Ruiz figura en Vara de Rey 33 y 41 (se toma 33,
dos fuentes coinciden); Grupo Jetcam: unos directorios listan desatascosgrupojetcam.es y otro
afirma que no tiene web en su ficha de Google (se clasifica CON web: el dominio existe).

## 5. Coste medido por expediente (real, no estimado)

### Top Tools AI — modelo `Top-Tools-Ai-Basic` — MEDIDO, 4 expedientes reales

| Expediente | Tokens prompt | Tokens completion | Total |
|---|---|---|---|
| Fontanería la Moderna | 87 | 70 | 157 |
| Santiago Ferrer Fontanería en General SL | 95 | 133 | 228 |
| Lumberjack Barbershop | 99 | 121 | 220 |
| Star Barber Shop | 92 | 108 | 200 |
| **Total / media** | | | **805 / 201,25 por expediente** |

- **Coste: 0,00 USD por expediente.** El modelo Basic es el tier gratuito del proveedor
  (10M tokens/día según la documentación del conector); la API no devuelve precio, solo `usage`
  en tokens. 4 expedientes = 805 tokens, el 0,008 % del cupo diario.
- Detalle y respuestas guardadas en `fase-a/cost-measure-tta.json`; script de medición en
  `fase-a/cost-measure-tta.py`.
- **Aviso: los nombres de modelo del conector están desactualizados.** El helper
  `top-tools-ai.py` solo ofrece `Top-Tools-Ai` y `Kimi-K2.6`; ambos devuelven 400
  `model_not_found` desde el 2026-11-16: el proveedor renombró sus modelos a
  `Top-Tools-Ai-Basic` / `Pro` / `Max`. La medición se hizo con `Top-Tools-Ai-Basic` mediante
  el mismo mecanismo de credencial registrada que el helper. El `CONNECTOR.md` de Top Tools AI
  necesita actualizarse (y NO se probó `Pro`/`Max`: podrían ser de pago).

### xAI (grok-4.20-non-reasoning) — NO DISPONIBLE, coste no medible

- `xai.py models` y `xai.py chat --model grok-4.20-non-reasoning` devuelven ambos
  `400 {"code":"invalid-argument","error":"Incorrect API key provided..."}` (2026-11-16).
  La credencial registrada de xAI es inválida o está revocada. No se reintentó en bucle.
  No se pudo medir ningún coste por expediente con xAI, ni hacer la llamada corta de
  comparación con grok-4.7 (fallaría igual: la clave es el problema, no el modelo).
- **Bloqueador para Fase 0:** hay que reconectar la credencial de xAI (o confirmar que el
  crédito NEXUS de 5 USD sigue vivo) antes de depender de grok para ningún agente.

### CoArena — NO USADO

- Su clave registrada está revocada según su `CONNECTOR.md` (401 `api_key_revoked`). No se llamó.

**Conclusión de coste:** con Top Tools AI Basic, el resumen de expediente cuesta 0 USD y ~200
tokens. Aun con 1.000 expedientes/mes serían ~200.000 tokens, muy por debajo del cupo diario
gratuito. El coste de LLM no es el factor limitante; el factor limitante es el discovery.

## 6. Fuentes: qué aguanta y qué no

| Fuente | Veredicto en el piloto |
|---|---|
| Búsqueda web + Exa Places (vía resultados de búsqueda) | **Aguanta como fuente principal provisional.** Dio dirección, teléfono, web, reseñas y, a veces, fechas. Coste: ~1 búsqueda por empresa (~29 búsquedas para 26 empresas). Lenta para escalar, suficiente para Logroño. |
| Directorios (fontaneriaelrayo.es, buscafontaneros.com, Cylex, eInforma, Booksy, Treatwell) | **Secundaria útil.** Aportan fechas de actualización/consulta (clave para CONFIRMED) y datos de empresa (empleados, constitución). Calidad desigual; varios son granjas SEO con texto generado. |
| OpenStreetMap / Overpass API | **No verificada en esta VM.** `overpass-api.de` devuelve 406; los mirrors `overpass.kumi.systems` y `overpass.private.coffee` agotan el tiempo de espera (60 s, sin respuesta). No se pudo usar como fuente. Pendiente: probar desde otro entorno o autoalojar. |
| Google Places API (New) | **Pendiente, no probada.** Es la vía de discovery escalable más realista según la preparación, pero requiere clave, leer sus condiciones sobre almacenar leads y uso comercial, y presupuesto (1.000 llamadas gratis/mes; después 35 USD/1.000). Sin ella, la fecha de las reseñas no es accesible: 15/26 empresas quedan en PROBABLE por ese motivo. |
| INE DIRCE / BORME / APIEmpresas | Confirmado en la preparación: DIRCE no lista empresas; BORME solo verifica empresas conocidas (Santiago Ferrer: 25 actos publicados, consultado vía eInforma); APIEmpresas es lookup por CIF. Ninguna sirve para discovery. |
| Google Maps (scraping) | Prohibido por el prompt maestro y no usado. |

## 7. Limitaciones del piloto (sin adornar)

1. Muestra pequeña y local: 26 empresas, 2 sectores, 1 ciudad. No extrapolar a España.
2. La verificación de web es "no encontrada en búsqueda web", no una prueba de inexistencia
   absoluta (p. ej. Peluquería Nuria: un directorio menciona "página web disponible" sin URL).
3. 15/26 en PROBABLE: sin Places API no hay fecha de reseña fiable; la actividad "confirmada"
   depende de fechas de actualización de directorios, que son un proxy débil.
4. xAI no medible (clave inválida); Top Tools Basic medido solo para resúmenes cortos
   (~200 tokens), no para generación de webs ni auditorías, que costarán mucho más.
5. Overpass no accesible desde esta VM; la fuente gratuita principal queda sin probar.
6. No se ha contactado con ninguna empresa; no hay validación de demanda real (nadie ha dicho
   que quiera una web ni a qué precio).

## 8. Alcance recortado propuesto (GO condicional)

1. Piloto comercial solo en Logroño, solo con los 10 leads ≥ 70, solo borradores (sin envío).
2. Discovery provisional: búsqueda web + Exa Places + directorios; registrar fuente y fecha por
   dato, como en este piloto.
3. Antes de escalar fuera de Logroño, resolver en este orden: (a) credencial xAI o proveedor
   alternativo confirmado; (b) Google Places API: leer ToS, probar con la cuota gratis;
   (c) Overpass desde otro entorno o instancia propia.
4. Actualizar el `CONNECTOR.md` de Top Tools AI con los nombres de modelo vigentes
   (`Top-Tools-Ai-Basic/Pro/Max`).
5. No construir los 6 agentes sobre la hipótesis de discovery masivo gratuito: esa hipótesis
   queda descartada por este piloto.

## 9. Archivos

- `docs/feasibility.md` (este informe)
- `docs/feasibility-data.csv` (26 empresas, todos los campos, fuente y fecha por dato)
- `fase-a/cost-measure-tta.json` (4 expedientes medidos con Top Tools AI Basic)
- `fase-a/cost-measure-tta.py` (script de medición, reutiliza la credencial registrada)
- Preparación previa: `fase-a-piloto.md`; prompt maestro: `docs/master-prompt-v1.md`
