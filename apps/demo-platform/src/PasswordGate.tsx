import { useState, type FormEvent, type ReactNode } from 'react';
import { DEMO_NOTICE } from '@weblead/agent-designer';
import { checkPassword, isUnlocked, markUnlocked } from './password-gate.js';

/**
 * Puerta de clave de la plataforma de demos (orden de Jon 2026-11-17).
 *
 * Sin desbloquear no se renderiza ningún contenido de las demos (ni el
 * índice ni las fichas de empresa): solo esta pantalla. El único
 * formulario de toda la plataforma es este campo de clave; los
 * formularios de contacto siguen prohibidos y no existen.
 */
export default function PasswordGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean>(() => isUnlocked());
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  if (unlocked) return <>{children}</>;

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setChecking(true);
    setError(null);
    const ok = await checkPassword(password);
    setChecking(false);
    if (ok) {
      markUnlocked();
      setUnlocked(true);
    } else {
      setError('La clave no es correcta. Inténtalo de nuevo.');
      setPassword('');
    }
  }

  return (
    <main className="gate">
      <div className="notice">{DEMO_NOTICE}</div>
      <div className="gate-card">
        <h1>WebLead AI — Plataforma de demos</h1>
        <p>
          Las webs de prueba de las empresas de Logroño están protegidas con
          una clave. Introdúcela para verlas.
        </p>
        <form onSubmit={onSubmit} aria-label="Acceso con clave">
          <label htmlFor="demo-password">Clave de acceso</label>
          <input
            id="demo-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
          />
          {error ? (
            <p className="gate-error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={checking}>
            {checking ? 'Comprobando…' : 'Entrar'}
          </button>
        </form>
        <p className="gate-note">
          Si te hemos enviado el enlace a una demo, la clave viene en el
          mismo email.
        </p>
      </div>
    </main>
  );
}
