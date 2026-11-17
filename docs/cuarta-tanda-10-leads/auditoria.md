# Auditoría CUARTA TANDA — 37 demos (2026-11-17)

Auditor: trabajador de auditoría (subagente). Script: `pnpm --filter @weblead/api audit:cuarta-tanda`
(`apps/api/src/audit-cuarta-tanda.ts`, modo re-auditoría: acepta `PREVIEW_READY` y `APPROVED`).
Preview local `http://localhost:5174`. Capturas: `docs/cuarta-tanda-10-leads/polish/{slug}-{desktop,mobile}.png`.

## Resultado final (3ª pasada, sobre el fichero ya sellado)

**37/37 PASSED 100/100/100/100 (empresarial / visual / técnica / contenido), 0 hallazgos.**
Cargas: escritorio 936–1194 ms, móvil 926–1054 ms. 0 overflow, 0 formularios, 0 imágenes
rotas, 0 errores de consola, 0 errores HTTP, aviso conceptual visible en las 37, sin enlace
de vuelta a la plataforma, sin sección "Datos verificados" (ni "Fuentes del expediente",
ni "Señal de actividad", ni "CONFIRMED" — grep 0 en `generated-demos.ts` y check en vivo
del DOM en las 37). Las 10 nuevas no muestran dirección ni Maps (check en vivo).

| Demo | Nota | Carga esc./móv. (ms) |
|---|---|---|
| santiago-ferrer-fontaneria-en-general-sl-logrono [re-aud.] | 100/100/100/100 | 1127 / 1023 |
| hidrorioja-sc-logrono [re-aud.] | 100/100/100/100 | 1049 / 953 |
| moises-munoz-s-l-logrono [re-aud.] | 100/100/100/100 | 1007 / 953 |
| atesa-aire-y-temperatura-s-l-logrono [re-aud.] | 100/100/100/100 | 1020 / 931 |
| mishea-peluqueros-logrono [re-aud.] | 100/100/100/100 | 1047 / 1001 |
| la-guarida-111-logrono [re-aud.] | 100/100/100/100 | 1104 / 963 |
| charles-barbershop-logrono [re-aud.] | 100/100/100/100 | 1075 / 948 |
| peluqueria-e-style-logrono [re-aud.] | 100/100/100/100 | 990 / 997 |
| pintor-logrono-roberto-decoracion-logrono [re-aud.] | 100/100/100/100 | 1046 / 978 |
| carpinteria-sergio-martinez-logrono [re-aud.] | 100/100/100/100 | 1021 / 1043 |
| taller-mecanico-refoyo-s-zamora [re-aud.] | 100/100/100/100 | 1113 / 1018 |
| fisioavanza-zamora-zamora [re-aud.] | 100/100/100/100 | 1194 / 951 |
| taller-chapa-y-pintura-valentin-mym-c-b-avila [re-aud.] | 100/100/100/100 | 1104 / 1044 |
| magneto-electricidad-mota-del-cuervo [re-aud.] | 100/100/100/100 | 1075 / 1029 |
| fisio-maff-zamora [re-aud.] | 100/100/100/100 | 1015 / 974 |
| grinan-bueno-talleres-iniesta [re-aud.] | 100/100/100/100 | 1032 / 1013 |
| dalon-taller-mecanico-avila [re-aud.] | 100/100/100/100 | 1030 / 1014 |
| fisiofyr-zamora [re-aud.] | 100/100/100/100 | 1027 / 1031 |
| tallares-avilagri-el-barco-de-avila [re-aud.] | 100/100/100/100 | 951 / 928 |
| aura-fisioterapia-y-feldenkrais-soria [re-aud.] | 100/100/100/100 | 1093 / 936 |
| i-e-raul-c-v-canete [re-aud.] | 100/100/100/100 | 1017 / 1037 |
| fontaneria-talayuelas-talayuelas [re-aud.] | 100/100/100/100 | 1020 / 930 |
| carpinteria-ebanisteria-francisco-toranzo-villaralbo [re-aud.] | 100/100/100/100 | 986 / 952 |
| heralu-hermanos-alvarez-urones-villaralbo [re-aud.] | 100/100/100/100 | 1019 / 955 |
| fontaneria-pelayo-villaralbo [re-aud.] | 100/100/100/100 | 973 / 937 |
| jardineria-raul-hernandez-laperal-villaralbo [re-aud.] | 100/100/100/100 | 1104 / 1054 |
| peluqueria-madi-s-villaralbo [re-aud.] | 100/100/100/100 | 1029 / 1008 |
| centro-de-estudios-soria [NUEVA] | 100/100/100/100 | 1026 / 935 |
| clinica-dental-mercedes-moreno-torcal-soria [NUEVA] | 100/100/100/100 | 1058 / 945 |
| talleres-sivi-arenas-de-san-pedro [NUEVA] | 100/100/100/100 | 1112 / 927 |
| taller-mecanico-adolfo-meson-arenas-de-san-pedro [NUEVA] | 100/100/100/100 | 1009 / 935 |
| talleres-gonviauto-hnos-arenas-de-san-pedro [NUEVA] | 100/100/100/100 | 976 / 964 |
| auto-neumaticos-el-valle-arenas-de-san-pedro [NUEVA] | 100/100/100/100 | 936 / 1051 |
| calefaccion-y-fontaneria-mile-arenas-de-san-pedro [NUEVA] | 100/100/100/100 | 1031 / 956 |
| cerrajeria-albarran-arenas-de-san-pedro [NUEVA] | 100/100/100/100 | 936 / 926 |
| cerrajeria-chupi-arenas-de-san-pedro [NUEVA] | 100/100/100/100 | 1009 / 947 |
| don-llaves-cuenca [NUEVA] | 100/100/100/100 | 963 / 944 |

Log completo de la pasada final: `/tmp/audit-cuarta-tanda-3.log` (pasadas 1 y 2 en
`/tmp/audit-cuarta-tanda-1.log` y `/tmp/audit-cuarta-tanda-2.log`).

## Revisión visual de las 10 nuevas (escritorio + móvil, vistas una a una)

- **Centro de Estudios** (academia-formacion-v1, split): papel cálido, serif Georgia,
  héroe de aula con foto de clase, galería segunda. Bien. Móvil: apilado limpio, CTAs a
  ancho completo.
- **Clínica Dental Mercedes Moreno Torcal** (clinica-dental-v2, card): héroe clínico con
  foto de consulta moderna, tarjeta blanca solapada, paleta azul clínico + cian. La
  consulta antes que los servicios. Bien. Móvil: tarjeta y CTAs correctos.
- **Auto-Neumáticos El Valle** (neumaticos-v1, split): Arial Black industrial, pila de
  neumáticos de héroe, paleta carbón. Claramente distinta de taller-mecanico. Bien.
- **Talleres Sivi** (taller-mecanico-v0, banner): héroe motor a sangre, oscuro y
  dramático, texto legible sobre degradado. Bien.
- **Taller Mecánico Adolfo Mesón** (taller-mecanico-v1, split): acento teja, foto motor.
  Distinto de Sivi (layout + acento). Bien.
- **Talleres Gonviauto Hnos.** (taller-mecanico-v2, card): acento pizarra, tarjeta
  solapada. Distinto de los otros dos talleres. Bien.
- **Calefacción y Fontanería Mile** (fontaneria-climatizacion-v2, card): grifo cromado de
  héroe, tarjeta solapada. Bien en escritorio; **en móvil el email se cortaba** (ver
  pulidos).
- **Cerrajería Albarrán** (cerrajeria-v4, card) y **Cerrajería Chupi** (cerrajeria-v2,
  card): mismo layout y mismas fotos de plantilla; se distinguen por el acento (rojo
  oscuro v4 frente a bronce v2), la píldora de sector (aluminio / escultura) y los datos.
  Es el par más parecido de la tanda, pero no peor que el precedente ya aceptado en las
  27 (Refoyo's y Avilagri comparten plantilla + layout + acento v0). No se tocó nada.
- **Don Llaves** (cerrajeria-v0, banner): héroe banner oscuro con la cerradura
  inteligente, Courier en titulares. Distinto de Albarrán/Chupi. Bien.

Galerías parejas en las 10 (3 columnas en escritorio, 1 en móvil, sin huecos). La foto
de héroe se repite como primera de galería: patrón compartido con las 27, no es nuevo.

## Pulidos de estilo aplicados (2 defectos reales, ambos verificados con captura después)

1. **Iniciales del logo ilegibles en las 37 demos.** `buildLogoSvg` pintaba las
   iniciales con el acento de variante (tono oscuro) sobre el fondo `primary` (también
   oscuro): "CE", "CD", "AN", "TS", "CF", "CA", "DL"… no se distinguían en ningún
   encabezado. Fix: iniciales en blanco `#fff`.
   - `packages/website-generator/src/index.ts` (`buildLogoSvg`, el parámetro `accent`
     queda en la firma por estabilidad; el acento sigue vivo en filete, titulares y
     botones).
   - `packages/website-generator/test/generator.test.ts`: los 2 tests que exigían el
     acento en la URI ahora exigen `fill="#fff"` en el `<text>`.
   - `apps/api/src/regenerate-demos-cuarta-tanda.ts`: la guarda de identidad
     (`expectedAfterTrustRemoval`) ahora también espera el blanqueo del logo
     (idempotente; cubre `brand.logoSvgDataUri` **y** `assets[0].url` — el primer
     intento falló ahí y la guarda abortó como debe).
   - Regenerado con la guarda en verde: diff verificado campo a campo contra el
     fichero previo — **solo 74 URIs de logo** (37 demos × 2 sitios), estados
     preservados. Verificado en captura: iniciales blancas legibles en los 4
     encabezados revisados (academia, dental, neumáticos, Mile).
2. **Email de Mile recortado en móvil.** `calefaccionyfontaneriamile@hotmail.com`
   (36 caracteres) se salía de la tarjeta de contacto y la última letra se cortaba en
   el borde del viewport. El check de overflow por `scrollWidth` no lo caza (el texto
   desborda su caja sin ensanchar el documento). Fix CSS:
   `apps/demo-platform/src/styles.css` → `.contact-value { overflow-wrap: anywhere; }`.
   Verificado en captura: el email parte en dos líneas dentro de la tarjeta, completo
   y clicable. Medición con `Range` en las 37: solo Mile estaba afectada.
   - El script de auditoría incorpora ahora ese check (texto de `.contact-value`
     contra la tarjeta, a 1280 y a 390 px) para que no se escape en próximas tandas.

Sin pulir (decisión): nada más hizo falta. Héroes, tipografías y ritmos de las 3
plantillas nuevas son diferenciados y las reutilizadas no parecen clones entre sí
(más allá del par Albarrán/Chupi, ver arriba).

## Sellado

`apps/demo-platform/src/data/generated-demos.ts`: **37/37 `businessState: APPROVED`,
`auditStatus: PASSED (playwright)`** (las 10 nuevas selladas tras la 3ª pasada; las 27
re-selladas al re-auditarse en verde).

## Incidente durante el trabajo (recuperado, sin pérdida)

Al sellar, un script de Python hizo `open(p,'w')` antes de evaluar el argumento que
fallaba (`json.dumps(data, None, 2)`), truncando `generated-demos.ts` a 0 bytes. Se
detectó por el `grep -c` posterior (0 ocurrencias) y se recuperó íntegro desde la copia
`/tmp/generated-demos-before-logo-fix.ts` (fichero pre-logo, 37 demos), re-ejecutando
`regenerate:cuarta-tanda` con la guarda en verde y verificando el diff (solo 74 URIs
de logo). El sellado se repitió con el cálculo completo en memoria antes de abrir el
fichero. El fichero final está verificado: 37 demos, estados correctos, 0 cadenas
prohibidas, suite 279/279 y auditoría final 37/37 en verde.

## No verificado

- **Verificación en vivo en Vercel**: pendiente, la hace el coordinador (como indica el
  encargo). Todo lo anterior es contra preview local (`pnpm preview`, puerto 5174).
- No se tocó Gmail, NEXUS, nada fuera de `weblead-ai`, ni
  `docs/tercera-tanda-17-leads/polish/`. No se hizo ningún commit.
