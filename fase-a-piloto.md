# WebLead AI — Fase A de viabilidad (preparación, 2026-11-16)

Estado: **preparado, no empezado**. El prompt maestro (v1.0) llegó el 2026-11-16 a las 18:13 en el chat
"WebLead AI", cortado al final de la §8 en `UUID` — falta el resto del modelo de datos y lo que venga
después (§9 en adelante). No se inventa nada de lo que falta: hay que pedirle a Jon el resto antes de
cerrar la Fase 0. El asistente principal ya le propuso empezar por esta Fase A y está esperando su sí.

## Veredicto provisional (a confirmar con el piloto)

- Lo reutilizable barato existe: xAI grok-4.7 con el crédito de 5 USD de NEXUS, Top Tools AI
  (10M tokens/día del modelo propio) y CoArena (5 USD/día gratis) para research, diseño y auditoría.
- Lo que NO existe es una fuente legal masiva y gratuita de empresas españolas sin web. Eso es lo que
  la Fase A tiene que probar o descartar, antes de construir los 6 agentes.

## Fuentes verificadas el 2026-11-16 (búsqueda web)

| Fuente | Veredicto para discovery | Evidencia |
|---|---|---|
| INE DIRCE | NO sirve para descubrir empresas: solo publica agregados estadísticos (nº de empresas por provincia, sector, tamaño; datos a 1-ene-2025, pub. 11-12-2025). No hay listado nominativo descargable. | ine.es — explotación estadística DIRCE |
| BORME (BOE) | NO es un directorio: publica actos inscritos (constituciones, nombramientos, disoluciones...), no fichas de empresa. Sirve para verificar existencia/actividad de una empresa ya conocida, no para listar "sin web" por sector y provincia. | boe.es BORME; prometiam.com guía 2026-11-07 |
| APIEmpresas.es | Lookup por CIF, no discovery. Free 100 consultas; Pro 19 €/mes (3.000/mes); Business 49 €/mes (10.000/mes). No cubre autónomos. Útil en Fase A solo para verificar una empresa concreta por CIF. | apiempresas.es vía glama.ai |
| Google Places API (New) | La vía de discovery más realista, con coste controlado. Text Search Enterprise: 1.000 llamadas gratis/mes; después 35 USD/1.000 llamadas; hasta 20 resultados por llamada (60 máx. por consulta). El campo `website` + teléfono empuja a Enterprise. Un piloto de 20–30 empresas cabe en la cuota gratis. Pendiente en Fase A: leer las condiciones de Google Maps Platform sobre almacenar leads y reutilizarlos comercialmente. | Precios validados 2026-06-12 / jul 2026 en openplacesapi.com y anilead.io |
| OpenStreetMap / Overpass API | Gratis, licencia ODbL, sin clave. Negocios con tags `phone`, `website`, `opening_hours`, `contact:*`. Cobertura muy buena en Europa y ciudades, irregular para oficios en pueblos pequeños; tags desordenados; las instancias públicas piden a usuarios comerciales autoalojar o pagar. Buena fuente secundaria / contraste, no única. | wiki.openstreetmap.org/wiki/Overpass_API; dev.to guía OSM leads oct 2026 |

## Mini-muestra real (2026-11-16, búsqueda de lugares "fontaneros en Logroño")

6 resultados, 3 con web en la ficha y 3 sin web en la ficha. **"Sin web en la ficha" ≠ "sin web propia"**:
hay que verificarlo por búsqueda web caso a caso, y es justo lo que mide el piloto.

- CON web: Fontanería Godoy (fontaneria-godoy.com), Fontanería Adolfo Aragón
  (adolfoaragonfontaneria.com), Fontaneria Sangar (fontanerialarioja.com.es).
- SIN web en la ficha (a verificar): Expert Fontaneros Logroño (C. Fray Diego de Leiva 38),
  Fontanería la Moderna (C. Duquesa de la Victoria 75), Fontaneria Rubio (Ctra. el Cortijo km 3).
- La muestra sugiere que ~50% de fontaneros de Logroño podrían ser candidatos, pero n=6 no es
  una conclusión: el piloto debe llegar a 20–30 empresas con verificación individual.

No se ha contactado con ninguna de estas empresas ni se ha guardado nada más que lo público aquí.

## Piloto propuesto (Fase A)

- **Ámbito:** Logroño (La Rioja) — ciudad del usuario, tamaño manejable, fácil de verificar a mano.
- **Sectores:** fontanería/climatización + peluquerías/barberías (servicios locales, alta densidad,
  señales de actividad visibles: reseñas, Instagram/Facebook, horarios).
- **Muestra:** 20–30 empresas. Por cada una: nombre, sector, dirección, teléfono, ¿web propia? (verificada),
  señales recientes de actividad (fecha + fuente), scoring 0–100 según la tabla del prompt (umbral 70),
  clasificación CONFIRMED / PROBABLE / UNVERIFIED / INACTIVE.
- **Medir:** nº de leads que superan 70, tiempo y tokens por expediente (con Top Tools gratis y con
  grok-4.7), y qué fuente aguanta (Places vs OSM vs búsqueda web manual).
- **Entregable:** `fase-a-veredicto.md` con la tabla de 20–30, el coste real por expediente y la
  recomendación GO / NO-GO (o GO con alcance recortado).

## Decisiones que hay que tomar en Fase 0 (no en Fase A)

1. **Arquitectura:** el prompt propone Express persistente + Vercel, pero en Hobby Vercel solo permite
   12 funciones. O la API vive en Oracle como NEXUS/LicitaClima (recomendado: mismo patrón ya
   verificado), o se consolida en pocas funciones Vercel. Decidirlo antes de picar código.
2. **Comercial/LSSI:** el correo en frío necesita base jurídica; tener un correo público no es
   consentimiento. El Sales Agent solo prepara borradores para aprobación humana, como dice el prompt.
3. **Resto del prompt:** pedir a Jon el texto desde la §8 (`UUID`) en adelante.

## Qué falta (para el chat de WebLead AI)

- El sí de Jon a la Fase A y, si quiere, el sector/provincia (si no dice nada, Logroño + los dos
  sectores de arriba).
- El resto del prompt maestro (§9 en adelante).
- Decisión de arquitectura (Oracle vs Vercel) en Fase 0, no ahora.

## Añadido 2026-11-16 20:06 — Apify (crédito 5 USD de Jon)
Candidato a evaluar en la Fase C, no decisión tomada. Añadir a la matriz comparativa (actores útiles, coste por 1.000 empresas, caducidad del crédito — desconocida). Un actor de Google Maps en Apify no convierte el scraping masivo en conforme a las condiciones de Google; si no resuelve la base legal, descartarlo para discovery masivo. Consumo, si lo hay, bajo el módulo de control de costes, con límite efectivo cero.
