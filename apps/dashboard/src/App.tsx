import { useEffect, useState } from 'react';
import type { CostsSummary } from '@weblead/cost-control';
import { INTEGRATIONS } from '@weblead/integrations';
import { BUSINESS_STATES } from '@weblead/shared';
import { businessNameForKey, normalizeLead, type ApiBusinessRow, type DashboardLead } from './leads';

type LeadWithState = DashboardLead;

type PipelineRowView = {
  businessId: string;
  name: string;
  sector: string | null;
  orchestratorState: string;
  crmState: string;
  email: string | null;
  suppressed: boolean;
  suppressionReason: string | null;
  proposalModality: string | null;
  proposalTotalCents: number | null;
  draftId: string | null;
  draftStatus: string | null;
  legalReasonCode: string | null;
  legalAllowed: boolean | null;
};

type PipelineView = {
  rows: PipelineRowView[];
  stats: { total: number; byState: Record<string, number>; conversion: Record<string, number>; suppressed: number; awaitingApproval: number; remindersDue: number };
  reminders: { businessId: string; businessName: string; draftId: string | null; dueAt: string; note: string }[];
};

function eur(cents: number | null): string {
  if (cents === null) return 'sin confirmar';
  return `${(cents / 100).toFixed(2)} €`;
}

export default function App() {
  const [leads, setLeads] = useState<LeadWithState[]>([]);
  const [costs, setCosts] = useState<CostsSummary | null>(null);
  const [pipeline, setPipeline] = useState<PipelineView | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/businesses')
      .then((res) => {
        if (!res.ok) throw new Error(`API ${res.status}`);
        return res.json() as Promise<ApiBusinessRow[]>;
      })
      .then((rows) => setLeads(rows.map(normalizeLead)))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'API no disponible'));
    fetch('/api/costs/summary')
      .then((res) => {
        if (!res.ok) throw new Error(`API ${res.status}`);
        return res.json() as Promise<CostsSummary>;
      })
      .then(setCosts)
      .catch(() => undefined);
    fetch('/api/crm/pipeline')
      .then((res) => {
        if (!res.ok) throw new Error(`API ${res.status}`);
        return res.json() as Promise<PipelineView>;
      })
      .then(setPipeline)
      .catch((err: unknown) => setPipelineError(err instanceof Error ? err.message : 'API no disponible'));
  }, []);

  const qualified = leads.filter((l) => (l.scoreTotal ?? 0) >= 70).length;

  return (
    <main>
      <header>
        <h1>WebLead AI — Dashboard</h1>
        <p className="sub">Fase E — Comercial · Piloto Logroño · borradores locales, sin envío</p>
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
                <tr key={l.key}>
                  <td>{l.name}</td>
                  <td>{l.sector}</td>
                  <td>{l.activity}</td>
                  <td>{l.scoreTotal ?? '—'}</td>
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
        <h2>Comercial — pipeline CRM (13 estados) y estado legal</h2>
        {pipelineError ? (
          <p className="error">No se pudo cargar el pipeline ({pipelineError}).</p>
        ) : !pipeline ? (
          <p>Cargando pipeline…</p>
        ) : (
          <>
            <ul>
              <li>
                <strong>Empresas en pipeline:</strong> {pipeline.stats.total} · Bajas: {pipeline.stats.suppressed} ·
                Pendientes de aprobación: {pipeline.stats.awaitingApproval} · Recordatorios: {pipeline.stats.remindersDue}
              </li>
              <li>
                <strong>Conversión:</strong>{' '}
                {Object.entries(pipeline.stats.conversion)
                  .map(([k, v]) => `${k}: ${v}%`)
                  .join(' · ')}
              </li>
            </ul>
            <table>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Estado CRM</th>
                  <th>Estado legal (LSSI)</th>
                  <th>Propuesta</th>
                  <th>Borrador</th>
                </tr>
              </thead>
              <tbody>
                {pipeline.rows.map((r) => (
                  <tr key={r.businessId}>
                    <td>{r.name}</td>
                    <td>{r.crmState}</td>
                    <td>
                      {r.suppressed
                        ? `SUPPRESSED (${r.suppressionReason ?? 'baja'})`
                        : r.legalAllowed
                          ? 'Permitido'
                          : (r.legalReasonCode ?? '—')}
                    </td>
                    <td>
                      {r.proposalModality
                        ? `${r.proposalModality} · ${eur(r.proposalTotalCents)} (orientativo)`
                        : '—'}
                    </td>
                    <td>{r.draftId ? `${r.draftStatus ?? 'DRAFT'} (local, sin envío)` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pipeline.reminders.length > 0 && (
              <>
                <h3>Recordatorios</h3>
                <ul>
                  {pipeline.reminders.map((rem) => (
                    <li key={rem.businessId}>
                      {rem.businessName}: {rem.note} (vence {new Date(rem.dueAt).toLocaleDateString('es-ES')})
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="note">
              CONTACTED es inalcanzable en esta fase: implica un envío real y no se envía nada. Los borradores son
              locales (Postgres); Gmail está sin conectar (ver docs/gmail-setup.md). Un correo público NO equivale a
              autorización: sin base legal no hay borrador.
            </p>
          </>
        )}
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
                      .map(([b, v]) => `${businessNameForKey(leads, b)}: ${eur(v.estimatedCostCents)} est.`)
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
        <p>WebLead AI · Fase E — Comercial · Autor: jpecina</p>
      </footer>
    </main>
  );
}
