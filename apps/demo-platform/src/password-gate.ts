/**
 * Puerta de clave de la plataforma de demos (orden de Jon 2026-11-17).
 *
 * La plataforma entera (índice + 10 demos) queda detrás de una clave
 * sencilla. La clave NUNCA se guarda en texto plano: en el código solo
 * vive su hash SHA-256 y se compara el hash de lo que escribe el usuario
 * (crypto.subtle, disponible en HTTPS y en localhost). El acceso
 * desbloqueado persiste en sessionStorage durante la sesión del navegador.
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

export const STORAGE_KEY = 'weblead-demos-unlocked';

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

/** true cuando esta sesión del navegador ya desbloqueó la plataforma. */
export function isUnlocked(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      window.sessionStorage.getItem(STORAGE_KEY) === '1'
    );
  } catch {
    return false;
  }
}

/** Marca esta sesión del navegador como desbloqueada. */
export function markUnlocked(): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // Sin almacenamiento (modo privado estricto, etc.): la puerta se
    // volverá a pedir en la siguiente navegación. No se rompe nada.
  }
}
