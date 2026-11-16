/**
 * Applies the real Fase C LLM summaries (fase-c/llm-summaries-tta.json,
 * produced by fase-c/verify-dossiers-tta.py with Top-Tools-Ai-Basic via
 * the registered credential) to the dossiers already persisted in
 * Postgres: sets ResearchReport.llmSummary and records one UsageRecord
 * per dossier (estimated 0 cents, confirmed null — the provider returns
 * tokens only, no price).
 *
 * Usage: pnpm --filter @weblead/api apply:llm-summaries
 */
import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';
import { prisma } from '@weblead/database';
import { recordLlmUsage } from '@weblead/agent-researcher';

dotenv.config({ path: new URL('../../../.env', import.meta.url) });

type LlmSummaryEntry = {
  pilotId: number;
  business: string;
  model: string;
  provider: string;
  http: number;
  /** JSON file uses snake_case (Python writer). */
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  summary: string;
};

async function main(): Promise<void> {
  const entries = JSON.parse(
    readFileSync(new URL('../../../fase-c/llm-summaries-tta.json', import.meta.url), 'utf8'),
  ) as LlmSummaryEntry[];
  for (const entry of entries) {
    const business = await prisma.business.findUnique({ where: { pilotId: entry.pilotId } });
    if (!business) throw new Error(`Business pilotId=${entry.pilotId} not found in Postgres.`);
    const report = await prisma.researchReport.findFirst({
      where: { businessId: business.id },
      orderBy: { createdAt: 'desc' },
    });
    if (!report) throw new Error(`No ResearchReport for pilotId=${entry.pilotId}.`);
    const execution = await prisma.agentExecution.findFirst({
      where: { businessId: business.id },
      orderBy: { createdAt: 'desc' },
    });
    await prisma.researchReport.update({
      where: { id: report.id },
      data: { llmSummary: entry.summary },
    });
    const usageId = await recordLlmUsage(prisma, business.id, execution?.id ?? null, {
      provider: entry.provider,
      model: entry.model,
      service: 'fase-c-llm-summary',
      promptTokens: entry.prompt_tokens,
      completionTokens: entry.completion_tokens,
      estimatedCostCents: 0,
      confirmedCostCents: null,
    });
    console.log(
      `  pilot ${entry.pilotId} ${entry.business}: llmSummary stored ` +
        `(${entry.prompt_tokens}+${entry.completion_tokens}=${entry.total_tokens} tokens, ` +
        `http=${entry.http}) usage=${usageId.slice(0, 8)}`,
    );
  }
  console.log('LLM summaries applied.');
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
