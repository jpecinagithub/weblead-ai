/**
 * Cost control module — instrucciones-equipo-agentes §8.
 * Records every billable (or free-tier) consumption event and enforces the
 * budget. Two rules are load-bearing:
 *
 * 1. Estimated cost and confirmed cost are ALWAYS separate fields. A
 *    provider that does not report prices (Top Tools AI Basic reports
 *    tokens only) can never produce a "confirmed" cost.
 * 2. Reference budget is 30 EUR/month extra, but the EFFECTIVE authorised
 *    spend limit is ZERO until Jon expressly approves a spend. The
 *    SpendGate blocks paid LLM calls while the effective limit is 0.
 *    Free-tier calls that are verified free (Top-Tools-Ai-Basic, measured
 *    0.00 USD in Fase A; mock) are allowed.
 *
 * Persistence: Prisma has UsageRecord + BudgetLimit (§8 entities) for the
 * durable store. Phase 0 keeps an in-memory store (the API has no DB
 * wiring yet); Fase B moves recording to Prisma. The summary shape is
 * final: GET /api/costs/summary returns exactly these 8 indicators.
 */
import {
  PROVIDERS,
  SpendBlockedError,
  type LlmProviderName,
  type SpendGate,
} from '@weblead/ai-engine';

/** Reference budget: 30 EUR/month additional, max (§8). In euro cents. */
export const REFERENCE_MONTHLY_BUDGET_EUR_CENTS = 3000;

/** Effective authorised spend: ZERO until Jon expressly approves (§8). */
export const DEFAULT_EFFECTIVE_SPEND_LIMIT_EUR_CENTS = 0;

export type AgentKind = 'orchestrator' | 'researcher' | 'designer' | 'auditor' | 'sales' | 'crm';

/**
 * Any provider whose consumption must be recorded — LLM providers plus
 * non-LLM services. Apify is registrable here (Fase C candidate):
 * its runs, if ever approved, are recorded like any other provider.
 * No Apify call is made in Phase 0; no account, no credit consumed.
 */
export type ServiceProvider = LlmProviderName | 'apify' | 'gmail' | 'vercel' | 'other';

export type UsageEntry = {
  provider: ServiceProvider;
  service: string;
  model: string;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  imagesGenerated: number;
  /** Cost estimate (provider price list / token math). Never "real". */
  estimatedCostCents: number;
  /** Cost confirmed by the provider (invoice/usage API). Null = unknown. */
  confirmedCostCents: number | null;
  businessId?: string;
  agentKind?: AgentKind;
  websiteProjectId?: string;
  recordedAt: string;
};

export type ProviderConsumption = {
  provider: ServiceProvider;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostCents: number;
  confirmedCostCents: number | null;
};

export type FreeQuota = {
  provider: ServiceProvider;
  label: string;
  /** Remaining free quota as reported by the provider, if known. */
  remaining: string | null;
  known: boolean;
};

export type CostAlert = {
  level: 'info' | 'warning' | 'blocked';
  message: string;
};

export type CostsSummary = {
  /** 1. Total project cost (estimated vs confirmed, always separate). */
  totalEstimatedCostCents: number;
  totalConfirmedCostCents: number | null;
  /** 2. Cost per agent. */
  byAgent: Record<string, { estimatedCostCents: number; confirmedCostCents: number | null; requests: number }>;
  /** 3. Cost per investigated business. */
  byBusiness: Record<string, { estimatedCostCents: number; confirmedCostCents: number | null; requests: number }>;
  /** 4. Cost per generated website. */
  byWebsite: Record<string, { estimatedCostCents: number; confirmedCostCents: number | null; requests: number }>;
  /** 5. Cost per commercial opportunity (businesses that reached SALES_*). */
  byOpportunity: Record<string, { estimatedCostCents: number; confirmedCostCents: number | null; requests: number }>;
  /** 6. Consumption per provider. */
  byProvider: ProviderConsumption[];
  /** 7. Free quotas available, when the provider reports them. */
  freeQuotas: FreeQuota[];
  /** 8. Limit alerts and possible charges. */
  alerts: CostAlert[];
  budget: {
    referenceMonthlyBudgetEurCents: number;
    effectiveSpendLimitEurCents: number;
  };
};

function emptyBucket() {
  return { estimatedCostCents: 0, confirmedCostCents: null as number | null, requests: 0 };
}

export class InMemoryUsageStore {
  private readonly entries: UsageEntry[] = [];

  record(entry: Omit<UsageEntry, 'recordedAt'> & { recordedAt?: string }): UsageEntry {
    const full: UsageEntry = { ...entry, recordedAt: entry.recordedAt ?? new Date().toISOString() };
    this.entries.push(full);
    return full;
  }

  getEntries(): readonly UsageEntry[] {
    return this.entries;
  }

  clear(): void {
    this.entries.length = 0;
  }

  summary(effectiveSpendLimitEurCents: number = DEFAULT_EFFECTIVE_SPEND_LIMIT_EUR_CENTS): CostsSummary {
    const byAgent: CostsSummary['byAgent'] = {};
    const byBusiness: CostsSummary['byBusiness'] = {};
    const byWebsite: CostsSummary['byWebsite'] = {};
    const byOpportunity: CostsSummary['byOpportunity'] = {};
    const byProviderMap = new Map<ServiceProvider, ProviderConsumption>();
    let totalEstimated = 0;
    let totalConfirmed: number | null = null;

    for (const e of this.entries) {
      totalEstimated += e.estimatedCostCents;
      if (e.confirmedCostCents !== null) {
        totalConfirmed = (totalConfirmed ?? 0) + e.confirmedCostCents;
      }
      const addTo = (bucket: { estimatedCostCents: number; confirmedCostCents: number | null; requests: number }) => {
        bucket.estimatedCostCents += e.estimatedCostCents;
        bucket.requests += e.requests;
        if (e.confirmedCostCents !== null) {
          bucket.confirmedCostCents = (bucket.confirmedCostCents ?? 0) + e.confirmedCostCents;
        }
      };
      if (e.agentKind) addTo((byAgent[e.agentKind] ??= emptyBucket()));
      if (e.businessId) addTo((byBusiness[e.businessId] ??= emptyBucket()));
      if (e.websiteProjectId) addTo((byWebsite[e.websiteProjectId] ??= emptyBucket()));
      // Opportunity = business that has any sales-stage cost; in Phase 0 the
      // bucket is filled by the caller tagging entries, so reuse businessId
      // only when the agent is sales/crm.
      if (e.businessId && (e.agentKind === 'sales' || e.agentKind === 'crm')) {
        addTo((byOpportunity[e.businessId] ??= emptyBucket()));
      }
      const p = byProviderMap.get(e.provider) ?? {
        provider: e.provider,
        requests: 0,
        promptTokens: 0,
        completionTokens: 0,
        estimatedCostCents: 0,
        confirmedCostCents: null,
      };
      p.requests += e.requests;
      p.promptTokens += e.promptTokens;
      p.completionTokens += e.completionTokens;
      p.estimatedCostCents += e.estimatedCostCents;
      if (e.confirmedCostCents !== null) p.confirmedCostCents = (p.confirmedCostCents ?? 0) + e.confirmedCostCents;
      byProviderMap.set(e.provider, p);
    }

    const alerts: CostAlert[] = [];
    if (effectiveSpendLimitEurCents === 0) {
      alerts.push({
        level: 'blocked',
        message:
          'Effective spend limit is 0 EUR: paid LLM calls are blocked until Jon expressly approves a spend. Only verified free-tier calls are allowed.',
      });
    }
    if (totalEstimated > 0 && totalConfirmed === null) {
      alerts.push({
        level: 'info',
        message: 'Costs so far are estimates only — no provider has confirmed a charge.',
      });
    }

    return {
      totalEstimatedCostCents: totalEstimated,
      totalConfirmedCostCents: totalConfirmed,
      byAgent,
      byBusiness,
      byWebsite,
      byOpportunity,
      byProvider: [...byProviderMap.values()],
      freeQuotas: [
        { provider: 'top-tools-ai', label: 'Top Tools AI Basic — 10M tokens/day (free tier)', remaining: null, known: false },
        { provider: 'coarena', label: 'CoArena Model API — 5 USD/day (free tier)', remaining: null, known: false },
        // Apify: existing 5 USD credit (Jon, 2026-11-16), NOT a free tier.
        // Expiry UNKNOWN — open question for Jon. No runs made, nothing consumed.
        { provider: 'apify', label: 'Apify — 5 USD credit available (expiry unknown)', remaining: '5 USD (caducidad desconocida)', known: false },
      ],
      alerts,
      budget: {
        referenceMonthlyBudgetEurCents: REFERENCE_MONTHLY_BUDGET_EUR_CENTS,
        effectiveSpendLimitEurCents,
      },
    };
  }
}

/** The single Phase 0 store (replaced by Prisma-backed recording in Fase B). */
export const usageStore = new InMemoryUsageStore();

/**
 * Spend gate (§8): blocks any call whose provider/model is not on the
 * verified-free list while the effective authorised spend is 0.
 * "Verified free" is an explicit allowlist, never an assumption: only
 * Top-Tools-Ai-Basic (measured 0.00 USD in Fase A) and mock are free.
 */
export function createSpendGate(
  effectiveSpendLimitEurCents: number = DEFAULT_EFFECTIVE_SPEND_LIMIT_EUR_CENTS,
): SpendGate {
  return {
    check(provider: LlmProviderName, model: string): void {
      if (effectiveSpendLimitEurCents > 0) return;
      const info = PROVIDERS[provider];
      const verifiedFree =
        (provider === 'top-tools-ai' && model === 'Top-Tools-Ai-Basic') || provider === 'mock';
      if (verifiedFree) return;
      throw new SpendBlockedError(
        provider,
        model,
        `effective spend limit is 0 EUR (reference budget 30 EUR/month not yet approved). ` +
          `Provider status: ${info.status}. No paid call may run until Jon approves a spend.`,
      );
    },
  };
}
