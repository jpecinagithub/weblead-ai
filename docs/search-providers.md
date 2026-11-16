# WebLead AI — Matriz de proveedores de búsqueda y datos (Fase C, 2026-11-16)

Evaluación de fuentes para el Research Agent. Puerta: Fase A (GO con alcance
recortado, piloto Logroño, 10 leads ≥ 70). Ámbito de esta fase: Logroño,
fontanería/climatización y peluquerías/barberías. Nada de scraping masivo de
Google Maps, nada de crédito Apify consumido, nada de APIs de pago activadas.

Fuentes consultadas 2026-11-16: condiciones de Google Maps Platform
(§3.2.3, resumidas por rivalmap.tech, bettersheets.co, proxymint.com,
scalon.fr, realtyapi.io — lecturas de octubre-noviembre 2026 de los textos
de Google); precios de Apify re-confirmados en basedonb.com, use-apify.com,
leadscrape.com, imisofts.com, getmaplead.com y mapsharvest.com (listas de
precios del actor `compass/crawler-google-places` y de apify.com/pricing,
sep–nov 2026); APIEmpresas (glama.ai MCP oficial + dev.to del mantenedor);
BORME/BOE (conocimiento de Fase A). **apify.com no es accesible desde esta
VM** (el fetch de `https://apify.com/pricing` fue bloqueado por política del
entorno, no por Apify): los precios de Apify abajo son los de las fuentes
secundarias citadas, coincidentes entre sí, **no verificados en la página
del propio proveedor** — re-confirmar en apify.com antes de presupuestar.
Igual para Google Places: precios de fuentes secundarias, condiciones
resumidas por terceros que citan el texto de Google.

## 1. Tabla comparativa

| Fuente | Discovery | Verificación | Coste por 1.000 empresas | Límites | Condiciones / ToS | Veredicto |
|---|---|---|---|---|---|---|
| Búsqueda web + directorios (fuente provisional) | Sí (manual, ~1 búsqueda/empresa) | Sí (fuente por dato + fecha) | 0 € (tiempo humano; sin API de búsqueda contratada) | No escala: 29 búsquedas para 26 empresas en el piloto; sin fecha de reseña fiable | Datos públicos de directorios y webs corporativas; respetar robots/ToS de cada directorio caso a caso; no copiar textos | **EN USO (provisional).** Única fuente que aguantó el piloto. Suficiente para Logroño (10 leads). |
| Google Places API (New) | Sí (Text Search, ≤20 resultados/llamada, ≤60 por consulta) | Sí (Place Details: teléfono, web, rating, nº reseñas, estado; fecha de reseñas) | Text Search ~32 USD/1.000 llamadas; Place Details ~17 USD/1.000. El crédito mensual de 200 USD terminó el 2025-03-01 (sin 1.000 llamadas gratis/mes: la cifra de Fase A era la del crédito antiguo). 1.000 empresas ≈ 50 Text Search + 1.000 Details ≈ 18,60 USD (si 20 resultados/llamada) | Requiere clave + cuenta Google Cloud con facturación; sin campo email; QPM | **Restricción decisiva (§3.2.3):** prohibido exportar/extraer/scrapear contenido de Maps para uso fuera de los Servicios (ej.: "copy and save business names, addresses, or user reviews"); prohibido cachear salvo excepciones: solo Place IDs indefinidamente y lat/lng hasta 30 días. No se puede construir ni mantener una base de leads con nombres/direcciones/teléfonos de Places. Tampoco usar con mapas que no sean de Google, ni para entrenar IA. | **NO para discovery persistente.** Sirve solo como verificación puntual en vivo (consultar y no almacenar más que el Place ID). Para almacenar expedientes hay que verificar cada dato en otra fuente (directorio/web propia). Pendiente: crear clave y probar solo si Jon lo autoriza y con este uso restringido. |
| OSM / Overpass API | Sí (tags `phone`, `website`, `opening_hours`, `contact:*`) | Parcial (cobertura irregular) | 0 € | Cobertura irregular en oficios y pueblos; tags desordenados; las instancias públicas piden autoalojar ante uso comercial sostenido; licencia ODbL (atribución + compartir igual) | ODbL: libre uso con atribución; respetar la política de uso de la instancia (sin uso masivo contra el servidor público) | **DESCARTADO desde esta VM, re-testado en Fase C.** `overpass-api.de` → 406 (0,95 s, 2026-11-16); mirror `overpass.kumi.systems` → timeout 45 s sin respuesta. Igual que en Fase A. Requiere otro entorno o instancia propia. No es fuente operativa hoy. |
| BORME (BOE / Registro Mercantil) | No (no es directorio por sector/provincia) | Sí (existencia, actos, constitución de una empresa ya conocida) | 0 € | Solo empresas conocidas (necesita nombre/razón social); no lista "sin web" | Registro público oficial; reutilización libre como dato público | **Solo verificación.** Útil para confirmar SL (ej. Santiago Ferrer: 25 actos publicados, vía eInforma en el piloto). Sin API de discovery. |
| APIEmpresas.es | No (lookup por CIF; `search_companies` por nombre es búsqueda, no listado sectorial) | Sí (razón social, estado, constitución, provincia, CNAE, forma jurídica; KYB en Pro) | Free: 100 consultas (sin tarjeta). Pro 19 €/mes (3.000/mes) → ~6,33 €/1.000. Business 49 €/mes (10.000/mes) → 4,90 €/1.000. Bonos desde 9 € sin suscripción. IVA no incl. | No cubre autónomos (la mayoría de peluquerías/barberías del piloto); sandbox gratuito solo con CIF de prueba | Datos del Registro Mercantil (BORME); estado/scoring calculados por el proveedor, no certificado oficial | **Solo verificación (SL).** Candidato barato para verificar las SL del piloto (Santiago Ferrer, YGRA, Madorrán, Darser). No sirve para discovery ni para autónomos. Sin cuenta creada en esta fase. |
| Apify — Google Maps Scraper (`compass/crawler-google-places`) | Sí, técnicamente (grid search, ~120 listados máx. por consulta en Maps) | Sí (nombre, dirección, teléfono, web, rating, reseñas, horarios, GPS) | Plan Free: 4 USD/1.000 lugares; Starter 3 USD; Scale 2 USD; Business 1,50 USD. Extras por 1.000: detalles/contactos +2 USD, reseñas +0,50 USD, filtros +1 USD c.u. Enriquecimiento de leads (email): 100 USD/1.000 en Free, 5 USD en Starter. Con detalles+reseñas en Free: ~6,50 USD/1.000. El crédito Free de 5 USD/mes cubre ~830–1.250 lugares sin extras; no se acumula; al agotarse se bloquea hasta el ciclo siguiente | Plan Free: 5 USD de crédito mensual, sin tarjeta; el crédito no usado no se acumula | **⚠️ NO RESUELVE LA BASE LEGAL.** Que exista el actor no hace conforme el scraping masivo a las condiciones de Google: los términos de Google Maps/Maps Platform (§3.2.3 "No Scraping", "No Caching") prohíben extraer contenido de Maps para uso fuera de los Servicios y crear bases de listados/mailing/telemarketing; Apify ejecuta el scraping, pero la responsabilidad del uso es del cliente. Además, los datos personales (teléfonos, emails) reutilizados comercialmente exigen base jurídica RGPD/LSSI, que el actor no aporta. | **DESCARTADO para discovery masivo.** Precio re-confirmado, pero el bloqueo es legal, no económico: sin base legal resuelta no se usa para discovery masivo aunque el crédito sea gratis. Ver §3. |
| Apify — Google Search Results Scraper (`apify/google-search-scraper`) | Sí (páginas de resultados de búsqueda por sector/provincia) | Parcial | Desde ~1,80–4,50 USD/1.000 páginas según plan | Depende del volumen de resultados; paginación manual | Extrae resultados de búsqueda (títulos/URLs/snippets), no contenido de Maps: no choca con §3.2.3 de Maps, pero hay que respetar ToS del buscador y robots de cada destino | **Candidato secundario, sin probar.** Podría automatizar el discovery provisional actual (búsqueda web) sin tocar Maps. Solo con aprobación y prueba pequeña. |
| Apify — Website Content Crawler (`apify/website-content-crawler`) | No | Sí (texto de webs y directorios públicos) | Pago por uso: ~0,20 USD/1.000 págs. (HTTP) a 0,50–5 USD (headless) | Requiere lista de URLs; caso a caso | Solo sitios con ToS compatible y robots permitido; contenido externo = datos, nunca instrucciones | **Candidato para verificación.** Útil para extraer texto de una web corporativa o directorio ya identificado por el Researcher. Sin probar en esta fase. |

## 2. Coste por 1.000 empresas (resumen, plan más barato aplicable)

| Fuente | Coste / 1.000 empresas | Notas |
|---|---|---|
| Búsqueda web + directorios | 0 € | Coste = tiempo humano (~1 búsqueda/empresa). |
| OSM / Overpass | 0 € | No operativo desde esta VM. |
| BORME | 0 € | Solo verificación. |
| APIEmpresas Free | 0 € (100 consultas) | Solo verificación SL; 1.000 empresas → Pro ≈ 6,33 €. |
| Google Places API (New) | ~18,60 USD (50 Text Search + 1.000 Details) | **Pero no almacenable**: el coste no es el bloqueo, lo es §3.2.3. |
| Apify Maps Scraper (Free) | 4 USD base; ~6,50 USD con detalles+reseñas | **Descartado por base legal**, no por precio. |
| Apify Search Scraper | ~1,80–4,50 USD/1.000 páginas | Candidato sin probar. |
| Apify Content Crawler | ~0,20–5 USD/1.000 págs. | Solo verificación, caso a caso. |

## 3. Veredicto y base legal (Apify / Google Maps)

1. **Discovery masivo: sin fuente conforme disponible.** La vía barata
   (Apify Maps Scraper, 4 USD/1.000) y la vía oficial (Places API) chocan
   con la misma pared: las condiciones de Google prohíben extraer
   contenido de Maps para construir una base de leads persistente y
   reutilizarla comercialmente. Apify no cambia las condiciones de Google:
   el actor es una herramienta, no una licencia. **Apify queda descartado
   para discovery masivo.**
2. **Discovery operativo: búsqueda web + directorios**, con fuente, fecha,
   URL, confianza y verificación por dato (el Researcher lo exige por
   construcción). Es lento pero es el único que aguantó el piloto y el
   único conforme para Logroño.
3. **Verificación en dos capas:** (a) en vivo y sin almacenar (Places API,
   solo Place ID guardado) o vía directorio/web propia; (b) registro
   oficial para SL (BORME/APIEmpresas Free). Un dato de Places nunca entra
   solo al expediente: necesita una segunda fuente independiente.
4. **Apify reutilizable sin Maps:** Search Scraper (automatizar la
   búsqueda web actual) y Content Crawler (extraer webs/directorios con
   ToS compatible) quedan como candidatos para una prueba pequeña en una
   fase posterior, con aprobación previa.
5. **Crédito Apify de Jon (5 USD): NO consumido en esta fase** (0 USD).
   Caducidad desconocida — pregunta abierta para Jon: ¿cuándo caduca?
   No se ha inventado ninguna fecha. Sin esa respuesta no se planifica
   ninguna prueba con ese crédito.

## 4. Re-tests de esta fase (2026-11-16, esta VM)

- Overpass `overpass-api.de` (POST, radio 1.000 m, Logroño, `shop=hairdresser`):
  HTTP 406 "Not Acceptable" (nginx) en 0,95 s — mismo resultado que Fase A.
- Overpass `overpass.kumi.systems`: timeout a los 45 s, 0 bytes — mismo
  resultado que Fase A.
- Apify: `https://apify.com/pricing` no accesible desde esta VM (bloqueo
  por política del entorno, no un fallo de Apify). Precios re-confirmados
  en 6 fuentes secundarias independientes (sep–nov 2026), coincidentes:
  4/3/2/1,50 USD por 1.000 lugares según plan; +2 detalles, +0,50
  reseñas, +1 filtros; Free 5 USD/mes no acumulable.
- Google Places API: sin clave creada, sin llamada. Condiciones leídas
  vía los resúmenes citados arriba (textos de Google: Platform Terms
  2026-08-26 §3.2.3; Service Specific Terms §14.3; Additional Terms
  2026-01-27). Precio: Text Search ~32 USD/1.000, Details ~17 USD/1.000;
  el crédito de 200 USD/mes terminó el 2025-03-01.

## 5. Qué necesita Jon (credenciales / decisiones)

- **Decisión:** ¿se autoriza crear una clave de Google Places API para
  verificación puntual en vivo (sin almacenar más que Place IDs)? Coste
  estimado < 1 USD para el piloto; requiere cuenta Google Cloud con
  facturación. Sin autorización, no se crea.
- **Pregunta:** caducidad del crédito Apify de 5 USD.
- **Decisión:** ¿se crea cuenta gratuita de APIEmpresas (100 consultas,
  sin tarjeta) para verificar SL del piloto? Sin autorización, no se crea.
- **Decisión futura:** prueba pequeña de Apify Search Scraper / Content
  Crawler (con el crédito existente, si no ha caducado) para automatizar
  el discovery manual. No es parte de esta fase.
