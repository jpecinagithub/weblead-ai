import { useEffect, useState } from 'react';
import type { CostsSummary } from '@weblead/cost-control';
import { INTEGRATIONS } from '@weblead/integrations';
import { BUSINESS_STATES, type BusinessState, type PilotLead } from '@weblead/shared';

type LeadWithState = PilotLead & { state: BusinessState };

function eur(cents: number | null): string {
  if (cents === null) return 'sin confirmar';
  return `${(cents / 100).toFixed(2)} €`;
}

export default function App() {
  const [leads, setLeads] = useState<LeadWithState[]>([]);
  const [costs, setCosts] = useState<CostsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/businesses')
      .then((res) => {
        if (!res.ok) throw new Error(`API ${res.status}`);
        return res.json() as Promise<LeadWithState[]>;
      })
      .then(setLeads)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'API no disponible'));
    fetch('/api/costs/summary')
      .then((res) => {
        if (!res.ok) throw new Error(`API ${res.status}`);
        return res.json() as Promise<CostsSummary>;
      })
      .then(setCosts)
      .catch(() => undefined);
  }, []);

  const qualified = leads.filter((l) => l.score.total >= 70).length;

  return (
    <main>
      <header>
        <h1>WebLead AI — Dashboard</h1>
        <p className="sub">Fase B — Inteligencia artificial · Piloto Logroño · sin DB aún (seed de solo lectura)</p>
      </header>

      <section>
        <h2>Pipeline del Orchestrator (18 estados)</h2>
        <div className="states">
          {BUSINESS_STATES.map((s) => (
            <span key={s} className="state">{s}</span>
          ))}
        </div>
      </section>

      <section>
        <h2>Leads del piloto — {leads.length} empresas · {qualified} con score ≥ 70</h2>
        {error ? (
          <p className="error">
            No se pudo cargar la API ({error}). Arranca la API con <code>pnpm --filter @weblead/api dev</code> y
            recarga.
          </p>
        ) : leads.length === 0 ? (
          <p>Cargando leads…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Sector</th>
                <th>Actividad</th>
                <th>Score</th>
                <th>Estado</th>
                <th>Contacto</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td>{l.name}</td>
                  <td>{l.sector}</td>
                  <td>{l.activity}</td>
                  <td>{l.score.total}</td>
                  <td>{l.state}</td>
                  <td>{[l.phone, l.email].filter(Boolean).join(' · ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="note">
          Datos del piloto Fase A (<code>docs/feasibility-data.csv</code>, 2026-11-16). Solo lectura: ningún
          lead se ha contactado ni se contactará sin aprobación y base legal.
        </p>
      </section>

      <section>
        <h2>Costes (8 indicadores)</h2>
        {costs ? (
          <>
            <ul>
              <li>
                <strong>Coste total:</strong> estimado {eur(costs.totalEstimatedCostCents)} · confirmado{' '}
                {eur(costs.totalConfirmedCostCents)}
              </li>
              <li>
                <strong>Por agente:</strong>{' '}
                {Object.keys(costs.byAgent).length === 0
                  ? 'sin datos'
                  : Object.entries(costs.byAgent)
                      .map(([a, v]) => `${a}: ${eur(v.estimatedCostCents)} est. (${v.requests} peticiones)`)
                      .join(' · ')}
              </li>
              <li>
                <strong>Por empresa investigada:</strong>{' '}
                {Object.keys(costs.byBusiness).length === 0
                  ? 'sin datos'
                  : Object.entries(costs.byBusiness)
                      .map(([b, v]) => `${b}: ${eur(v.estimatedCostCents)} est.`)
                      .join(' · ')}
              </li>
              <li>
                <strong>Por web generada:</strong>{' '}
                {Object.keys(costs.byWebsite).length === 0 ? 'sin datos' : 'ver detalle en API'}
              </li>
              <li>
                <strong>Por oportunidad comercial:</strong>{' '}
                {Object.keys(costs.byOpportunity).length === 0 ? 'sin datos' : 'ver detalle en API'}
              </li>
              <li>
                <strong>Consumo por proveedor:</strong>{' '}
                {costs.byProvider.length === 0
                  ? 'sin datos'
                  : costs.byProvider
                      .map(
                        (p) =>
                          `${p.provider}: ${p.requests} peticiones, ${p.promptTokens + p.completionTokens} tokens, ${eur(p.estimatedCostCents)} est.`,
                      )
                      .join(' · ')}
              </li>
              <li>
                <strong>Cuotas gratuitas:</strong>{' '}
                {costs.freeQuotas.map((q) => `${q.label}${q.known ? ` — restantes: ${q.remaining}` : ' (restante sin consultar)'}`).join(' · ')}
              </li>
              <li>
                <strong>Alertas:</strong>{' '}
                {costs.alerts.length === 0 ? 'ninguna' : costs.alerts.map((a) => a.message).join(' ')}
              </li>
            </ul>
            <p className="note">
              Presupuesto de referencia: {(costs.budget.referenceMonthlyBudgetEurCents / 100).toFixed(0)} €/mes
              adicionales máx. · Límite efectivo autorizado:{' '}
              {(costs.budget.effectiveSpendLimitEurCents / 100).toFixed(2)} € (cero hasta aprobación expresa
              de Jon). Estimado y confirmado siempre separados.
            </p>
          </>
        ) : (
          <p>Cargando costes…</p>
        )}
      </section>

      <section>
        <h2>Configuración e integraciones</h2>
        <table>
          <thead>
            <tr>
              <th>Integración</th>
              <th>Estado</th>
              <th>Función</th>
              <th>Auth</th>
              <th>Límites conocidos</th>
              <th>Coste potencial</th>
              <th>Última comprobación</th>
            </tr>
          </thead>
          <tbody>
            {INTEGRATIONS.map((i) => (
              <tr key={i.id}>
                <td>{i.name}</td>
                <td>{i.status}</td>
                <td>{i.function}</td>
                <td>{i.authType}</td>
                <td>{i.knownLimits}</td>
                <td>{i.potentialCost}</td>
                <td>{i.lastCheckedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="note">Nunca se muestran claves API completas en el frontend.</p>
      </section>

      <footer>
        <p>WebLead AI · Fase B — Inteligencia artificial · Autor: jpecina</p>
      </footer>
    </main>
  );
}
