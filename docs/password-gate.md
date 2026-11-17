# Puerta de clave de la plataforma de demos

> Añadida 2026-11-17 por orden expresa de Jon: la página de entrada
> de la plataforma queda detrás de una clave sencilla.
>
> CORRECCIÓN 2026-11-17 12:39 (Jon: «creo que no estás entendiendo»):
> la clave protege SOLO la página de entrada (el listado de todos los
> proyectos en activo), que solo la ve Jon. Las demos individuales
> son públicas: cualquiera con el enlace las ve sin clave. Antes la
> puerta cubría también las demos; era al revés de lo pedido.

## Cómo funciona

- Al abrir la página de entrada (`/` o `/demos/`) se muestra solo
  la pantalla de clave: título, campo de contraseña, botón «Entrar»
  y el aviso conceptual obligatorio. Sin la clave no se ve el listado
  de proyectos.
- Las demos individuales (`/demos/{slug}`) son públicas y NO piden
  clave: se abren directamente con el enlace.
- La clave actual es **`demo2026`** y solo la usa Jon para ver la
  página de entrada.
- La clave **nunca** se guarda en texto plano en el código: en
  `apps/demo-platform/src/password-gate.ts` solo vive su hash SHA-256
  (`PASSWORD_HASH`). Al pulsar «Entrar», el navegador calcula el hash
  de lo escrito con `crypto.subtle` y lo compara con el guardado.
- La clave se pide SIEMPRE al abrir la página de entrada (orden de
  Jon 2026-11-17). Al recargar, la puerta vuelve a pedir la clave.
  No hay persistencia en `sessionStorage`, `localStorage` ni cookies.
- **El índice lista todos los proyectos en activo** (orden de Jon
  2026-11-17): tras la clave, la página de entrada muestra la
  información de cada proyecto y el enlace a su página
  (`/demos/{slug}`). Ese listado solo lo ve quien tiene la clave
  (Jon); sin la clave no se ve nada de él. Cada demo, por su parte,
  se abre directamente con su enlace y no pide clave.
- El único formulario de toda la plataforma es este campo de clave.
  Los formularios de contacto siguen prohibidos y no existen.

## Cambiar la clave

1. Calcula el SHA-256 de la nueva clave:
   ```text
   echo -n 'NUEVA-CLAVE' | sha256sum
   ```
2. Sustituye `PASSWORD_HASH` en
   `apps/demo-platform/src/password-gate.ts` por el hash obtenido.
3. Actualiza los borradores de email en
   `docs/borradores-10-leads-oferta-50eur.md` con la nueva clave.
   (Las demos son públicas y no llevan clave en el email: la clave
   es solo para la página de entrada de Jon.)
4. Commit + push: el auto-deploy de Vercel publica el cambio.

## Limitaciones honestas

- **No es seguridad real.** Es una puerta sencilla en una web
  estática: el hash está visible en el JavaScript que descarga el
  navegador, y una clave corta como esta se puede atacar por fuerza
  bruta fuera de línea. Sirve para que las demos no queden abiertas a
  cualquiera que tenga el enlace, no contra alguien que inspeccione
  el código.
- Si un destinatario comparte el enlace y la clave, cualquiera con
  ambos puede entrar. Para revocar el acceso, cambia la clave.
- `crypto.subtle` exige contexto seguro (HTTPS o localhost): en
  Vercel (HTTPS) funciona; en un `http://` no seguro la comprobación
  no puede hacerse y la puerta no deja entrar.

## Tests y auditoría

- `apps/demo-platform/test/password-gate.test.ts`: vectores SHA-256
  conocidos, `checkPassword` con la clave correcta e incorrectas,
  bloqueo del índice sin desbloquear, índice desbloqueado sin listado,
  y demos públicas que se ven sin clave (sin formularios).
- `apps/demo-platform/test/no-forms.test.ts`: sigue comprobando que
  las demos no tienen formularios (las demos son públicas y no pasan
  por la puerta).
- Las auditorías Playwright (`audit-redesign.ts` y
  `scripts/audit-polish.mjs`) desbloquean la puerta por la interfaz
  (escriben la clave y pulsan «Entrar» tras cargar) cuando auditan
  la página de entrada; en las demos públicas el desbloqueo no hace
  nada, porque no hay puerta. La puerta en sí se cubre con los tests
  unitarios, no con la auditoría. La clave para las auditorías se lee
  de `WEBLEAD_DEMO_PASSWORD` (por defecto la clave actual).
