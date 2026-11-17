# Tercera tanda — 17 demos nuevas (27 en total)

Fecha: 2026-11-17. Decisión de Jon (13:26): hacer primero las 17 con nota;
las 10 sin nota quedan para después.

## Deduplicación

Fuente: `workspace/user/files/investigacion_leads_completa.xlsx`, 43 filas en
5 lotes (Zamora 19, Ávila 10, Cuenca 9, Soria 5). Datos deduplicados en
`docs/tercera-tanda-17-leads.json`.

- **43 filas → 28 empresas distintas.** Repetidas entre lotes: Talayuelas ×4;
  Toranzo, Pelayo, Heralu, Jardinería Raúl y Madi's ×3; Aura y Magneto ×2.
- **28 − 1 descartada = 27 construibles.** Carpintería Soria tiene web propia
  y el propio archivo dice DESCARTAR (queda en `later_unscored` y en
  `discarded` del JSON, no se construye).
- **17 con nota (78–95) → esta tanda** (`build_now`). **10 sin nota → para
  después** (`later_unscored` sin Soria): Centro de Estudios, Clínica Dental
  Mercedes Moreno Torcal, Talleres Sivi, Taller Mecánico Adolfo Mesón,
  Talleres Gonviauto Hnos., Auto-Neumáticos El Valle, Calefacción y
  Fontanería Mile, Cerrajería Albarrán, Cerrajería Chupi, Don Llaves.
- Ninguna de las 17 coincide con las 10 actuales de Logroño.
- Regla permanente: solo proyectos con email verificado. Las 17 lo tienen.

## Las 17 demos nuevas

Base: https://weblead-demos.vercel.app/demos/&lt;slug&gt;. Todas con
`businessState` PREVIEW_READY y `auditStatus` null (pendiente de auditoría
Playwright, ver abajo). Sin borrador LLM (`llm.used = false`, copia
determinista). Sector saneado con `displaySector` (sin "24h"/"urgencias").

| Empresa | Slug | Plantilla | Score | Datos que faltaban (omitidos) |
|---|---|---|---|---|
| TALLER MECÁNICO REFOYO'S | taller-mecanico-refoyo-s-zamora | taller-mecanico | 95 | sin dirección |
| FISIOAVANZA ZAMORA | fisioavanza-zamora-zamora | salud-fisioterapia | 93 | sin dirección |
| TALLER CHAPA Y PINTURA VALENTÍN MYM C.B. | taller-chapa-y-pintura-valentin-mym-c-b-avila | taller-mecanico | 92 | sin dirección |
| MAGNETO ELECTRICIDAD | magneto-electricidad-mota-del-cuervo | electricista | 92 | sin dirección |
| FISIO MAFF | fisio-maff-zamora | salud-fisioterapia | 91 | sin dirección |
| GRINAN BUENO TALLERES | grinan-bueno-talleres-iniesta | taller-mecanico | 90 | — (tiene dirección y dos teléfonos) |
| DALON TALLER MECÁNICO | dalon-taller-mecanico-avila | taller-mecanico | 90 | sin dirección |
| FISIOFYR | fisiofyr-zamora | salud-fisioterapia | 89 | sin dirección |
| TALLARES AVILAGRI | tallares-avilagri-el-barco-de-avila | taller-mecanico | 88 | sin dirección |
| AURA FISIOTERAPIA Y FELDENKRAIS | aura-fisioterapia-y-feldenkrais-soria | salud-fisioterapia | 88 | sin reseñas |
| I.E. RAÚL C.V. | i-e-raul-c-v-canete | electricista | 88 | sin dirección, sin reseñas |
| FONTANERÍA TALAYUELAS | fontaneria-talayuelas-talayuelas | fontaneria-climatizacion | 85 | sin dirección |
| CARPINTERÍA EBANISTERÍA FRANCISCO TORANZO | carpinteria-ebanisteria-francisco-toranzo-villaralbo | oficios-hogar | 85 | sin dirección, sin reseñas |
| HERALU – HERMANOS ÁLVAREZ URONES | heralu-hermanos-alvarez-urones-villaralbo | cerrajeria | 84 | sin dirección, sin reseñas |
| FONTANERÍA PELAYO | fontaneria-pelayo-villaralbo | fontaneria-climatizacion | 82 | **sin teléfono** y sin dirección (solo email) |
| JARDINERÍA RAÚL HERNÁNDEZ LAPERAL | jardineria-raul-hernandez-laperal-villaralbo | jardineria | 80 | sin dirección, sin reseñas |
| PELUQUERÍA MADI'S | peluqueria-madi-s-villaralbo | peluqueria-barberia | 78 | sin dirección, sin reseñas |

Notas:

- Solo 2 de las 17 tienen dirección en el expediente: Grinan
  ("Avd. Constitución 78 / Ctra. Híjar 23, 16235 Iniesta") y Aura
  ("C. Puertas de Pro, 19, 42002 Soria"). Las demás demos no muestran
  enlace a Google Maps (el generador lo omite sin dirección).
- Pelayo es la única sin teléfono: su demo no tiene enlace `tel:`, el
  subtítulo y la CTA van por email ("Contacto directo por email, sin
  intermediarios" / "Ver contacto") y el FAQ se adapta a email.
- Grinan trae dos teléfonos en un solo campo
  ("967 49 02 35 / 646 00 00 00"); el generador lo conserva literal y el
  enlace `tel:` concatena los dígitos de ambos. Queda así por ahora;
  si se quiere un solo número, hay que decidir cuál es el principal en
  el expediente.
- Reseñas verificadas (del `activitySignal`): Refoyo's 23× 5,0/5,
  Fisioavanza 57× 5,0/5, Valentín MYM 30× 4,8/5, Magneto 20× 5,0/5,
  Fisio MAFF 25× 5,0/5, Grinan 2× 5,0/5, Dalon 23× 5,0/5, Fisiofyr
  22× 5,0/5, Avilagri 5× 5,0/5, Talayuelas 2× 5,0/5. Las 7 restantes,
  sin reseñas en el expediente.
- Localidades: "Zamora capital" → "Zamora", "Ávila capital" → "Ávila",
  "Soria capital" → "Soria", "Cuenca capital" → "Cuenca" (el sufijo
  " capital" se quita para el municipio; la provincia se conserva).

## Plantillas creadas (esta tanda)

5 plantillas nuevas en `packages/website-templates` (trabajo previo de la
tanda, incluido en el mismo commit): `taller-mecanico`,
`salud-fisioterapia`, `electricista`, `cerrajeria`, `jardineria` — con sus
fotos (hero + galería) en `apps/demo-platform/public/images/`. Las 17
demos usan `templateId` explícito (nunca matching por sector): 5×
taller-mecanico, 4× salud-fisioterapia, 2× electricista, 2×
fontaneria-climatizacion, 1× oficios-hogar, 1× cerrajeria, 1× jardineria,
1× peluqueria-barberia.

## Regeneración

Script: `apps/api/src/regenerate-demos-tercera-tanda.ts`
(`pnpm --filter @weblead/api regenerate:tercera-tanda`).

- Las 10 demos de Logroño se reconstruyen desde
  `packages/shared/src/data/pilot-leads.json` exactamente como en la
  segunda tanda y el script exige igualdad byte a byte
  (`JSON.stringify(prev.content) === JSON.stringify(rebuilt)`):
  **10/10 byte-idénticas**, conservan `businessState` APPROVED y
  `auditStatus` "PASSED (playwright)".
- Las 17 nuevas pasan todos los guards: email verificado, score ≥ 70,
  slugs únicos en las 27, hechos idénticos al expediente
  (nombre/dirección/teléfono/email), `validateNoInventedClaims` limpio
  en subtítulo, about, trust y respuestas FAQ, sin rastro de formulario
  en el contenido serializado, sin "llama al teléfono" donde no hay
  teléfono (Pelayo) ni "La dirección verificada" donde no hay dirección.
- `apps/demo-platform/public/sitemap.xml` reescrito con la base de
  producción https://weblead-demos.vercel.app: 28 URLs (índice + 27 demos).

### Dos falsos positivos del validador, corregidos sin tocar el copy

1. **"neuromodulación" → 'precio'.** El patrón `euros?` del validador
   casaba como subcadena dentro de "neuromodulación" (sector literal del
   expediente de FISIO MAFF). Corregido en
   `packages/website-generator/src/index.ts`: `euros?` → `\beuros?\b`
   (límite de palabra). "50 euros" y "10 €" se siguen detectando; los
   tests del generador siguen en verde.
2. **"no publica horarios" → 'horario'.** Las respuestas FAQ de las
   plantillas terminan con el disclaimer "Esta demo no publica horarios
   ni servicios de urgencia no verificados", que niega los horarios en
   vez de afirmarlos; el validador (regex por subcadena) lo marcaba
   igual. El script de regeneración excluye esa frase exacta de
   disclaimer antes de validar las respuestas FAQ (documentado en el
   propio script); cualquier otra violación sigue haciendo fallar el
   script. La misma frase está en las 10 demos ya auditadas.

## Seguimiento

`apps/demo-platform/src/data/outreach.ts`: nuevo estado `'pending'`
(`outreachLabel` → "Pendiente de contacto", `outreachClass` →
`pill-neutral`, ramas explícitas). Las 17 demos nuevas entran como
`{ status: 'pending', date: '17 nov 2026' }`. El resumen del panel
(9 esperando respuesta · 1 rebote · 0 respuestas) no cambia: `pending`
no suma a ninguno. El Dashboard no se ha tocado.

## Tests

Actualizados solo los tres ficheros afectados por pasar de 10 a 27 demos
(`apps/demo-platform/test/`):

- `no-forms.test.ts`: 27 demos; el enlace `tel:+34` se exige solo con
  teléfono y el de Google Maps solo con dirección; cada demo debe tener
  al menos un canal directo (`tel:` o `mailto:`).
- `password-gate.test.ts`: título "las 27 demos"; el `tel:+34` del bucle
  por demo es condicional al teléfono (Pelayo no tiene).
- `outreach-tracking.test.ts`: 9 enviadas / 1 rebote / 17 pendientes;
  en el índice desbloqueado 'Oferta enviada' 18, 'Rebotado' 2,
  'Pendiente de contacto' 34 (cada etiqueta se pinta dos veces: tabla +
  tarjeta); aserción de `pill-neutral`.

Verificación (obligatoria, 2026-11-17): `pnpm build`, `pnpm typecheck`
y `pnpm test` (suite completa) en verde.

- build: OK — `pnpm build` (todos los paquetes + demo-platform + dashboard), sin errores.
- typecheck: OK — `pnpm typecheck` (todos los paquetes; demo-platform con `tsc --noEmit -p tsconfig.app.json`), sin errores.
- tests: OK — `pnpm test`: **15 ficheros, 257 tests, todos en verde**.
  (En la primera pasada fallaron 5 tests por el apóstrofo de REFOYO'S y
  MADI'S: React escapa `'` como `&#x27;` en el HTML; los tests comparan
  ahora contra el nombre escapado, sin relajar la aserción.)

## Auditoría

**Pendiente.** La auditoría Playwright de las 17 demos nuevas (y la
re-auditoría de las 10, si procede) la hace otro trabajador después de
esta regeneración. Las 17 nuevas quedan en PREVIEW_READY con
`auditStatus` null hasta que la auditoría las marque APPROVED /
"PASSED (playwright)".

## Commit

Un solo commit con todo (plantillas, generador, auditor, regeneración,
seguimiento, tests, fotos, JSON de datos, este documento). Mensaje:
"Tercera tanda: 17 demos nuevas (27 en total) + 5 plantillas".
