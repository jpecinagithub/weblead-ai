/**
 * Re-audit the 10 redesigned demos (segunda tanda 2026-11-17).
 *
 * Runs, per demo, the pure content audit (auditWebsiteContent vs the
 * Fase A dossier facts from pilot-leads.json) plus the live Playwright
 * audit (runPlaywrightAudit against the demo-platform preview server),
 * and merges both into one report per demo — the same two layers as
 * Fase D, with the new no-form checks in both.
 *
 * Screenshots: docs/segunda-tanda-10-leads/screenshots/{slug}-{desktop,mobile}.png
 * Output: a table with the 4 scores per demo + every finding. Exit code 1
 * when any demo is not PASSED 100/100/100/100. This script writes NOTHING
 * to generated-demos.ts: auditStatus is filled in by hand after reviewing
 * the results (see docs/segunda-tanda-10-leads.md).
 *
 * Prerequisite: the demo-platform preview server on http://localhost:5174
 * (pnpm --filter @weblead/demo-platform preview --port 5174).
 *
 * Usage: pnpm --filter @weblead/api audit:segunda-tanda
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  auditWebsiteContent,
  mergePlaywrightFindings,
  runPlaywrightAudit,
  type AuditDossierFacts,
} from '@weblead/agent-auditor';
import type { GeneratedWebsiteContent } from '@weblead/website-generator';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const BASE_URL = process.env.DEMO_BASE_URL ?? 'http://localhost:5174';
const SHOTS_DIR = join(ROOT, 'docs/segunda-tanda-10-leads/screenshots');

type PilotLead = {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  activity: string;
};

type DemoFileRow = { content: GeneratedWebsiteContent; businessState: string };

function readDemosFile(): DemoFileRow[] {
  const raw = readFileSync(join(ROOT, 'apps/demo-platform/src/data/generated-demos.ts'), 'utf8');
  const marker = 'export const GENERATED_DEMOS: GeneratedDemo[] = ';
  const at = raw.indexOf(marker);
  if (at < 0) throw new Error('GENERATED_DEMOS export not found.');
  return JSON.parse(raw.slice(at + marker.length).replace(/;\s*$/, '')) as DemoFileRow[];
}

async function main(): Promise<void> {
  const leads: PilotLead[] = JSON.parse(
    readFileSync(join(ROOT, 'packages/shared/src/data/pilot-leads.json'), 'utf8'),
  );
  const demos = readDemosFile();
  let allPassed = true;
  for (const demo of demos) {
    const c = demo.content;
    const lead = leads.find((l) => l.name === c.businessName);
    if (!lead) throw new Error(`Pilot lead not found for "${c.businessName}".`);
    const dossier: AuditDossierFacts = {
      name: lead.name,
      address: lead.address,
      phone: lead.phone,
      email: lead.email,
      services: [...c.services.items],
      activity: lead.activity,
      slug: c.businessSlug,
    };
    const contentReport = auditWebsiteContent(c, dossier);
    const url = `${BASE_URL}/demos/${c.businessSlug}`;
    const pw = await runPlaywrightAudit(url, SHOTS_DIR, c.businessSlug);
    const report = mergePlaywrightFindings(contentReport, pw.findings);
    const s = report.scores;
    const line =
      `${c.businessSlug}: ${report.result} ` +
      `empresarial ${s.business} / visual ${s.visual} / técnica ${s.technical} / contenido ${s.content} ` +
      `| ${report.findings.length} hallazgos | carga escritorio ${pw.loadMs.desktop} ms, móvil ${pw.loadMs.mobile} ms`;
    console.log(line);
    for (const f of report.findings) {
      console.log(`    [${f.severity}/${f.category}] ${f.message}`);
    }
    if (report.result !== 'PASSED' || s.business !== 100 || s.visual !== 100 || s.technical !== 100 || s.content !== 100) {
      allPassed = false;
    }
  }
  console.log(allPassed ? 'TODAS LAS DEMOS: PASSED 100/100/100/100' : 'HAY DEMOS SIN 100/100/100/100 — ver hallazgos arriba.');
  if (!allPassed) process.exitCode = 1;
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
