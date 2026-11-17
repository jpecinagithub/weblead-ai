import { defineConfig } from 'vitest/config';

/**
 * Vitest needs the automatic JSX runtime: App.tsx (demo-platform) uses
 * JSX without importing React, like the Vite build does. Without this,
 * renderToString tests fail with "React is not defined" (classic runtime).
 */
export default defineConfig({
  esbuild: { jsx: 'automatic' },
});
