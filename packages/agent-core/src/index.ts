/**
 * Agent Core — Orchestrator skeleton (Phase 0).
 * The Orchestrator owns campaigns, task assignment and the business state
 * machine. It never skips a transition: every state change goes through
 * `assertTransition` from @weblead/shared. Agent runs are stubs in Phase 0;
 * Phases 1-5 implement each agent's `run`.
 */
import type { LlmProvider } from '@weblead/ai-engine';
import {
  assertTransition,
  type BusinessState,
} from '@weblead/shared';

export type AgentKind = 'orchestrator' | 'researcher' | 'designer' | 'auditor' | 'sales' | 'crm';

export type AgentContext = {
  businessId: string;
  campaignId?: string;
  llm: LlmProvider;
};

export type AgentResult = {
  status: 'succeeded' | 'failed' | 'not-implemented';
  summary: string;
  data?: Record<string, unknown>;
};

export interface Agent {
  readonly kind: AgentKind;
  readonly name: string;
  run(ctx: AgentContext): Promise<AgentResult>;
}

/** A stub agent: present in the registry, explicitly not implemented yet. */
export function stubAgent(kind: AgentKind, name: string): Agent {
  return {
    kind,
    name,
    async run(): Promise<AgentResult> {
      return { status: 'not-implemented', summary: `${name} is not implemented yet (Phase 0 skeleton).` };
    },
  };
}

export type TransitionRequest = {
  businessId: string;
  from: BusinessState;
  to: BusinessState;
};

/**
 * The Orchestrator's single gate for state changes. Throws
 * IllegalTransitionError on any jump the machine does not allow
 * (e.g. DISCOVERED -> APPROVED). Persistence (Prisma) lands in Phase 1;
 * Phase 0 validates and returns the new state.
 */
export function transitionBusiness(req: TransitionRequest): BusinessState {
  return assertTransition(req.from, req.to);
}

export class Orchestrator {
  private readonly agents = new Map<AgentKind, Agent>();

  register(agent: Agent): void {
    this.agents.set(agent.kind, agent);
  }

  getAgent(kind: AgentKind): Agent | undefined {
    return this.agents.get(kind);
  }

  transition(req: TransitionRequest): BusinessState {
    return transitionBusiness(req);
  }
}
