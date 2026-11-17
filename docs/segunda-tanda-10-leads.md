# WebLead AI — Segunda tanda: 10 proyectos con email verificado (2026-11-17)

## 0. La orden y la regla nueva permanente

Jon, 2026-11-17 12:12: **para empezar un proyecto hay que tener el email
de contacto verificado; sin email no hay proyecto.** La primera tanda
quedó invalidada como lista enviable (solo 2 de 10 tenían email). Esta
segunda tanda rehace la lista y las demos con 10 proyectos que SÍ tienen
email. Los 8 sin email de la primera tanda (La Moderna, Chuchi, Expert,
Begoña Ruiz, Avalon, Lumberjack, Star Barber, Nuria) quedan aparcados
por esta regla y **sus demos ya no están en la plataforma**
(`generated-demos.ts` solo contiene los 10 de esta lista; 0 emails null,
0 slugs viejos). Orden de Jon 2026-11-17 12:27: eliminar todos los
proyectos sin email también de la página de demos — hecho con este push.

## 1. Los 10 (todos con email verificado y score ≥ 70)

| # | Empresa | Sector | Email | Fuente del email | Score | Demo |
|---|---|---|---|---|---|---|
| 1 | Santiago Ferrer Fontanería en General SL | fontanería/climatización | sanfefo@terra.com | eInforma + Exa Places (1ª tanda) | 100 | https://weblead-demos.vercel.app/demos/santiago-ferrer-fontaneria-en-general-sl-logrono |
| 2 | Hidrorioja SC | fontanería/climatización | hidrorioja@telefonica.net | Cylex + Exa Places (1ª tanda) | 90 | https://weblead-demos.vercel.app/demos/hidrorioja-sc-logrono |
| 3 | Moisés Muñoz, S.L. | fontanería/climatización | fontaneria.moisesmunoz@fer.es | Afoncagás (página leída) | 100 | https://weblead-demos.vercel.app/demos/moises-munoz-s-l-logrono |
| 4 | ATESA — Aire y Temperatura, S.L. | fontanería/climatización | atesa@fer.es | Afoncagás (página leída) | 90 | https://weblead-demos.vercel.app/demos/atesa-aire-y-temperatura-s-l-logrono |
| 5 | Mishea Peluqueros | peluquería/barbería | misheapeluqueros@gmail.com | Exa Places (página leída) | 85 | https://weblead-demos.vercel.app/demos/mishea-peluqueros-logrono |
| 6 | La Guarida 111 | peluquería/barbería | miah_syt@hotmail.com | Exa Places (página leída) + Cylex | 85 | https://weblead-demos.vercel.app/demos/la-guarida-111-logrono |
| 7 | Charles barbershop | peluquería/barbería | charlesbarbers27@gmail.com | Exa Places (página leída) | 95 | https://weblead-demos.vercel.app/demos/charles-barbershop-logrono |
| 8 | Peluquería E.style | peluquería/barbería | businessestyle@gmail.com | Exa Places (página leída) + Cylex | 95 | https://weblead-demos.vercel.app/demos/peluqueria-e-style-logrono |
| 9 | Pintor Logroño Roberto Decoración | pintura/decoración | robertoinretec@gmail.com | Webnode (página de contacto leída) + Exa Places | 95 | https://weblead-demos.vercel.app/demos/pintor-logrono-roberto-decoracion-logrono |
| 10 | Carpintería Sergio Martínez | carpintería | carpinteriasm@gmail.com | Anuario de la Construcción (página leída) | 80 | https://weblead-demos.vercel.app/demos/carpinteria-sergio-martinez-logrono |

**Enviables: 10 de 10.** Borradores en
`docs/borradores-10-leads-oferta-50eur.md` (mismo modelo: oferta 50 €,
enlace a su demo y clave `demo2026` en cada texto). Nada enviado.

## 2. Cómo se buscaron los 8 nuevos (y el cambio de alcance, explícito)

Tres investigadores en paralelo (fontanería/climatización, peluquería/
barbería, sectores adyacentes), con la misma regla de puntuación de
`docs/feasibility.md` §3. **Los dos sectores originales dieron 6 sólidos
(4 peluquería + 2 fontanería); los 2 restantes vienen de sectores
adyacentes en Logroño (pintura y carpintería).** El cambio de alcance es
este, y no se hizo en silencio: fontanería y peluquería están peinadas
(el censo de Afoncagás, prácticamente agotado) y el patrón se repite en
todos los sectores — el negocio sin web suele publicar solo el teléfono.

Cada email de los 8 nuevos fue verificado por el coordinador en la
página de la fuente (no solo en el informe del investigador): las 4
fichas Exa (Mishea, La Guarida, Charles, E.style), las 2 de Afoncagás
(Moisés Muñoz, ATESA), la página de contacto de Webnode (Roberto) y el
Anuario de la Construcción (Sergio Martínez). Ningún email inventado.

## 3. Corrección de scores: manda la regla implementada, no la primera lectura

Al actualizar el test `reproduces the pilot scores` a la segunda tanda,
6 scores manuales no reproducían: la regla implementada en
`packages/agent-researcher/src/scoring.ts` + `pilotLeadToEvidence` es la
autoridad (Fase C, cerrada) y dice:

- `social-only` (20/15) es SOLO para presencia funcional con reserva
  (booksy/yeasy/fresha/treatwell/reserva). Instagram solo, Facebook solo,
  Linktree o un subdominio gratuito del proveedor son `none` (25/20).
  Precedente 1ª tanda: Chuchi (solo Facebook) = 25/20; solo Lumberjack
  (Instagram + Booksy) = 20/15.
- Potencial económico: `employeesKnown` (SL con plantilla conocida) = 15
  sin importar el número exacto.

Correcciones aplicadas en `feasibility-data.csv` y `pilot-leads.json`
(la selección no cambia: los 8 siguen ≥ 70):

| Empresa | Antes | Ahora | Motivo |
|---|---|---|---|
| Moisés Muñoz, S.L. | 95 | **100** | SL con plantilla conocida (3 empleados) = 15, no 10 |
| La Guarida 111 | 85 | **95** | Linktree no es presencia funcional con reserva: 25/20 |
| Charles barbershop | 85 | **95** | Solo Instagram: 25/20 |
| Peluquería E.style | 85 | **95** | Subdominio Tahe + Facebook: 25/20 |
| Pintor Roberto | 85 | **95** | Subdominio Webnode gratuito: 25/20 |
| Carpintería Sergio Martínez | 70 | **80** | Subdominio multiespaciosweb gratuito: 25/20 |
| ATESA | 90 | 90 | Sin cambios |
| Mishea Peluqueros | 85 | 85 | Instagram + Booksy sí es `social-only`: 20/15 |

El test `reproduces the pilot scores` se actualizó a los ids de la
segunda tanda (6, 8, 27–34) y vuelve a reproducir los 10 scores; para
ello `packages/shared` se reconstruye (el test lee `dist/`).

## 4. Descartados en esta ronda (con motivo)

- **Peluquería Lissage Suyen (75):** su email solo apareció en un
  snippet de buscador de logromercado.com; la página no se pudo abrir
  ni corroborar en ninguna otra fuente. La regla nueva exige email
  verificado; un snippet no basta.
- **Reformas Guerreros (90), Talleres Cetarra (70), Cerrajería La
  Estrella (70):** email solo a nivel de snippet (Cylex/Buscalis lo
  muestran tras un enlace o como imagen, no en el texto de la página).
  No hacían falta teniendo 8 sólidos con verificación completa.
- **Fontanería López C.B., Fontanería y Calefacción Martín S.L., Jorge
  Fraile Jiménez (70 exactos, actividad UNVERIFIED, 0 reseñas):** cumplen
  los requisitos duros pero son leads pobres; López además tiene 3
  teléfonos distintos sin resolver. Reserva, no usados.
- **Con web propia (descartados aunque tuvieran email):** Pedro Alonso,
  Frío Rioja, PEVISAT, INTERSA, Elloas, Makeover, Rocío Estilista y una
  veintena más en peluquería; en limpieza/jardinería, todos los negocios
  con email público tienen dominio propio.
- **Sin email público:** FríoEbro (email redactado pese a 193 reseñas
  4,9), Electricidad Alain López, Javelec, Ridel, Pinturas Soto y una
  larga lista de oficios con solo teléfono.

## 5. Las demos: plantilla nueva para oficios

- `packages/website-templates`: tercera plantilla **`oficios-hogar`**
  (pintura/decoración, carpintería), con paleta verde musgo + terracota,
  tipografía Palatino, 3 variantes (terracota/banner, ocre/partida,
  pizarra/tarjeta), FAQ de oficios sin precios ni horarios, sección
  «Cómo trabajamos» y motivo de logo nuevo (`hammer`, en el generador).
  Fotos Unsplash License servidas en local (`oficios-hero.jpg`:
  rodillo pintando; `oficios-gallery-1.jpg`: corte de madera;
  `oficios-gallery-2.jpg`: taladro en obra), verificadas visualmente
  el 2026-11-17.
- Regeneración con `apps/api/src/regenerate-demos-segunda-tanda.ts`
  (nuevo): Ferrer e Hidrorioja reutilizadas (slug, borradores aceptados
  y servicios conservados, datos revalidados); 8 nuevas deterministas
  sin borrador LLM. Guardas: email obligatorio en los 10 (la regla
  nueva hace fallar el script si falta), score ≥ 70, sin formularios,
  sin afirmaciones inventadas, slugs únicos. **No se ejecutó
  `export:demos` desde Postgres** (snapshot anterior a Fase F).
- `sitemap.xml` reescrito con la base de producción
  (https://weblead-demos.vercel.app); el anterior apuntaba a localhost.
- La puerta de clave y la ausencia de índice (commits 533a4bb, f5b9d76,
  f81fb89, hilo principal) se conservan intactas: la clave `demo2026`
  se pide SIEMPRE y la entrada no lista demos. La regeneración no tocó
  `App.tsx` ni `password-gate.ts`.

## 6. Verificación

- **Auditoría Playwright (re-ejecutada tras el commit f81fb89): 10/10
  PASSED 100/100/100/100, 0 hallazgos** (`pnpm --filter @weblead/api
  audit:segunda-tanda`, script nuevo `apps/api/src/audit-segunda-tanda.ts`).
- Auditoría de pulido (overflow/formularios/imágenes rotas/errores,
  360/768/1280, re-ejecutada tras el commit f81fb89): **índice + 10
  demos con 0 overflow, 0 formularios, 0 imágenes rotas, 0 errores de
  consola y 0 errores HTTP en los 33 casos** (`node
  apps/demo-platform/scripts/audit-polish.mjs`, salida en
  `/tmp/polish-segunda`).
- Build + typecheck + tests en verde: **build demo-platform OK,
  typecheck 17/17 paquetes, tests 213/213 (14 ficheros)** — incluido el
  test `reproduces the pilot scores` actualizado a la segunda tanda.
- 0 formularios en las demos (el único campo es el de la clave).
- Coste efectivo: 0 € (sin llamadas LLM en esta tanda; todo
  determinista a partir de los expedientes verificados).

## 7. Matices y discrepancias (no resueltos inventando)

- **Moisés Muñoz:** Afoncagás/eInforma dan C/ Cantabria 5 (domicilio
  social); Exa/Cylex dan Cantabria 7 (probable almacén). Se usa 5.
- **Mishea Peluqueros:** Exa (actual) dice C/ Pilar Salarrullana, 20;
  directorios antiguos dicen C/ Dr. Múgica, 4 (posible traslado). Se
  usa la de Exa.
- **Charles barbershop:** directorios antiguos listan
  charlesbarbershop.es; el dominio no resuelve (comprobado 2026-11-17)
  y ninguna fuente actual lo lista como web. Se mantiene como sin web.
- **La Guarida 111:** existe un segundo local de la marca (La Guarida
  Hair and Tattoo, C/ Chile, 25) con el mismo email y Linktree. Se usa
  el local de Estambrera, 34.
- **ATESA:** actividad CONFIRMED por la ficha Iberinform consultada
  03/10/2026, mismo criterio que el piloto 1 (ficha actualizada en
  2026); sin reseñas atribuibles.
- **E.style / Roberto / Sergio Martínez:** su única «web» es una página
  en subdominio del proveedor (Tahe / Webnode / multiespaciosweb), no
  un dominio propio. Puntúan como sin web propia (25/20).

## 8. Archivos

- `docs/segunda-tanda-10-leads.md` (este informe)
- `docs/segunda-tanda-10-leads/screenshots/` (capturas de auditoría)
- `docs/feasibility-data.csv` (34 filas: 26 de la 1ª tanda + 8 nuevas)
- `docs/feasibility.md` (regla nueva + §10 segunda tanda)
- `packages/shared/src/data/pilot-leads.json` (10 leads, 2ª tanda)
- `apps/api/src/regenerate-demos-segunda-tanda.ts` + `audit-segunda-tanda.ts`
- `apps/demo-platform/src/data/generated-demos.ts` (10 demos con email)
- `apps/demo-platform/public/sitemap.xml` (base de producción)
- `docs/borradores-10-leads-oferta-50eur.md` (10 borradores enviables)
