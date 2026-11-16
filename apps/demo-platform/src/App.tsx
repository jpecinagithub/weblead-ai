import { useEffect, useState } from 'react';
import { DEMO_NOTICE } from '@weblead/agent-designer';
import { getPilotLead } from '@weblead/shared';

/** Slug from the path: /demos/{slug}. No router dep in Phase 0. */
function slugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/demos\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function App() {
  const [slug, setSlug] = useState<string | null>(() => slugFromPath(window.location.pathname));

  useEffect(() => {
    const onPop = () => setSlug(slugFromPath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (!slug) {
    return (
      <main>
        <div className="notice">{DEMO_NOTICE}</div>
        <h1>WebLead AI — Plataforma de demos</h1>
        <p>
          Fase 0 — esqueleto. Las demos viven en <code>/demos/{'{slug}'}</code>. Ejemplo:{' '}
          <a href="/demos/fontaneria-la-moderna">/demos/fontaneria-la-moderna</a>
        </p>
      </main>
    );
  }

  const lead = getPilotLead(
    // match by slugified pilot name (seed only — no invented businesses)
    [4, 6, 7, 8, 13, 17, 19, 24, 25, 26].find((id) => slugify(getPilotLead(id)?.name ?? '') === slug) ?? -1,
  );

  return (
    <main>
      <div className="notice">{DEMO_NOTICE}</div>
      {lead ? (
        <>
          <h1>{lead.name}</h1>
          <p className="sub">
            {lead.sector} · {lead.address ?? 'Logroño'} · {lead.phone ?? 'sin teléfono verificado'}
          </p>
          <p>
            Demo conceptual generada por WebLead AI (Fase 0: estructura vacía, sin contenido real).
            Actividad: {lead.activity} · Score de oportunidad: {lead.score.total}/100.
          </p>
        </>
      ) : (
        <>
          <h1>Demo no encontrada: {slug}</h1>
          <p>En Fase 0 solo existen demos conceptuales de los 10 leads del piloto de Logroño.</p>
        </>
      )}
    </main>
  );
}
