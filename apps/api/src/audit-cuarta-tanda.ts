/**
 * Audit ALL 37 demos (cuarta tanda 2026-11-17): the 27 sealed demos
 * re-audited after the "Datos verificados" section was removed from
 * every demo (render + content changed, so their previous PASSED stamp
 * no longer covers the current render) + the 10 new demos.
 *
 * RE-AUDIT MODE: unlike audit-tercera-tanda.ts, the PREVIEW_READY guard
 * is relaxed — a demo in APPROVED state is audited too, because the
 * section removal changed its render. Any other businessState still
 * aborts. This does not change the normal behaviour of the other audit
 * scripts (their guard is untouched).
 *
 * Two layers per demo, like the previous tandas:
 * 1. Pure content audit (auditWebsiteContent vs the dossier facts:
 *    pilot-leads.json for the 10 Logroño demos, docs/tercera-tanda-
 *    17-leads.json `build_now` for the 17 tercera-tanda demos and
 *    `later_unscored` minus CARPINTERÍA SORIA for the 10 new ones;
 *    services: [] everywhere — every demo marks services as pending
 *    confirmation).
 * 2. Live Playwright audit (runPlaywrightAudit against the
 *    demo-platform preview server) PLUS extra live DOM checks in a
 *    shared browser session: conceptual notice visible, no banned
 *    strings rendered ("Datos verificados", "Fuentes del expediente",
 *    "Señal de actividad", "Actividad verificada", "CONFIRMED"), no
 *    link back to the platform, no desktop overflow — and, for the 10
 *    new demos (no street address in the dossier), no address row and
 *    no Maps link rendered.
 *
 * Contact expectations passed to Playwright: { tel: !!lead.phone,
 * maps: !!lead.address } — a demo must never invent a channel it does
 * not have; the auditor only fails when NO contact channel is shown.
 *
 * Screenshots: docs/cuarta-tanda-10-leads/polish/{slug}-{desktop,mobile}.png
 * Output: a table with the 4 scores per demo + every finding. Exit code 1
 * when any demo is not PASSED 100/100/100/100. This script writes NOTHING
 * to generated-demos.ts: auditStatus is sealed by hand after reviewing
 * the results.
 *
 * Prerequisite: the demo-platform preview server on http://localhost:5174
 * (pnpm --filter @weblead/demo-platform preview --port 5174).
 *
 * Usage: pnpm --filter @weblead/api audit:cuarta-tanda
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
// playwright-core vive como dependencia de @weblead/agent-auditor (pnpm
// aislado: no resuelve desde apps/api); se resuelve desde su package.json.
const requireAuditor = createRequire(join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'packages', 'agent-auditor', 'package.json'));
// Tipado `any` explícito: es un script de auditoría, no código de producto.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { chromium }: any = requireAuditor('playwright-core');
import {
  auditWebsiteContent,
  findChromiumExecutable,
  mergePlaywrightFindings,
  runPlaywrightAudit,
  type AuditDossierFacts,
  type AuditFindingInput,
} from '@weblead/agent-auditor';
import type { GeneratedWebsiteContent } from '@weblead/website-generator';
import { slugify } from '@weblead/agent-researcher';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const BASE_URL = process.env.DEMO_BASE_URL ?? 'http://localhost:5174';
const SHOTS_DIR = join(ROOT, 'docs/cuarta-tanda-10-leads/polish');

const BANNED_RENDERED = [
  'Datos verificados',
  'Fuentes del expediente',
  'Señal de actividad',
  'Actividad verificada',
  'CONFIRMED',
];

type LeadFacts = {
  name: string;
  address: string | null;
  phone: string | null;
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

/** Extra live DOM checks (4ª tanda): notice, banned strings, no back-link, no invented address/Maps. */
async function extraLiveChecks(
  slugs: { slug: string; isNew: boolean }[],
): Promise<Map<string, AuditFindingInput[]>> {
  const out = new Map<string, AuditFindingInput[]>();
  const executablePath = findChromiumExecutable();
  if (!executablePath) throw new Error('No Chromium binary found for the extra live checks.');
  const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  try {
    for (const { slug, isNew } of slugs) {
      const findings: AuditFindingInput[] = [];
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      const url = `${BASE_URL}/demos/${slug}`;
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      const checks = await page.evaluate(() => {
        const site = document.querySelector('.demo-site');
        const notice = site?.querySelector('.notice');
        const text = document.body.innerText;
        return {
          hasSite: !!site,
          noticeVisible:
            !!notice && notice.textContent?.includes('Propuesta conceptual') === true,
          backLinks: Array.from(site?.querySelectorAll('a') ?? [])
            .map((a) => a.getAttribute('href') ?? '')
            .filter((href) => href === '/' || href.startsWith('/demos') || href === '#'),
          backLinkText: text.includes('Volver a la plataforma'),
          addressRow: !!Array.from(site?.querySelectorAll('.contact-row') ?? []).find((row) =>
            row.textContent?.includes('Dirección'),
          ),
          mapsLinks: site?.querySelectorAll('a[href^="https://www.google.com/maps/"]').length ?? 0,
          overflowDesktop: document.documentElement.scrollWidth > window.innerWidth + 1,
        };
      });
      if (!checks.hasSite) {
        findings.push({ severity: 'CRITICAL', category: 'TECHNICAL', message: 'La demo no renderiza .demo-site.', url });
      }
      if (!checks.noticeVisible) {
        findings.push({ severity: 'CRITICAL', category: 'CONTENT', message: 'Aviso conceptual ("Propuesta conceptual…") no visible en la demo.', url });
      }
      for (const banned of BANNED_RENDERED) {
        const present = await page.evaluate(
          (needle: string) => document.body.innerText.includes(needle),
          banned,
        );
        if (present) {
          findings.push({ severity: 'CRITICAL', category: 'CONTENT', message: `Cadena prohibida renderizada en la demo: "${banned}".`, url });
        }
      }
      if (checks.backLinks.length > 0 || checks.backLinkText) {
        findings.push({ severity: 'CRITICAL', category: 'CONTENT', message: `Enlace de vuelta a la plataforma presente (${checks.backLinks.join(', ') || 'texto "Volver a la plataforma"'}).`, url });
      }
      if (checks.overflowDesktop) {
        findings.push({ severity: 'MINOR', category: 'VISUAL', message: 'Desbordamiento horizontal en escritorio (1280 px).', url });
      }
      if (isNew) {
        if (checks.addressRow) {
          findings.push({ severity: 'CRITICAL', category: 'BUSINESS', message: 'La demo nueva muestra una fila de dirección sin tener calle verificada.', url });
        }
        if (checks.mapsLinks > 0) {
          findings.push({ severity: 'CRITICAL', category: 'BUSINESS', message: 'La demo nueva enlaza a Google Maps sin tener dirección verificada.', url });
        }
      }
      await page.close();
      // Valores de contacto recortados: un email largo desborda su caja
      // sin ensanchar el documento (el texto sobresale de la tarjeta y
      // se corta en el borde del viewport), así que el check de overflow
      // por scrollWidth no lo caza — se mide el texto (Range) contra la
      // tarjeta, en escritorio y en móvil (4ª tanda: Mile en móvil).
      for (const width of [1280, 390]) {
        const mPage = await browser.newPage({ viewport: { width, height: 844 } });
        await mPage.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        const clipped = await mPage.evaluate(() => {
          const bad: string[] = [];
          document.querySelectorAll('.contact-card .contact-value').forEach((a) => {
            const range = document.createRange();
            range.selectNodeContents(a);
            const r = range.getBoundingClientRect();
            const card = a.closest('.contact-card')?.getBoundingClientRect();
            if (card && r.right > card.right + 1) {
              bad.push(`${a.textContent?.trim() ?? ''} (+${Math.round(r.right - card.right)} px fuera de la tarjeta)`);
            }
          });
          return bad;
        });
        for (const c of clipped) {
          findings.push({ severity: 'MINOR', category: 'VISUAL', message: `Valor de contacto recortado a ${width} px: ${c}.`, url });
        }
        await mPage.close();
      }
      out.set(slug, findings);
    }
  } finally {
    await browser.close();
  }
  return out;
}

async function main(): Promise<void> {
  const demos = readDemosFile();
  if (demos.length !== 37) throw new Error(`Expected 37 demos, got ${demos.length}.`);

  // ---- Dossiers from the same sources as regenerate-demos-cuarta-tanda.ts ----
  const facts = new Map<string, LeadFacts>();

  type PilotLead = { name: string; address: string | null; phone: string | null; email: string | null };
  const pilot: PilotLead[] = JSON.parse(
    readFileSync(join(ROOT, 'packages/shared/src/data/pilot-leads.json'), 'utf8'),
  );
  for (const lead of pilot) {
    const demo = demos.find((d) => d.content.businessName === lead.name);
    if (!demo) throw new Error(`Pilot demo not found for "${lead.name}".`);
    facts.set(demo.content.businessSlug, {
      name: lead.name,
      address: lead.address,
      phone: lead.phone,
      email: lead.email ?? '',
    });
  }

  type TerceraLead = {
    name: string;
    town: string;
    address?: string;
    phone?: string;
    email: string;
  };
  const tercera = JSON.parse(
    readFileSync(join(ROOT, 'docs/tercera-tanda-17-leads.json'), 'utf8'),
  ) as { build_now: TerceraLead[]; later_unscored: TerceraLead[] };
  for (const lead of tercera.build_now) {
    const slug = slugify(lead.name, municipality(lead.town));
    facts.set(slug, {
      name: lead.name,
      address: lead.address ?? null,
      phone: lead.phone ?? null,
      email: lead.email,
    });
  }
  const newSlugs = new Set<string>();
  for (const lead of tercera.later_unscored) {
    if (lead.name === 'CARPINTERÍA SORIA') continue; // descartada: tiene web propia
    const slug = slugify(lead.name, municipality(lead.town));
    newSlugs.add(slug);
    facts.set(slug, {
      name: lead.name,
      address: lead.address ?? null,
      phone: lead.phone ?? null,
      email: lead.email,
    });
  }
  if (facts.size !== 37) throw new Error(`Expected 37 dossiers, got ${facts.size}.`);
  if (newSlugs.size !== 10) throw new Error(`Expected 10 new slugs, got ${newSlugs.size}.`);

  // ---- Extra live DOM checks (one shared browser session) ----
  const extra = await extraLiveChecks(
    demos.map((d) => ({ slug: d.content.businessSlug, isNew: newSlugs.has(d.content.businessSlug) })),
  );

  let allPassed = true;
  for (const demo of demos) {
    const c = demo.content;
    const slug = c.businessSlug;
    // RE-AUDIT MODE (4ª tanda): PREVIEW_READY or APPROVED both audit;
    // anything else still aborts — the section removal changed the
    // render of the sealed demos, so their old stamp no longer covers it.
    if (demo.businessState !== 'PREVIEW_READY' && demo.businessState !== 'APPROVED') {
      throw new Error(`Demo "${slug}" has unexpected state "${demo.businessState}" — refusing to audit.`);
    }
    const lead = facts.get(slug);
    if (!lead) throw new Error(`No dossier facts for slug "${slug}".`);
    const dossier: AuditDossierFacts = {
      name: lead.name,
      address: lead.address,
      phone: lead.phone,
      email: lead.email,
      services: [],
      activity: 'CONFIRMED',
      slug,
    };
    const contentReport = auditWebsiteContent(c, dossier);
    const url = `${BASE_URL}/demos/${slug}`;
    const pw = await runPlaywrightAudit(url, SHOTS_DIR, slug, {
      tel: !!lead.phone,
      maps: !!lead.address,
    });
    const report = mergePlaywrightFindings(contentReport, [
      ...pw.findings,
      ...(extra.get(slug) ?? []),
    ]);
    const s = report.scores;
    const tag = newSlugs.has(slug) ? 'NUEVA' : 're-aud.';
    const line =
      `${slug} [${tag}]: ${report.result} ` +
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
