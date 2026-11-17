/**
 * Puerta de clave de la plataforma de demos (orden de Jon 2026-11-17).
 *
 * La plataforma entera (índice + 10 demos) queda detrás de una clave
 * sencilla. La clave NUNCA se guarda en texto plano: en el código solo
 * vive su hash SHA-256 y se compara el hash de lo que escribe el usuario
 * (crypto.subtle, disponible en HTTPS y en localhost).
 *
 * La clave se pide SIEMPRE (orden de Jon 2026-11-17): el desbloqueo vive
 * solo en la memoria de la carga actual de la página y NO persiste en
 * sessionStorage, localStorage ni cookies. Al recargar, al abrir otra
 * demo en una pestaña nueva o al volver más tarde, la puerta vuelve a
 * pedir la clave. Dentro de una misma carga, navegar entre demos no la
 * vuelve a pedir (es la misma página).
 *
 * Limitación honesta: es una puerta sencilla en una web estática, no
 * seguridad real. El hash está visible en el bundle y una clave corta se
 * puede atacar por fuerza bruta fuera de línea. Sirve para que las demos
 * no queden abiertas a cualquiera que tenga el enlace, no contra un
 * atacante que inspeccione el código. Ver docs/password-gate.md.
 *
 * Para cambiar la clave: calcula el SHA-256 de la nueva clave
 * (`echo -n 'NUEVA-CLAVE' | sha256sum`) y sustituye PASSWORD_HASH.
 */

/** SHA-256 hex de la clave actual. Cambiar aquí para cambiar la clave. */
export const PASSWORD_HASH =
  '43c27b4e263fa191a6a7ec198cd4d5b47d17413c49d77dc533a01720707e3202';

/** Desbloqueo de la carga actual de la página (memoria, sin persistencia). */
let unlocked = false;

/** SHA-256 hex (WebCrypto; null cuando el navegador no lo ofrece). */
export async function sha256Hex(text: string): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const bytes = await subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** true cuando la clave introducida coincide con la guardada. */
export async function checkPassword(input: string): Promise<boolean> {
  const hash = await sha256Hex(input);
  return hash !== null && hash === PASSWORD_HASH;
}

/** true cuando la carga actual de la página ya desbloqueó la plataforma. */
export function isUnlocked(): boolean {
  return unlocked;
}

/** Marca la carga actual de la página como desbloqueada (sin persistencia). */
export function markUnlocked(): void {
  unlocked = true;
}

/** Vuelve a bloquear (al recargar la página esto pasa solo). Para tests. */
export function lock(): void {
  unlocked = false;
}
