/**
 * Playwright runner — Fase D (instrucciones §6).
 *
 * Live-browser audit of a demo URL with the Chromium already cached in
 * this VM (~/.cache/ms-playwright, chrome-linux64/chrome under the
 * chromium-NNNN dir, Chrome 153 for Testing, verified 2026-11-16). Uses
 * with that binary as executablePath: no browser download at audit time.
 *
 * When no Chromium binary is found, `runPlaywrightAudit` throws
 * PlaywrightUnavailableError with the exact paths searched — the caller
 * must then record the audit as 'playwright-unavailable' and must NOT
 * report Playwright as passed.
 *
 * Checks: console errors, failed HTTP responses (>= 400), images that did
 * not load (naturalWidth 0), links with empty/javascript: hrefs, mobile
 * horizontal overflow (390 px), desktop + mobile load time, and
 * screenshots (desktop 1280x800, mobile 390x844) saved to the given dir.
 */
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright-core';
import type { AuditFindingInput } from './index.js';

// Puerta de clave (2026-11-17, siempre pide la clave: sin persistencia).
// La auditoría desbloquea por la interfaz (escribe la clave y entra),
// como haría un usuario; la puerta en sí se prueba con tests unitarios.
// Clave por env WEBLEAD_DEMO_PASSWORD (por defecto la clave actual).
const GATE_PASSWORD = process.env.WEBLEAD_DEMO_PASSWORD ?? 'demo2026';

/** Desbloquea la puerta de clave por la interfaz, si está presente. */
async function unlockGate(page: Page): Promise<void> {
  const gate = page.locator('#demo-password');
  if (await gate.count()) {
    await gate.fill(GATE_PASSWORD);
    await page
      .locator('form[aria-label="Acceso con clave"] button[type="submit"]')
      .click();
    await page.waitForFunction(
      () => !document.querySelector('#demo-password'),
      null,
      { timeout: 10000 },
    );
  }
}

export class PlaywrightUnavailableError extends Error {
  readonly searchedPaths: string[];
  constructor(searchedPaths: string[]) {
    super(
      'Playwright unavailable: no Chromium binary found. Searched: ' +
        (searchedPaths.join(', ') || '(no cache dir)') +
        '. Run `npx playwright install chromium` or set PLAYWRIGHT_CHROMIUM_PATH.',
    );
    this.name = 'PlaywrightUnavailableError';
    this.searchedPaths = searchedPaths;
  }
}

/** Locates a cached Chromium binary (env override first, then the cache). */
export function findChromiumExecutable(): string | null {
  const override = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  if (override && existsSync(override)) return override;
  const cache = join(homedir(), '.cache', 'ms-playwright');
  const searched: string[] = [];
  if (existsSync(cache)) {
    for (const dir of readdirSync(cache)) {
      if (!dir.startsWith('chromium-')) continue;
      const candidate = join(cache, dir, 'chrome-linux64', 'chrome');
      searched.push(candidate);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

export function searchedChromiumPaths(): string[] {
  const cache = join(homedir(), '.cache', 'ms-playwright');
  if (!existsSync(cache)) return [cache];
  return readdirSync(cache)
    .filter((d) => d.startsWith('chromium-'))
    .map((d) => join(cache, d, 'chrome-linux64', 'chrome'));
}

export type PlaywrightAuditResult = {
  findings: AuditFindingInput[];
  loadMs: { desktop: number; mobile: number };
  screenshots: { desktop: string; mobile: string };
  consoleErrors: string[];
  httpErrors: { url: string; status: number }[];
};

export async function runPlaywrightAudit(
  demoUrl: string,
  screenshotsDir: string,
  slug: string,
  // Canales de contacto que el expediente trae y la demo debe enlazar.
  // 3ª tanda (2026-11-17): la mayoría de expedientes no tienen calle
  // (solo localidad) y uno no tiene teléfono; la demo no debe inventarlos,
  // así que el llamador pasa { tel: !!lead.phone, maps: !!lead.address }.
  // Por defecto ambos true: el comportamiento anterior.
  expected: { tel?: boolean; maps?: boolean } = { tel: true, maps: true },
): Promise<PlaywrightAuditResult> {
  const expectTel = expected.tel ?? true;
  const expectMaps = expected.maps ?? true;
  const executablePath = findChromiumExecutable();
  if (!executablePath) throw new PlaywrightUnavailableError(searchedChromiumPaths());
  mkdirSync(screenshotsDir, { recursive: true });

  const findings: AuditFindingInput[] = [];
  const consoleErrors: string[] = [];
  const httpErrors: { url: string; status: number }[] = [];
  const loadMs: { desktop: number; mobile: number } = { desktop: 0, mobile: 0 };
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });

    // ---- Desktop 1280x800 ----
    const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    desktop.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 300));
    });
    desktop.on('pageerror', (err) => consoleErrors.push(String(err).slice(0, 300)));
    desktop.on('response', (res) => {
      if (res.status() >= 400) httpErrors.push({ url: res.url(), status: res.status() });
    });
    const t0 = Date.now();
    await desktop.goto(demoUrl, { waitUntil: 'networkidle', timeout: 30000 });
    // Puerta de clave: desbloquear por la interfaz tras cargar (ver arriba).
    await unlockGate(desktop);
    loadMs.desktop = Date.now() - t0;
    const desktopShot = join(screenshotsDir, `${slug}-desktop.png`);
    await desktop.screenshot({ path: desktopShot, fullPage: true });

    // Images that failed to load.
    const brokenImages = await desktop.evaluate(() =>
      Array.from(document.images)
        .filter((img) => !img.complete || img.naturalWidth === 0)
        .map((img) => img.getAttribute('src') ?? '(sin src)'),
    );
    for (const src of brokenImages) {
      findings.push({ severity: 'CRITICAL', category: 'TECHNICAL', message: `Imagen rota (no carga): ${src}`, url: demoUrl });
    }
    const missingAlt = await desktop.evaluate(() =>
      Array.from(document.images)
        .filter((img) => !img.getAttribute('alt'))
        .map((img) => img.getAttribute('src') ?? '(sin src)'),
    );
    for (const src of missingAlt) {
      findings.push({ severity: 'MINOR', category: 'TECHNICAL', message: `Imagen sin atributo alt: ${src}`, url: demoUrl });
    }
    // Links: empty or javascript: hrefs are broken by construction.
    const badLinks = await desktop.evaluate(() =>
      Array.from(document.querySelectorAll('a'))
        .map((a) => a.getAttribute('href') ?? '')
        .filter((href) => href === '' || href.startsWith('javascript:')),
    );
    for (const href of badLinks) {
      findings.push({ severity: 'CRITICAL', category: 'TECHNICAL', message: `Enlace roto (href vacío o javascript:): "${href}"`, url: demoUrl });
    }
    // Rediseño 2026-11-17: no form in any demo — contact is tel:/mailto:/
    // address/Maps only. Any form control is a CRITICAL regression.
    // (La puerta de clave es un <form> aparte, pero las auditorías la
    // desbloquean por la interfaz tras cargar, así que aquí nunca se ve.)
    const formControls = await desktop.evaluate(() =>
      document.querySelectorAll('form, input, textarea, select').length,
    );
    if (formControls > 0) {
      findings.push({
        severity: 'CRITICAL',
        category: 'CONTENT',
        message: `Formulario presente (${formControls} controles form/input/textarea/select): el rediseño 2026-11-17 los eliminó de todas las demos.`,
        url: demoUrl,
      });
    }
    // The contact block must offer the direct channels (tel: + Maps link),
    // but only the ones the dossier actually has (see `expected` above:
    // a demo without a verified street address must not link to Maps,
    // and one without a phone must not offer a tel: link).
    const contactChannels = await desktop.evaluate(() => ({
      tel: document.querySelectorAll('a[href^="tel:"]').length,
      maps: document.querySelectorAll('a[href^="https://www.google.com/maps/"]').length,
    }));
    if (expectTel && contactChannels.tel === 0) {
      findings.push({ severity: 'CRITICAL', category: 'CONTENT', message: 'Sin enlace tel: en la demo.', url: demoUrl });
    }
    if (expectMaps && contactChannels.maps === 0) {
      findings.push({ severity: 'MINOR', category: 'CONTENT', message: 'Sin enlace a Google Maps en la demo.', url: demoUrl });
    }
    await desktop.close();

    // ---- Mobile 390x844 ----
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const t1 = Date.now();
    await mobile.goto(demoUrl, { waitUntil: 'networkidle', timeout: 30000 });
    // Puerta de clave: mismo desbloqueo que en escritorio (ver arriba).
    await unlockGate(mobile);
    loadMs.mobile = Date.now() - t1;
    const mobileShot = join(screenshotsDir, `${slug}-mobile.png`);
    await mobile.screenshot({ path: mobileShot, fullPage: true });
    const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (overflow) {
      findings.push({
        severity: 'MINOR',
        category: 'VISUAL',
        message: 'Desbordamiento horizontal en móvil (390 px): el contenido es más ancho que la ventana.',
        url: demoUrl,
      });
    }
    await mobile.close();
  } finally {
    await browser?.close();
  }

  for (const err of consoleErrors) {
    findings.push({ severity: 'CRITICAL', category: 'TECHNICAL', message: `Error de consola: ${err}`, url: demoUrl });
  }
  for (const h of httpErrors) {
    findings.push({ severity: 'CRITICAL', category: 'TECHNICAL', message: `Petición HTTP ${h.status}: ${h.url}`, url: demoUrl });
  }
  if (loadMs.desktop > 5000) {
    findings.push({ severity: 'RECOMMENDATION', category: 'TECHNICAL', message: `Carga en escritorio lenta: ${loadMs.desktop} ms (> 5000 ms).`, url: demoUrl });
  }
  if (loadMs.mobile > 5000) {
    findings.push({ severity: 'RECOMMENDATION', category: 'TECHNICAL', message: `Carga en móvil lenta: ${loadMs.mobile} ms (> 5000 ms).`, url: demoUrl });
  }

  return {
    findings,
    loadMs,
    screenshots: { desktop: join(screenshotsDir, `${slug}-desktop.png`), mobile: join(screenshotsDir, `${slug}-mobile.png`) },
    consoleErrors,
    httpErrors,
  };
}
