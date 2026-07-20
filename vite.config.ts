import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vitest/config';

// `defineConfig` is imported from `vitest/config`, not `vite`: Vite's own
// `UserConfigExport` has no `test` key and rejects the block at typecheck.

/**
 * Fails the build when chai.config.ts is invalid (P0.1).
 *
 * This has to be a plugin, not just an import in main.tsx: a bundler only *bundles*
 * modules, it never executes them, so a module-scope `throw` in the app code never
 * fires during `vite build`. Running the parse in `buildStart` is what makes a bad
 * VPA or a zero base price stop the build — on Vercel, on Pages, and locally.
 *
 * The config is imported dynamically so a parse failure surfaces as a Rollup build
 * error with our formatted message rather than a config-loading crash.
 */
function chaiConfigValidator(): Plugin {
  return {
    name: 'chai-config-validator',
    // Build only. Without this guard the plugin also runs in serve mode, which
    // means (a) Vitest — which spins up a Vite server — aborts the entire test
    // suite when the config is invalid, and (b) `pnpm dev` hard-exits instead of
    // rendering Vite's error overlay. Dev-time validation is already covered by
    // src/config/config.ts throwing at module load, which is what the overlay shows.
    apply: 'build',
    async buildStart() {
      const [{ default: raw }, { parseConfig, ChaiConfigError, formatIssues }] = await Promise.all([
        import('./chai.config.ts'),
        import('./src/config/load.ts'),
      ]);
      try {
        // envSubstituted: false — this import goes through plain Node, so
        // `import.meta.env` is undefined here and the analytics key is invisible.
        const { warnings } = parseConfig(raw, { envSubstituted: false });
        for (const warning of warnings) {
          this.warn(`${warning.path} → ${warning.message}`);
        }
      } catch (error) {
        if (error instanceof ChaiConfigError) {
          // Rollup prefixes plugin errors; the formatted block stays readable.
          this.error(`\n${formatIssues(error.issues, 'error')}`);
        }
        throw error;
      }
    },
  };
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);

/**
 * Injects the creator's real VPA into the `<noscript>` block (P0.7).
 *
 * The copy-UPI-ID path is the one guaranteed way to pay (ADR-006), and with JS off
 * it is the *only* one — so the served HTML must carry the actual UPI ID, not a
 * generic "copy the ID" sentence. React can't help here: it never mounts without
 * JS, and its output is not in the served document anyway. So the VPA is baked into
 * index.html at build time instead.
 *
 * The noscript copy lives here rather than in `src/strings.ts` for the same reason
 * `meta.title`'s default lives in the schema (ADR-015): it is needed before — or
 * entirely without — a React mount, so it cannot depend on the UI string layer.
 *
 * Any failure leaves the static fallback noscript from index.html untouched.
 */
function chaiNoscript(): Plugin {
  return {
    name: 'chai-noscript',
    transformIndexHtml: {
      order: 'pre',
      async handler(html) {
        try {
          const [{ default: raw }, { parseConfig }] = await Promise.all([
            import('./chai.config.ts'),
            import('./src/config/load.ts'),
          ]);
          // envSubstituted: false — plain Node, so analytics stays invisible here;
          // we only read creator fields, which do not depend on it.
          const { config } = parseConfig(raw, { envSubstituted: false });
          const vpa = escapeHtml(config.creator.vpa);
          const title = escapeHtml(config.meta.title);

          const block = `<noscript>
      <div style="max-width:480px;margin:40px auto;padding:24px;font-family:system-ui,-apple-system,sans-serif;text-align:center;color:#2b1d14;">
        <p style="margin:0;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;font-weight:600;color:#c4622d;">0% commission &middot; straight to UPI</p>
        <h1 style="margin:8px 0 12px;font-size:22px;">${title}</h1>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#6b5647;">This page builds the UPI QR with JavaScript, which is turned off. You can still pay &mdash; open any UPI app and send to this UPI ID:</p>
        <p style="margin:16px 0;padding:12px 16px;border-radius:12px;background:#fbeadf;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:16px;font-weight:700;word-break:break-all;">${vpa}</p>
        <p style="margin:0;font-size:12px;color:#6b5647;">Payments go directly to the creator's UPI. No middleman, no fees.</p>
      </div>
    </noscript>`;

          return html.replace(/<noscript>[\s\S]*?<\/noscript>/, block);
        } catch {
          // Keep the static fallback in index.html.
          return html;
        }
      },
    },
  };
}

export default defineConfig({
  // GitHub Pages subpath (hard rule 7). The deploy workflow sets
  // BASE_PATH=/${repo-name}/ so renamed forks work untouched.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss(), chaiConfigValidator(), chaiNoscript()],
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // This list is load-bearing: it scopes the 100% thresholds below. Widening
      // it starts applying those bars to components and will break CI.
      include: [
        'src/lib/upi.ts',
        'src/lib/qr.ts',
        'src/lib/amount.ts',
        'src/config/schema.ts',
        'src/config/css-color.ts',
      ],
      thresholds: {
        'src/lib/upi.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
        'src/lib/qr.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
        'src/lib/amount.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
        'src/config/schema.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
        'src/config/css-color.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
      },
    },
  },
});
