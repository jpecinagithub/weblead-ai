/**
 * Generate the Fase D demos (real run, not a test).
 *
 * Reads the LLM drafts measured in fase-d/llm-design-drafts.json (Top Tools
 * AI Basic, 2 calls), runs the Designer for the 2 QUALIFIED pilot businesses
 * (Santiago Ferrer, pilot 6; Begoña Ruiz, pilot 17) through the real
 * designWebsite pipeline (QUALIFIED -> DESIGNING -> PREVIEW_READY, persisted
 * in Postgres with WebsiteProject + WebsiteAsset + UsageRecord), then exports
 * the generated content into apps/demo-platform/src/data/generated-demos.ts
 * and refreshes apps/demo-platform/public/sitemap.xml.
 *
 * Idempotent: re-running it re-designs the same businesses (upsert by slug)
 * and re-exports the demos file (e.g. after an audit, to refresh states).
 *
 * Usage: pnpm --filter @weblead/api generate:designs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import dotenv from 'dotenv';
import { prisma } from '@weblead/database';
import { designWebsite } from '@weblead/agent-designer';
import { getPilotLead } from '@weblead/shared';
import { exportDemos } from './export-demos.js';
import type { LlmDraft } from '@weblead/website-generator';

dotenv.config({ path: new URL('../../../.env', import.meta.url) });

type LlmDraftEntry = {
  slug: string;
  pilot_id: number;
  model: string;
  provider: string;
  http: number;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  response: string;
};

function parseDraft(entry: LlmDraftEntry): LlmDraft {
  const draft: LlmDraft = {};
  for (const line of entry.response.split('\n')) {
    const subtitle = line.match(/^SUBTITULO:\s*(.+)$/);
    if (subtitle) draft.subtitle = subtitle[1]!.trim();
    const about = line.match(/^SOBRE:\s*(.+)$/);
    if (about) draft.about = about[1]!.trim();
  }
  return draft;
}

async function main(): Promise<void> {
  const drafts: LlmDraftEntry[] = JSON.parse(
    readFileSync(new URL('../../../fase-d/llm-design-drafts.json', import.meta.url), 'utf8'),
  );
  const pilotIds = [6, 17];
  for (const pilotId of pilotIds) {
    const lead = getPilotLead(pilotId);
    if (!lead) throw new Error(`Pilot lead ${pilotId} not found in the shared seed.`);
    const business = await prisma.business.findUnique({ where: { pilotId } });
    if (!business) throw new Error(`Business pilot ${pilotId} (${lead.name}) not in Postgres — run seed:research first.`);
    const entry = drafts.find((d) => d.pilot_id === pilotId);
    const llmDraft = entry ? parseDraft(entry) : null;
    // The LLM call happened once per business: only record its usage when
    // the project is created for the first time, never on a re-design.
    const existingProject = await prisma.websiteProject.findUnique({ where: { slug: business.slug } });
    const result = await designWebsite(prisma, {
      businessId: business.id,
      llmDraft,
      llmUsage:
        entry && !existingProject
          ? {
              provider: entry.provider,
              model: entry.model,
              promptTokens: entry.prompt_tokens ?? 0,
              completionTokens: entry.completion_tokens ?? 0,
              estimatedCostCents: 0,
              confirmedCostCents: null,
            }
          : null,
      activitySignal: lead.activitySignal,
    });
    console.log(
      `  pilot ${pilotId} ${lead.name}: template=${result.templateId} ` +
        `llm subtitle=${result.content.llm.acceptedSubtitle ? 'accepted' : 'rejected'} ` +
        `about=${result.content.llm.acceptedAbout ? 'accepted' : 'rejected'} ` +
        `rejections=[${result.content.llm.rejections.join('; ') || 'none'}] ` +
        `-> ${result.statePath.join(' > ')}`,
    );
  }

  await exportDemos();
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
