# Despliegue de la demo-platform en Vercel (importación manual)

> Estado 2026-11-16 22:21: el despliegue directo desde el asistente NO es
> posible. La conexión de Vercel devuelve 403 en el ámbito del equipo
> `jpecina-gmailcoms-projects` (ver "Motivo verificado" abajo). El build
> está verificado en local y el repo listo para importar desde el
> dashboard. No hace falta tocar código.

## Pasos exactos en el dashboard de Vercel

1. Entra en https://vercel.com y cambia el ámbito (arriba a la izquierda)
   al equipo **jpecina-gmailcoms-projects**. No uses la cuenta personal.
2. **Add New → Project → Import Git Repository** y elige
   **jpecinagithub/weblead-ai**. Si no aparece, conecta GitHub o revisa el
   acceso del repo en el equipo.
3. **Project Name:** `weblead-demos` (sugerido; la URL será
   `https://weblead-demos.vercel.app` o similar).
4. **Framework Preset:** Vite.
5. **Root Directory:** pulsa Edit y pon `apps/demo-platform`.
6. **Build Command:** `pnpm build` (ejecuta el typecheck + `vite build`,
   verificado en local).
7. **Install Command:** `pnpm install`. **Output Directory:** `dist`.
8. **Environment Variables:** ninguna.
9. Pulsa **Deploy** y espera a que el build termine en verde.

## URLs que deben funcionar tras el despliegue

- Ferrer: `https://weblead-demos.vercel.app/demos/santiago-ferrer-fontaneria-en-general-sl-logrono`
- Begoña Ruiz: `https://weblead-demos.vercel.app/demos/begona-ruiz-peluqueria-logrono`
- Hidrorioja: `https://weblead-demos.vercel.app/demos/hidrorioja-sc-logrono`
- Resto de demos: `/demos/expert-fontaneros-logrono-logrono`,
  `/demos/fontaneria-la-moderna-logrono`, `/demos/fontaneria-chuchi-logrono`,
  `/demos/avalon-stilistas-logrono`, `/demos/lumberjack-barbershop-logrono`,
  `/demos/star-barber-shop-logrono`, `/demos/peluqueria-nuria-logrono`

Cada una debe devolver HTTP 200 y mostrar el nombre de la empresa y el
aviso "Propuesta conceptual independiente, no oficial y pendiente de
autorización de la empresa". El fallback SPA está en
`apps/demo-platform/vercel.json` (toda ruta no estática → `/index.html`).

## Motivo verificado del fallo del despliegue directo

- `GET /v10/projects` y `POST /v11/projects` con
  `teamId=team_DbNbKm5rH3KDZuDySwwTSDxH` devuelven **403 forbidden**:
  "Not authorized: Trying to access resource under scope
  jpecina-gmailcoms-projects. You must re-authenticate to this scope or
  use a token with access to this scope."
- Request IDs: `iad1:iad1:iad1:sfo1::j28vt-1794864112299-c8566705d8c6`
  (list) y `iad1:sfo1:iad1:sfo1::xrq9x-1794864242735-54b03149212d`
  (create). Es el mismo 403 verificado el 2026-10-05.
- La recuperación que sugiere la API (`authorize_team_access`) **no
  existe** en el servidor MCP de Vercel de este entorno (error:
  `unsupported Vercel tool authorize_team_access`), así que no hay vía
  para re-autorizar el ámbito desde aquí. Tampoco hay CLI de Vercel con
  sesión en esta VM (`~/.vercel` no existe).
- No se creó ningún proyecto (el 403 llegó antes de crear nada); no hay
  nada que limpiar en Vercel.

## Pendiente menor (no bloquea)

- `apps/demo-platform/public/sitemap.xml` (y el generado por
  `export-demos.ts`) sigue apuntando a `http://localhost:5174`. No afecta
  a las demos, solo al sitemap. Para corregirlo, `export-demos.ts` debe
  aceptar una URL base pública y re-exportar.
