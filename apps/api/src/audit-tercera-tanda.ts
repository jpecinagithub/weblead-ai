/**
 * Audit the 17 new demos (tercera tanda 2026-11-17).
 *
 * Runs, per demo, the pure content audit (auditWebsiteContent vs the
 * dossier facts from docs/tercera-tanda-17-leads.json `build_now`) plus
 * the live Playwright audit (runPlaywrightAudit against the
 * demo-platform preview server), and merges both into one report per
 * demo — the same two layers as audit-segunda-tanda.ts.
 *
 * Dossiers: name/address?/phone?/email from the JSON, services: [] (the
 * generator marks services pendingConfirmation), activity 'CONFIRMED',
 * slug via slugify(name, municipality) with municipality = town without
 * the " capital" suffix. Contact expectations passed to Playwright:
 * { tel: !!lead.phone, maps: !!lead.address } — only Grinan and Aura
 * have a street address (Maps link expected); Pelayo has no phone
 * (no tel: link expected). A demo must never invent a channel it does
 * not have; the auditor only fails when NO contact channel is shown.
 *
 * Screenshots: docs/tercera-tanda-17-leads/screenshots/{slug}-{desktop,mobile}.png
 * Output: a table with the 4 scores per demo + every finding. Exit code 1
 * when any demo is not PASSED 100/100/100/100. This script writes NOTHING
 * to generated-demos.ts: auditStatus is sealed by hand after reviewing
 * the results (see docs/tercera-tanda-17-leads.md).
 *
 * Prerequisite: the demo-platform preview server on http://localhost:5174
 * (pnpm --filter @weblead/demo-platform preview --port 5174).
 *
 * Usage: pnpm --filter @weblead/api audit:tercera-tanda
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
import { slugify } from '@weblead/agent-researcher';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const BASE_URL = process.env.DEMO_BASE_URL ?? 'http://localhost:5174';
const SHOTS_DIR = join(ROOT, 'docs/tercera-tanda-17-leads/screenshots');

type TerceraLead = {
  name: string;
  town: string;
  address?: string;
  phone?: string;
  email: string;
};

type DemoFileRow = { content: GeneratedWebsiteContent; businessState: string };

function readDemosFile(): DemoFileRow[] {
  const raw = readFileSync(join(ROOT, 'apps/demo-platform/src/data/generated-demos.ts'), 'utf8');
  const marker = 'export const GENERATED_DEMOS: GeneratedDemo[] = ';
  const at = raw.indexOf(marker);
  if (at < 0) throw new Error('GENERATED_DEMOS export not found.');
  return JSON.parse(raw.slice(at + marker.length).replace(/;\s*$/, '')) as DemoFileRow[];
}

function municipality(town: string): string {
  return town.replace(/ capital$/, '');
}

async function main(): Promise<void> {
  const doc = JSON.parse(
    readFileSync(join(ROOT, 'docs/tercera-tanda-17-leads.json'), 'utf8'),
  ) as { build_now: TerceraLead[] };
  const leads = doc.build_now;
  if (leads.length !== 17) throw new Error(`Expected 17 leads in build_now, got ${leads.length}.`);
  const demos = readDemosFile();
  let allPassed = true;
  for (const lead of leads) {
    const slug = slugify(lead.name, municipality(lead.town));
    const demo = demos.find((d) => d.content.businessSlug === slug);
    if (!demo) throw new Error(`Demo not found for slug "${slug}" (${lead.name}).`);
    if (demo.businessState !== 'PREVIEW_READY') {
      throw new Error(`Demo "${slug}" is not PREVIEW_READY (state: ${demo.businessState}) — refusing to audit a sealed demo.`);
    }
    const dossier: AuditDossierFacts = {
      name: lead.name,
      address: lead.address ?? null,
      phone: lead.phone ?? null,
      email: lead.email,
      services: [],
      activity: 'CONFIRMED',
      slug,
    };
    const contentReport = auditWebsiteContent(demo.content, dossier);
    const url = `${BASE_URL}/demos/${slug}`;
    const pw = await runPlaywrightAudit(url, SHOTS_DIR, slug, {
      tel: !!lead.phone,
      maps: !!lead.address,
    });
    const report = mergePlaywrightFindings(contentReport, pw.findings);
    const s = report.scores;
    const line =
      `${slug}: ${report.result} ` +
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
