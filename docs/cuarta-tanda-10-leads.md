# Cuarta tanda — 10 demos sin score (17 nov 2026)

> Las 10 empresas que faltaban del archivo
> `workspace/user/files/investigacion_leads_completa.xlsx` (campo
> `later_unscored` de `docs/tercera-tanda-17-leads.json`): todas con
> email verificado y validadas como activas, SIN score. Jon ordenó
> construirlas igualmente (no hay umbral que aplicar). Excluida
> CARPINTERÍA SORIA (tiene web propia, descartada en el propio
> archivo). Total de la plataforma: 37 demos.

## Las 10 nuevas

| # | Empresa | Sector | Localidad | Email | Demo | Plantilla |
|---|---|---|---|---|---|---|
| 1 | CENTRO DE ESTUDIOS | Academia/centro formación | Soria capital | info@imaginesoria.com | /demos/centro-de-estudios-soria | academia-formacion-v1 |
| 2 | CLÍNICA DENTAL MERCEDES MORENO TORCAL | Clínica dental | Soria capital | doctoramorenotorcal@gmail.com | /demos/clinica-dental-mercedes-moreno-torcal-soria | clinica-dental-v2 |
| 3 | TALLERES SIVI | Taller mecánico | Arenas de San Pedro | talleressivi@gmail.com | /demos/talleres-sivi-arenas-de-san-pedro | taller-mecanico-v0 |
| 4 | TALLER MECÁNICO ADOLFO MESÓN | Taller mecánico | Arenas de San Pedro | tallerameson@gmail.com | /demos/taller-mecanico-adolfo-meson-arenas-de-san-pedro | taller-mecanico-v1 |
| 5 | TALLERES GONVIAUTO HNOS. | Taller mecánico | Arenas de San Pedro | taller@gonviauto.com | /demos/talleres-gonviauto-hnos-arenas-de-san-pedro | taller-mecanico-v2 |
| 6 | AUTO-NEUMÁTICOS EL VALLE | Neumáticos + taller | Arenas de San Pedro | automovileselvalle@yahoo.com | /demos/auto-neumaticos-el-valle-arenas-de-san-pedro | neumaticos-v1 |
| 7 | CALEFACCIÓN Y FONTANERÍA MILE | Fontanería + calefacción | Arenas de San Pedro | calefaccionyfontaneriamile@hotmail.com | /demos/calefaccion-y-fontaneria-mile-arenas-de-san-pedro | fontaneria-climatizacion-v2 |
| 8 | CERRAJERÍA ALBARRÁN | Cerrajería/aluminio | Arenas de San Pedro | toldosalbarran@hotmail.com | /demos/cerrajeria-albarran-arenas-de-san-pedro | cerrajeria-v4 |
| 9 | CERRAJERÍA CHUPI | Cerrajería/escultura | Arenas de San Pedro | chupi@chupiescultor.com | /demos/cerrajeria-chupi-arenas-de-san-pedro | cerrajeria-v2 |
| 10 | DON LLAVES | Cerrajería | Cuenca capital | juanllaves1972@gmail.com | /demos/don-llaves-cuenca | cerrajeria-v0 |

**Datos que faltaban:** ninguna de las 10 tiene dirección de calle
(omitida, sin Maps inventado). Todas tienen teléfono. Reseñas
verificadas solo en 3: Sivi 4,7★ (81), Mesón 4,8★ (18), Don Llaves
5,0★ (2). Sin formularios en ninguna demo; aviso conceptual visible;
sin enlace de vuelta a la plataforma.

## Cambio 1 — sección "Datos verificados" ELIMINADA de las 37 (orden de Jon, 2026-11-17)

Al cliente no le interesa esa parte. Eliminada de todas las demos:
render en `apps/demo-platform/src/App.tsx` (sección `demo-trust`,
incluido el bloque de distintivos de reseñas/año que vivía dentro),
generación de `trustItems` en `packages/website-generator`, y
`'trust'` de las listas de secciones de las plantillas.

Verificado por grep en `generated-demos.ts` (0 ocurrencias):
"Datos verificados", "Fuentes del expediente", "Señal de actividad",
"Actividad verificada", "CONFIRMED", `"trust"`. El auditor
Playwright nunca puntuaba esa sección.

**Efectos colaterales (visibles, por decisión de Jon):**
- Los distintivos de reseñas/año ya no se pintan en ninguna demo
  (el dato sigue en `content.verified` por si se les busca otro sitio).
- El párrafo "La empresa" decía `(CONFIRMED, consultado ...)`; para
  llegar a 0 "CONFIRMED" ahora dice "Su actividad está verificada en
  el expediente de WebLead AI (consultado noviembre de 2026)".

## Cambio 2 — acabado de estilo (orden de Jon: currárselo más)

Cada demo debe sentirse distinta y cuidada, no un simple cambio de
paleta. 3 plantillas nuevas (el escaparate de la tanda):
- `academia-formacion` — galería segunda, papel cálido, azul marino +
  burdeos, Georgia serif. Variantes v0 burdeos/banner, v1 verde/split,
  v2 malva/card.
- `clinica-dental` — la consulta antes que los servicios, azul clínico
  + teja, Avenir Next. Variantes v0 teja/banner, v1 azul/split,
  v2 cian/card. Plantilla propia (no reutilizar salud-fisioterapia:
  sus fotos son de yoga/masaje, imposibles para un dentista).
- `neumaticos` — héroe de pila de neumáticos, carbón + naranja
  quemado, Arial Black industrial. Variantes v0 naranja/banner,
  v1 pizarra/split, v2 ámbar/card.

Variantes nuevas en reutilizadas para que las 10 no parezcan clones
de las 27: `taller-mecanico` +v3 (4), `fontaneria-climatizacion` +v3
(4), `cerrajeria` +v3/+v4 (5). Las 10 nuevas quedan en variantes
distintas dentro de cada plantilla reutilizada.

**Variantes de las 27 fijadas:** el generador admite ahora
`variantId` explícito y el regen fija cada una de las 27 en su
variante actual: 0 rebarajados (las 9 que habrían cambiado de
variante/acento/héroe conservan la suya; solo les cambia la sección
eliminada, que es lo ordenado).

**Pulidos de la auditoría (2 defectos reales):**
- Iniciales del logo ilegibles en las 37 (acento oscuro sobre fondo
  oscuro): ahora en blanco `#fff`, regenerado por la vía canónica.
- Email de Mile recortado en móvil (36 caracteres): CSS
  `.contact-value { overflow-wrap: anywhere; }`.

## Auditoría Playwright — 37/37 PASSED 100/100/100/100

Script nuevo `apps/api/src/audit-cuarta-tanda.ts`
(`audit:cuarta-tanda`, modo re-auditoría: acepta PREVIEW_READY y
APPROVED). 3 pasadas; la última sobre el fichero ya sellado.
37/37 APPROVED / PASSED (playwright). 0 overflow, 0 formularios,
0 imágenes rotas, 0 errores de consola, 0 errores HTTP. Capturas de
escritorio y móvil de cada una de las 10 nuevas revisadas una a una
(en `docs/cuarta-tanda-10-leads/polish/`, informe en
`docs/cuarta-tanda-10-leads/auditoria.md`).

**Efecto colateral de quitar `trust`:** 3 pares de plantillas
colisionaban en `templatesAreDistinct`; en vez de relajar el test se
diferenció el orden de secciones de una de cada par: peluquería
`about` antes que `services`, cerrajería `gallery` antes que
`howItWorks`, jardinería `about` antes que `howItWorks`. Esto cambia
el orden visible de secciones en las demos de esas 3 plantillas.

## Seguimiento

Las 10 nuevas entran en `outreach.ts` como `pending` ("Pendiente de
contacto", oferta aún sin enviar). Totales: 25 enviadas esperando
respuesta, 2 rebotes, 10 pendientes, 0 respuestas. Corrección de
slug: `clinica-dental-mercedes-moreno-trocal-soria` →
`clinica-dental-mercedes-moreno-torcal-soria` (r/o transpuestas en el
encargo; `slugify("TORCAL")` da `torcal`).

## Verificación (por el coordinador)

- Build + typecheck en verde. Suite completa: **279/279, 15 ficheros**.
- Grep sección eliminada: 0 en las 6 cadenas, en contenido generado,
  `App.tsx` y `styles.css`.
- Sitemap reescrito con 37 URLs (+ inicio).
- Scripts re-ejecutables: `regenerate:cuarta-tanda` (2ª pasada idéntica,
  estados preservados).

## Pendientes (no de esta tanda)

- Verificación en vivo en Vercel (la hace el hilo principal; el
  despliegue tarda ~2 min).
- Borradores de email de las 10 (otro paso, lo pide Jon después).
- `docs/cuarta-tanda-10-leads/polish/` (74 ficheros) y
  `docs/tercera-tanda-17-leads/polish/` (193 ficheros, 115 MB) sin
  commitear: decidir si se guardan o se borran.
