# @weblead/agent-crm

Fase E (cerrada 2026-11-16). Pipeline con los 13 estados exactos del prompt (NEW, QUALIFIED, DEMO_CREATED, AUDITED, PROPOSAL_READY, AWAITING_APPROVAL, CONTACTED, RESPONDED, INTERESTED, NEGOTIATION, CUSTOMER, LOST, SUPPRESSED), derivado del estado del Orchestrator + propuestas/borradores/bajas. Histórico completo (CRMActivity), recordatorios de borradores aprobados sin enviar, estadísticas de conversión por estado y bajas SUPPRESSED que bloquean cualquier borrador futuro (el gate de Sales lo comprueba primero). Ver docs/phase-e-report.md.
