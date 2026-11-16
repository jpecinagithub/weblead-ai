# @weblead/agent-core

Orchestrator skeleton: agent registry (`Agent` interface + `stubAgent`),
and the single state-change gate `transitionBusiness` / `Orchestrator.transition`,
which validates every change through `@weblead/shared`'s state machine.
No agent logic lives here yet — Phases 1-5 implement each agent.
