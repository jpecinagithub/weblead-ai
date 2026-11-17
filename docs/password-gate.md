# Puerta de clave de la plataforma de demos

> Añadida 2026-11-17 por orden expresa de Jon: la plataforma de demos
> (índice + 10 demos) queda detrás de una clave sencilla.

## Cómo funciona

- Al abrir cualquier página de `weblead-demos.vercel.app` se muestra
  solo la pantalla de clave: título, campo de contraseña, botón
  «Entrar» y el aviso conceptual obligatorio. Sin la clave no se
  renderiza ningún contenido de las demos (ni nombres de empresas, ni
  datos de contacto, ni fotos).
- La clave actual es **`demo2026`**.
- La clave **nunca** se guarda en texto plano en el código: en
  `apps/demo-platform/src/password-gate.ts` solo vive su hash SHA-256
  (`PASSWORD_HASH`). Al pulsar «Entrar», el navegador calcula el hash
  de lo escrito con `crypto.subtle` y lo compara con el guardado.
- Si coincide, el acceso queda marcado en `sessionStorage` durante la
  sesión del navegador: no se vuelve a pedir la clave al pasar de una
  demo a otra ni al recargar, pero sí al abrir una ventana nueva o
  cerrar el navegador.
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
- Sin `sessionStorage` disponible (modo privado estricto, etc.), la
  puerta se vuelve a pedir en cada navegación; la web no se rompe.

## Tests y auditoría

- `apps/demo-platform/test/password-gate.test.ts`: vectores SHA-256
  conocidos, `checkPassword` con la clave correcta e incorrectas,
  bloqueo sin desbloquear (índice y las 10 demos) y render con la
  puerta desbloqueada (sin formularios de contacto).
- `apps/demo-platform/test/no-forms.test.ts`: sigue comprobando que
  las demos no tienen formularios, renderizando con la puerta
  desbloqueada.
- Las auditorías Playwright (`audit-redesign.ts` y
  `scripts/audit-polish.mjs`) desbloquean la puerta con
  `addInitScript` (sessionStorage) antes de navegar, para auditar el
  contenido de las demos; la puerta en sí se cubre con los tests
  unitarios, no con la auditoría.
