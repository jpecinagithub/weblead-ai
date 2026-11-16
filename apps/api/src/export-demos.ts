/**
 * Export generated demos to the demo-platform (Fase D).
 *
 * Reads every WebsiteProject row from Postgres (content + business state +
 * latest audit) and writes apps/demo-platform/src/data/generated-demos.ts
 * plus the demo sitemap. No design, no LLM call, no state change — safe to
 * run after an audit to refresh the states shown in the demos dashboard.
 *
 * Usage: pnpm --filter @weblead/api export:demos
 */
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import { prisma } from '@weblead/database';
import type { GeneratedWebsiteContent } from '@weblead/website-generator';

dotenv.config({ path: new URL('../../../.env', import.meta.url) });

export async function exportDemos(): Promise<number> {
  const projects = await prisma.websiteProject.findMany({ orderBy: { createdAt: 'asc' } });
  const demos: {
    content: GeneratedWebsiteContent;
    businessState: string;
    auditStatus: string | null;
    demoUrl: string;
  }[] = [];
  for (const project of projects) {
    const business = await prisma.business.findUnique({ where: { id: project.businessId } });
    const audit = await prisma.audit.findFirst({
      where: { projectId: project.id },
      orderBy: { createdAt: 'desc' },
    });
    demos.push({
      content: project.content as unknown as GeneratedWebsiteContent,
      businessState: business?.state ?? 'UNKNOWN',
      auditStatus: audit ? `${audit.status} (${audit.runner ?? 'sin runner'})` : null,
      demoUrl: `/demos/${project.slug}`,
    });
  }
  const out =
    `/**\n * Generated demos (Fase D) — WRITTEN BY apps/api/src/export-demos.ts.\n` +
    ` * Do not edit by hand: regenerated from the WebsiteProject rows in Postgres.\n` +
    ` * Generated at ${new Date().toISOString()} (${demos.length} demos).\n */\n` +
    `import type { GeneratedWebsiteContent } from '@weblead/website-generator';\n\n` +
    `export type GeneratedDemo = {\n  content: GeneratedWebsiteContent;\n  businessState: string;\n  auditStatus: string | null;\n  demoUrl: string;\n};\n\n` +
    `export const GENERATED_DEMOS: GeneratedDemo[] = ${JSON.stringify(demos, null, 2)};\n`;
  writeFileSync(new URL('../../demo-platform/src/data/generated-demos.ts', import.meta.url), out);
  console.log(`Exported ${demos.length} demos to apps/demo-platform/src/data/generated-demos.ts`);

  const sitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!-- Fase D: generado por apps/api/src/export-demos.ts; host local de dev. -->\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `  <url><loc>http://localhost:5174/</loc></url>\n` +
    demos.map((d) => `  <url><loc>http://localhost:5174${d.demoUrl}</loc></url>`).join('\n') +
    `\n</urlset>\n`;
  writeFileSync(new URL('../../demo-platform/public/sitemap.xml', import.meta.url), sitemap);
  console.log('Refreshed apps/demo-platform/public/sitemap.xml');
  return demos.length;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  exportDemos()
    .catch((err: unknown) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
