import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHAI_EVENT_NAMES, PAY_METHODS } from './types.ts';

/**
 * The guard CLAUDE.md hard rule 4 and docs/ANALYTICS.md both ask for, as a test
 * rather than a habit: a source scan that fails the build if the page grows a
 * network call, a fourth event, or a second module that imports an SDK.
 *
 * It reads files instead of importing them on purpose — the claims are about what
 * is *written*, and half of them ("nothing else calls fetch") are unprovable by
 * running the code, because the whole point is that the path never executes.
 */

// `process.cwd()`, not `import.meta.url`: under the jsdom environment the module
// URL is an http: one and cannot be turned back into a path. Vitest always runs
// from the project root, and the "finds source files" case below fails loudly if
// that ever stops being true.
const SRC = `${join(process.cwd(), 'src')}/`;

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) return [];
    return [path];
  });

const SOURCES = sourceFiles(SRC).map((path) => ({
  path,
  relative: path.slice(SRC.length),
  text: readFileSync(path, 'utf8'),
}));

describe('the analytics contract', () => {
  it('finds source files to scan (guards against a silently empty sweep)', () => {
    expect(SOURCES.length).toBeGreaterThan(20);
  });

  it('emits only the three declared events', () => {
    const emitted = new Set<string>();
    for (const source of SOURCES) {
      for (const match of source.text.matchAll(/track\(\{\s*name:\s*'([^']+)'/g)) {
        if (match[1] !== undefined) emitted.add(match[1]);
      }
    }

    expect(emitted.size).toBeGreaterThan(0);
    expect([...emitted].sort()).toEqual([...CHAI_EVENT_NAMES].sort());
  });

  it('uses only the three declared pay methods', () => {
    const used = new Set<string>();
    for (const source of SOURCES) {
      for (const match of source.text.matchAll(/method:\s*'([^']+)'/g)) {
        if (match[1] !== undefined) used.add(match[1]);
      }
    }

    expect([...used].sort()).toEqual([...PAY_METHODS].sort());
  });

  it('keeps the no-op adapter literally inert', () => {
    const noop = SOURCES.find((source) => source.relative === join('analytics', 'noop.ts'));
    expect(noop).toBeDefined();

    // Everything below the doc comment: no imports beyond a type, no state, no calls.
    const code = (noop?.text ?? '').replace(/\/\*\*[\s\S]*?\*\//g, '');
    expect(code).not.toMatch(/\bfetch\b|sendBeacon|XMLHttpRequest|WebSocket|import\(/);
    expect(code.match(/^import\b.*$/gm) ?? []).toEqual([
      "import type { AnalyticsAdapter } from './types.ts';",
    ]);
  });

  it('makes no network calls of its own, anywhere in the app', () => {
    // Hard rule 4. The PostHog SDK owns the only transport in the project; if a
    // component ever reaches for one directly, a disabled build stops being inert.
    const offenders = SOURCES.filter((source) =>
      /(?<![.\w])fetch\(|navigator\.sendBeacon|new XMLHttpRequest|new WebSocket|new EventSource/.test(
        source.text,
      ),
    );

    expect(offenders.map((source) => source.relative)).toEqual([]);
  });

  it('confines posthog-js to the one lazily-imported adapter', () => {
    const importers = SOURCES.filter((source) => /from 'posthog-js'/.test(source.text));

    expect(importers.map((source) => source.relative)).toEqual([join('analytics', 'posthog.ts')]);
  });

  it('reaches that adapter only through a flag-gated dynamic import', () => {
    // Rollup can only drop the 220 kB chunk if `import()` sits lexically inside the
    // `__CHAI_ANALYTICS__` branch — see the note in index.ts. A static import here,
    // or a loader closure hoisted out of the branch, silently ships PostHog to every
    // fork that has analytics switched off.
    const index = SOURCES.find((source) => source.relative === join('analytics', 'index.ts'));
    expect(index?.text).not.toMatch(/^import .*from '\.\/posthog\.ts'/m);
    expect(index?.text).toMatch(/__CHAI_ANALYTICS__\s*\?[\s\S]*?await import\('\.\/posthog\.ts'\)/);
  });
});
