# Gmail — guía de conexión OAuth (Fase E, pendiente de Jon)

Estado actual (2026-11-16): **no conectado**. No hay ninguna cuenta real
conectada, no hay tokens OAuth y no hay credenciales en el repo. Los
borradores comerciales viven solo en Postgres (`EmailDraft`) hasta que
esto se complete. El código (`packages/integrations/src/gmail.ts`)
devuelve `not_connected` con honestidad y se niega a actuar.

## Scopes mínimos (nada más)

| Scope | Para qué |
|---|---|
| `https://www.googleapis.com/auth/gmail.readonly` | Leer respuestas autorizadas (clasificación en el CRM) |
| `https://www.googleapis.com/auth/gmail.compose` | Crear borradores en Gmail |

Deliberadamente **NO** se pide `gmail.send`: WebLead AI no envía correo
nunca. Un borrador aprobado por humano se envía, si acaso, desde Gmail
mismo por la persona, con base legal comprobada antes (gate LSSI).

## Pasos para Jon

1. En [Google Cloud Console](https://console.cloud.google.com/), crear (o
   reutilizar) un proyecto y activar la **Gmail API**.
2. En *APIs y servicios → Credenciales*, crear un **ID de cliente OAuth
   2.0** de tipo *Aplicación web*.
3. Añadir como URI de redirección autorizada la del backend de WebLead AI
   (en desarrollo local: `http://localhost:4000/api/gmail/oauth/callback`;
   en producción: la URL del backend en Oracle + `/api/gmail/oauth/callback`).
   El endpoint de callback **no existe aún**: es trabajo futuro, tras
   esta fase, y no debe implementarse sin decidir antes dónde vive el
   backend (Oracle) y cómo se guardan los tokens.
4. Copiar el *Client ID* y el *Client Secret* **solo** a las variables de
   entorno del backend (`GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` en `.env`,
   nunca en git, nunca en el frontend).
5. Completar el flujo de autorización con la cuenta de Gmail que enviará
   (o desde la que se redactará). Si la app OAuth sigue en modo *Testing*,
   añadir esa cuenta como *test user* en la pantalla de consentimiento.
6. Verificar que `GET /api/gmail/status` pasa de `not_connected` a
   `connected` y que el panel "Configuración e integraciones" lo refleja.

## Qué falta (checklist)

- [ ] Proyecto de Google Cloud + Gmail API activada (Jon)
- [ ] Credenciales OAuth creadas (Jon; secretos solo en `.env` del backend)
- [ ] Endpoint `/api/gmail/oauth/callback` + almacenamiento seguro de tokens (refresh token cifrado en backend, nunca en frontend) — trabajo futuro
- [ ] Crear borrador real en Gmail desde un `EmailDraft` aprobado (futuro; hoy los borradores son locales)
- [ ] Leer respuestas reales y clasificarlas (futuro; hoy la clasificación es un clasificador local probado con 8 ejemplos)

## Seguridad

- Tokens solo en backend, nunca en el frontend ni en el repo.
- Permisos mínimos (tabla de arriba); no ampliar scopes sin justificarlo.
- Cada envío real seguirá exigiendo aprobación humana + base legal LSSI
  (el gate de `packages/agent-sales`); conectar Gmail no autoriza envíos.
- Para revocar: quitar el acceso en la cuenta de Google
  (*Seguridad → Acceso de terceros*) y borrar el refresh token del backend.
