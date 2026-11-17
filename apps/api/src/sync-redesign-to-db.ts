/**
 * Sync the redesigned demo content into the restored DB snapshot.
 *
 * Context: the VM had no PostgreSQL installed; the DB was restored from
 * backups/weblead_dev-2026-11-16_202457.dump (20:24), which PREDATES the
 * Fase F generation — it holds only 4 of the 10 real WebsiteProject rows
 * (Ferrer, Begoña, Hidrorioja, Expert); the other 6 businesses are still
 * QUALIFIED with no project row in this snapshot.
 *
 * This script updates ONLY the content of the rows that exist
 * (content + brandConfig JSON, and the LOGO asset whose SVG accent
 * changed). It touches NO business state, NO audit row, NO usage record,
 * and it creates NO project row: the 6 missing designs are not invented
 * here. Consequence, documented in docs/redesign-2026-11-17.md: running
 * export:demos from THIS snapshot would export only 4 demos — the file
 * apps/demo-platform/src/data/generated-demos.ts (10 demos) is the
 * canonical deploy artifact, not this snapshot.
 *
 * Usage: pnpm --filter @weblead/api sync:redesign
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import dotenv from 'dotenv';
import { prisma } from '@weblead/database';
import type { GeneratedWebsiteContent } from '@weblead/website-generator';

dotenv.config({ path: new URL('../../../.env', import.meta.url) });

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

type DemoFileRow = {
  content: GeneratedWebsiteContent;
  businessState: string;
  auditStatus: string | null;
  demoUrl: string;
};

function readDemosFile(): DemoFileRow[] {
  const raw = readFileSync(join(ROOT, 'apps/demo-platform/src/data/generated-demos.ts'), 'utf8');
  const marker = 'export const GENERATED_DEMOS: GeneratedDemo[] = ';
  const at = raw.indexOf(marker);
  if (at < 0) throw new Error('GENERATED_DEMOS export not found.');
  return JSON.parse(raw.slice(at + marker.length).replace(/;\s*$/, '')) as DemoFileRow[];
}

async function main(): Promise<void> {
  const demos = readDemosFile();
  let updated = 0;
  let missing = 0;
  for (const demo of demos) {
    const content = demo.content;
    const serialized = JSON.stringify(content);
    if (/formNote|formulario/i.test(serialized)) {
      throw new Error(`Contenido con formulario para ${content.businessSlug}: no se sincroniza nada.`);
    }
    const project = await prisma.websiteProject.findUnique({ where: { slug: content.businessSlug } });
    if (!project) {
      console.log(`- ${content.businessSlug}: SIN fila en este snapshot (no se crea nada)`);
      missing++;
      continue;
    }
    await prisma.websiteProject.update({
      where: { id: project.id },
      data: { content: content as never, brandConfig: content as never },
    });
    const logo = content.assets.find((a) => a.kind === 'LOGO');
    if (logo) {
      await prisma.websiteAsset.deleteMany({ where: { projectId: project.id, kind: 'LOGO' } });
      await prisma.websiteAsset.create({
        data: { projectId: project.id, kind: 'LOGO', url: logo.url, license: logo.license, source: logo.source },
      });
    }
    console.log(`- ${content.businessSlug}: contenido actualizado (estado ${demo.businessState} intacto)`);
    updated++;
  }
  console.log(`Sincronizados ${updated} proyectos; ${missing} sin fila en el snapshot.`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
