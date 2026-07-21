/**
 * The MAKER's identity — the person and repo behind this template.
 *
 * Two actors run through this codebase; the names are chosen so a reader never has
 * to guess which one a value belongs to:
 *
 *  - **MAKER**         — the author who published this template (this repo's owner).
 *  - **MAKER_PROJECT** — the template repository itself (buy-me-a-chai).
 *  - **CREATOR**       — the person who forked and deployed *their* page; their
 *                        identity is `creator` in `chai.config.ts`, never here.
 *  - **CREATOR_PROJECT** — a project the creator lists on their page; those are
 *                        `works` in `chai.config.ts`.
 *
 * So everything in this file points at the MAKER. It is *not* per-creator config —
 * it is origin branding, inherited by every fork and shown in the masthead/footer. A
 * fork makes it theirs by editing these constants, or removes the branding by
 * deleting the links (the code is public — ADR-026, ADR-027). Kept apart from both
 * `strings.ts` (UI copy) and the config API precisely so it is one obvious place to
 * find-and-replace.
 *
 * Two name variables on purpose: `name` is primary (shown to visitors), `handle` is
 * secondary (compact UI and URLs).
 */
export const MAKER = {
  /** Primary — the display name shown to visitors. */
  name: 'Shivam Sharma',
  /** Secondary — the username / slug, for compact UI and URLs. */
  handle: 'shivams136',
  /** The maker's own support page — Buy Me a Coffee, Ko-fi, GitHub Sponsors, … */
  supportUrl: 'https://buymeacoffee.com/shivams136',
} as const;

export const MAKER_PROJECT = {
  /** The repo / package name — used as the "Powered by" credit. */
  name: 'buy-me-a-chai',
  /** The canonical repository. */
  repoUrl: 'https://github.com/shivams136/buy-me-a-chai',
  /**
   * GitHub's "Use this template" flow — where the masthead CTA sends a visitor who
   * wants their own page. Kept as a literal rather than derived from `repoUrl` so it
   * stays one obvious find-and-replace, and so a fork can point it anywhere.
   */
  templateUrl: 'https://github.com/shivams136/buy-me-a-chai/generate',
} as const;
