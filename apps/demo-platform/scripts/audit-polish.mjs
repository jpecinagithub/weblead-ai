/**
 * Auditoría base / post-pulido de las demos (iteración 2026-11-17).
 * Por página (índice + 10 demos) y ancho (360 / 768 / 1280):
 *  - overflow horizontal (scrollWidth <= innerWidth)
 *  - errores de consola, HTTP >= 400, imágenes rotas, controles de formulario
 *  - capturas: fullPage a 360 y 1280; hero y galería (elemento) a 360 y 1280
 * Uso: node /tmp/audit-polish.mjs <dir-salida> [before|after]
 */
import { chromium } from '/home/hatch/workspace/weblead-ai/packages/agent-auditor/node_modules/playwright-core/index.mjs';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = process.argv[2] ?? '/tmp/polish-before';
const TAG = process.argv[3] ?? 'before';
const BASE = process.env.DEMO_BASE_URL ?? 'http://localhost:5174';
const ROOT = '/home/hatch/workspace/weblead-ai';

const raw = readFileSync(join(ROOT, 'apps/demo-platform/src/data/generated-demos.ts'), 'utf8');
const slugs = [...raw.matchAll(/"businessSlug": "([^"]+)"/g)].map((m) => m[1]);
const names = [...raw.matchAll(/"businessName": "([^"]+)"/g)].map((m) => m[1]);
const layouts = [...raw.matchAll(/"heroLayout": "([^"]+)"/g)].map((m) => m[1]);

const cache = join(homedir(), '.cache', 'ms-playwright');
import { readdirSync } from 'node:fs';
let exe = null;
for (const d of readdirSync(cache)) {
  if (!d.startsWith('chromium-')) continue;
  const c = join(cache, d, 'chrome-linux64', 'chrome');
  if (existsSync(c)) { exe = c; break; }
}
if (!exe) throw new Error('No Chromium binary in ~/.cache/ms-playwright');

const WIDTHS = [360, 768, 1280];
const results = [];

async function auditPage(browser, path, label) {
  const entry = { page: label, path, overflow: {}, consoleErrors: [], httpErrors: [], brokenImages: [], forms: 0, loadMs: {} };
  for (const w of WIDTHS) {
    const page = await browser.newPage({ viewport: { width: w, height: 800 } });
    // Puerta de clave (2026-11-17): desbloquear antes de navegar para
    // auditar el contenido; la puerta en sí se prueba con tests unitarios.
    await page.addInitScript(() => {
      sessionStorage.setItem('weblead-demos-unlocked', '1');
    });
    const cerr = [], herr = [];
    page.on('console', (m) => { if (m.type() === 'error') cerr.push(m.text().slice(0, 200)); });
    page.on('pageerror', (e) => cerr.push(String(e).slice(0, 200)));
    page.on('response', (r) => { if (r.status() >= 400) herr.push(`${r.status()} ${r.url()}`); });
    const t0 = Date.now();
    await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(400);
    entry.loadMs[w] = Date.now() - t0;
    const metrics = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      broken: Array.from(document.images).filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute('src')),
      forms: document.querySelectorAll('form, input, textarea, select').length,
      scrollH: document.documentElement.scrollHeight,
    }));
    entry.overflow[w] = metrics.overflow;
    entry.brokenImages.push(...metrics.broken);
    entry.forms = Math.max(entry.forms, metrics.forms);
    entry.consoleErrors.push(...cerr);
    entry.httpErrors.push(...herr);
    if (w === 360 || w === 1280) {
      const tag = w === 360 ? 'mobile360' : 'desktop1280';
      await page.screenshot({ path: join(OUT, `${label}-${tag}.png`), fullPage: true });
      const hero = page.locator('.demo-hero').first();
      if (await hero.count()) await hero.screenshot({ path: join(OUT, `${label}-hero-${tag}.png`) });
      const gal = page.locator('.gallery-grid').first();
      if (await gal.count()) await gal.screenshot({ path: join(OUT, `${label}-gallery-${tag}.png`) });
    }
    await page.close();
  }
  // 768 fullPage shot too (index + demos)
  const p768 = await browser.newPage({ viewport: { width: 768, height: 800 } });
  await p768.addInitScript(() => {
    sessionStorage.setItem('weblead-demos-unlocked', '1');
  });
  await p768.goto(BASE + path, { waitUntil: 'networkidle', timeout: 30000 });
  await p768.waitForTimeout(400);
  await p768.screenshot({ path: join(OUT, `${label}-tablet768.png`), fullPage: true });
  await p768.close();
  return entry;
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
try {
  results.push(await auditPage(browser, '/', 'index'));
  for (let i = 0; i < slugs.length; i++) {
    const short = slugs[i].split('-logrono')[0];
    results.push(await auditPage(browser, `/demos/${slugs[i]}`, short));
    console.log(`ok ${short} (${layouts[i]})`);
  }
} finally {
  await browser.close();
}
writeFileSync(join(OUT, `audit-${TAG}.json`), JSON.stringify({ tag: TAG, base: BASE, results }, null, 2));
for (const r of results) {
  console.log(`${r.page}: overflow=${JSON.stringify(r.overflow)} forms=${r.forms} broken=${r.brokenImages.length} cerr=${r.consoleErrors.length} herr=${r.httpErrors.length} load=${JSON.stringify(r.loadMs)}`);
}
