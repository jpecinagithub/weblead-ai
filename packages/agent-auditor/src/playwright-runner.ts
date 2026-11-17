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
import { chromium, type Browser } from 'playwright-core';
import type { AuditFindingInput } from './index.js';

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
): Promise<PlaywrightAuditResult> {
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
    // Puerta de clave (2026-11-17): la auditoría desbloquea la plataforma
    // antes de navegar, para auditar el contenido de la demo. La clave es
    // 'weblead-demos-unlocked' en sessionStorage (ver
    // apps/demo-platform/src/password-gate.ts); la puerta en sí se prueba
    // con tests unitarios, no aquí. Sin este desbloqueo la auditoría solo
    // vería la pantalla de clave.
    await desktop.addInitScript(() => {
      sessionStorage.setItem('weblead-demos-unlocked', '1');
    });
    desktop.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 300));
    });
    desktop.on('pageerror', (err) => consoleErrors.push(String(err).slice(0, 300)));
    desktop.on('response', (res) => {
      if (res.status() >= 400) httpErrors.push({ url: res.url(), status: res.status() });
    });
    const t0 = Date.now();
    await desktop.goto(demoUrl, { waitUntil: 'networkidle', timeout: 30000 });
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
    // (La puerta de clave es un <form> aparte, pero las auditorías
    // desbloquean antes de navegar, así que aquí nunca se ve.)
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
    // The contact block must offer the direct channels (tel: + Maps link).
    const contactChannels = await desktop.evaluate(() => ({
      tel: document.querySelectorAll('a[href^="tel:"]').length,
      maps: document.querySelectorAll('a[href^="https://www.google.com/maps/"]').length,
    }));
    if (contactChannels.tel === 0) {
      findings.push({ severity: 'CRITICAL', category: 'CONTENT', message: 'Sin enlace tel: en la demo.', url: demoUrl });
    }
    if (contactChannels.maps === 0) {
      findings.push({ severity: 'MINOR', category: 'CONTENT', message: 'Sin enlace a Google Maps en la demo.', url: demoUrl });
    }
    await desktop.close();

    // ---- Mobile 390x844 ----
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    // Puerta de clave: mismo desbloqueo que en escritorio (ver arriba).
    await mobile.addInitScript(() => {
      sessionStorage.setItem('weblead-demos-unlocked', '1');
    });
    const t1 = Date.now();
    await mobile.goto(demoUrl, { waitUntil: 'networkidle', timeout: 30000 });
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
