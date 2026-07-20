# DECISIONS.md — Architecture Decision Records

Format: context → decision → consequences. To change a decision, add a new ADR superseding it; don't edit history.

---

## ADR-001: Static-only, no backend, forever
**Context:** Payment confirmation, donor lists, and recurring support all require a server + PSP integration, which reintroduces commissions, KYC, uptime liability, and the trust problems of the central platforms we're replacing.
**Decision:** Pure static output. No API routes, serverless functions, or databases — including "just a tiny function for X". Features requiring a backend are rejected at scope, not implemented carefully.
**Consequences:** No payment confirmation ever (marketed as the feature it is: "can't take a cut of what we never touch"). Free hosting everywhere. The template stays forkable by non-experts.

## ADR-002: UPI P2P intent URIs only — no PSP, no merchant flows
**Context:** PSPs (Razorpay etc.) give confirmation and reliable deeplinks but charge ~2% and require KYC/settlement accounts. NPCI merchant QRs (`mc` param) trigger verification checks against unregistered VPAs.
**Decision:** Emit plain `upi://pay` P2P URIs with only `pa, pn, am, cu, tn`. Never add `mc`, `tr`, `mode`, `purpose`, or signature params.
**Consequences:** Deeplink flakiness on GPay/PhonePe is accepted and mitigated by UX (ADR-006). Zero fees preserved. Equivalent legal posture to a printed QR at a chai stall.

## ADR-003: Config as a typed TS file, validated by Zod, `.strict()`
**Context:** Options were env vars, JSON, YAML, or TS. Content is nested (works, socials); creators are devs-first; typos must fail loudly.
**Decision:** `chai.config.ts` with `defineConfig()`; Zod strict schema; build fails with per-field actionable errors. Env vars only for analytics keys.
**Consequences:** Autocomplete + comments for creators; schema is the public API and versioned as such (see CONFIG.md). Non-dev creators rely on SETUP.md's guided edits.

## ADR-004: Page in React; widget (v1) as a framework-free Web Component
**Context:** Owner is fastest in React. But an embeddable widget must drop into WordPress, Hugo, plain HTML, Vue sites — shipping React runtime to every host page is unacceptable (~45KB+ and version conflicts).
**Decision:** v0 page: Vite + React. v1 widget: Lit (or vanilla) Web Component sharing a framework-free `core` (upi.ts, schema) via pnpm workspaces. `src/lib` and `src/config` are written React-free from day one to make extraction mechanical.
**Consequences:** Two UI implementations of the payment card eventually. Accepted: the card is small, and the alternative (React everywhere) kills the embed story.

## ADR-005: GitHub Pages as the default deploy target; Vercel as the documented alternative
**Context:** Both are free. Pages needs zero new accounts for the target user, reinforces "you own everything", and survives if any single company changes free-tier policy. Vercel has nicer DX and previews.
**Decision:** Ship `deploy-pages.yml` as the batteries-included path (subpath-aware via `github.event.repository.name`); README carries a Deploy-to-Vercel button.
**Consequences:** All asset paths must respect Vite `base` (CI enforces by building with a subpath). Two documented paths to keep green in CI.

## ADR-006: Deeplink is best-effort; QR + Copy-VPA are the guaranteed paths
**Context:** GPay/PhonePe deliberately degrade browser `upi://` intents to unverified VPAs (silent no-ops, "limit exceeded" errors, ignored amounts). Failure is undetectable directly.
**Decision:** Mobile shows all three methods; deeplink gets a visibility-change heuristic (1.5s) that, on suspected failure, surfaces a friendly nudge toward Copy-VPA/QR. Marketing copy never promises one-tap payments.
**Consequences:** Slightly busier mobile pay zone; materially higher real-world success rate; honesty as brand.

## ADR-007: Analytics behind an adapter, off by default, intent-only events
**Context:** Analytics is genuinely useful (creators asked: views, amount impressions) but is also the main privacy risk and the only network egress. Completions are untrackable (ADR-001).
**Decision:** Three-event contract (`page_view`, `amount_selected`, `pay_clicked{method}`) behind an `AnalyticsAdapter`. Default noop with zero network and zero bundled bytes (lazy `import()` of PostHog only when configured). Donor message content is never an event property. PostHog first (free 1M events/mo, custom events); Umami/Plausible as community adapters.
**Consequences:** "Amount impressions ≠ payments" must be explicit in creator docs. Adapter interface invites contributions without expanding our surface.

## ADR-008: Mandatory documented ₹1 self-test before going live
**Context:** A VPA typo that still matches the format regex sends every donation to a stranger, unrecoverably. No API exists to verify VPA ownership without a PSP.
**Decision:** SETUP.md's launch checklist ends with a required step: scan your own deployed QR and send yourself ₹1 from a different UPI account/app. The README badge/checklist references it.
**Consequences:** Can't be technically enforced; treated as a documentation/culture guarantee. Build-time regex + `.strict()` catch the mechanical errors.

## ADR-009: Single-package repo for v0; workspaces only when the widget lands
**Context:** Temptation to scaffold the "correct" monorepo now.
**Decision:** v0 is one package. Restructure to pnpm workspaces in the first v1 PR.
**Consequences:** One `git mv`-heavy PR later; much lower fork/setup friction for the entire v0 life, which is when most forks happen.
