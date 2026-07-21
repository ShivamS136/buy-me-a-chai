/**
 * Resolves a config asset path against Vite's `base` (hard rule 7).
 *
 * Config stores asset paths verbatim — either an absolute `http(s)://…` URL or a
 * root-relative `/file.png` under `public/` (enforced by `assetPath()` in the
 * schema). A root-relative path is correct at the site root but breaks on a GitHub
 * Pages subpath (`/buy-me-a-chai/`), where the served asset actually lives at
 * `/buy-me-a-chai/file.png`. `import.meta.env.BASE_URL` carries that prefix and
 * always ends in `/`, so joining is a leading-slash strip away.
 *
 * Kept framework-free (ADR-004): a string in, a string out, `base` injectable so
 * the subpath behaviour is unit-testable without a real build.
 */
export const resolveAsset = (path: string, base: string = import.meta.env.BASE_URL): string => {
  // Absolute URLs (and protocol-relative ones) already point at their host; the
  // base prefix must not be spliced into them.
  if (/^(https?:)?\/\//i.test(path)) return path;
  // `base` ends in "/"; a config public path begins with "/". Drop one so the join
  // never doubles the slash.
  return `${base}${path.replace(/^\//, '')}`;
};
