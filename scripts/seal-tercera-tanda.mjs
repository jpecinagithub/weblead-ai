/**
 * Seal the 17 tercera-tanda demos as APPROVED after the Playwright audit
 * (apps/api/src/audit-tercera-tanda.ts: 17/17 PASSED 100/100/100/100).
 *
 * Sets businessState='APPROVED' + auditStatus='PASSED (playwright)' ONLY
 * on the 17 new slugs (from docs/tercera-tanda-17-leads.json `build_now`,
 * via slugify). The 10 Logroño demos are NOT touched: the script asserts
 * they keep businessState APPROVED / auditStatus 'PASSED (playwright)'
 * and aborts if any of them differs. It also asserts the 17 are
 * PREVIEW_READY + auditStatus null before sealing (refuses to re-seal).
 *
 * Parses the GENERATED_DEMOS array as JSON and rewrites the file
 * preserving the exact export prefix/suffix — never sed on the TS.
 *
 * Usage: node scripts/seal-tercera-tanda.mjs  (from repo root)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const FILE = join(ROOT, 'apps/demo-platform/src/data/generated-demos.ts');
const PREFIX = 'export const GENERATED_DEMOS: GeneratedDemo[] = ';

const doc = JSON.parse(readFileSync(join(ROOT, 'docs/tercera-tanda-17-leads.json'), 'utf8'));
const names = new Set(doc.build_now.map((l) => l.name));

const raw = readFileSync(FILE, 'utf8');
const at = raw.indexOf(PREFIX);
if (at < 0) throw new Error('GENERATED_DEMOS export not found.');
const head = raw.slice(0, at + PREFIX.length);
const tail = raw.slice(at + PREFIX.length).replace(/;\s*$/, '');
const demos = JSON.parse(tail);

let sealed = 0;
for (const d of demos) {
  const isNew = names.has(d.content.businessName);
  if (isNew) {
    if (d.businessState !== 'PREVIEW_READY' || d.auditStatus !== null) {
      throw new Error(`Refusing to seal ${d.content.businessSlug}: state=${d.businessState} auditStatus=${d.auditStatus}`);
    }
    d.businessState = 'APPROVED';
    d.auditStatus = 'PASSED (playwright)';
    sealed++;
  } else {
    if (d.businessState !== 'APPROVED' || d.auditStatus !== 'PASSED (playwright)') {
      throw new Error(`Logroño demo ${d.content.businessSlug} changed unexpectedly: state=${d.businessState} auditStatus=${d.auditStatus}`);
    }
  }
}
if (sealed !== 17) throw new Error(`Expected to seal 17, sealed ${sealed}.`);
if (demos.length !== 27) throw new Error(`Expected 27 demos, got ${demos.length}.`);

writeFileSync(FILE, head + JSON.stringify(demos, null, 2) + ';\n');
console.log(`Selladas 17/17. Total demos: ${demos.length} (10 Logroño intactas).`);
