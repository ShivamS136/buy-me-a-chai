# ROADMAP.md — buy-me-a-chai

## Phases

### v0 — The Page (target: shippable in ~5 focused sessions)
Fork → config → deploy → real ₹1 payment succeeds via QR on GPay and PhonePe.
Covers PRD P0.1–P0.11.

### v1 — The Widget
`<chai-widget>` Web Component (redirect + inline modes), jsDelivr + npm distribution, embed snippet page, theming, pnpm workspaces restructure. PRD P1.1–P1.5.

### v2 — Community-driven
i18n (Hinglish first), multiple VPAs, extra payment links, Umami/Plausible adapters, showcase directory, build-time OG image, submitting "Chai Analytics" to PostHog's official template gallery (requires PostHog-team acceptance — worth it once the project has adoption). Prioritize by issues/PR interest.

---

## v0 — Claude Code session plan

Each session ends green: `pnpm typecheck && pnpm test && pnpm build`. Restate covered PRD IDs at session start (see CLAUDE.md).

### Session 1 — Scaffolding only (no UI)
- Vite + React 18 + TS strict + Tailwind v4 + Vitest + pnpm; MIT license; `.github/workflows/ci.yml`.
- `src/config/schema.ts` (full Zod schema per CONFIG.md, `.strict()`, `defineConfig`) + `load.ts` with formatted error output.
- Example `chai.config.ts` with placeholder creator (`example@upi` must fail? No — use a **valid-format** placeholder `yourname@bank` that fails a dedicated "placeholder not replaced" check, so fresh forks can't accidentally ship the example).
- `src/lib/upi.ts` (`buildUpiUri`, `validateVpa`, amount/note rules) with table-driven tests, 100% branch.
- `src/strings.ts` stub. **Deliverable:** CI green on an empty white page.

### Session 2 — Payment core
- `useUpiIntent` hook; `QrCode` component (qrcode → dataURL, download-PNG); QR↔URI round-trip tests with `jsqr`.
- `PaymentCard` (preset chips as radiogroup, custom amount, message field with counter + sanitization).
- Covers P0.3, P0.4, P0.5 (partial — desktop QR).

### Session 3 — Device-adaptive PayZone
- `device.ts` heuristics; `PayZone` desktop/mobile branching; deeplink anchor; `useDeeplinkAttempt` visibility heuristic + fallback callout; `clipboard.ts` + Toast; `Show QR` accordion; `<noscript>` block.
- Covers P0.5, P0.6, P0.7.

### Session 4 — Page assembly + theme
- Header/Bio/Works/Footer from config; markdown-subset renderer for bio; theme tokens + dark mode + config accent; meta tags/OG from `meta` config; a11y pass (radiogroup keys, aria-live, contrast).
- Covers P0.2, P0.10.

### Session 5 — Deploy + analytics + docs polish
- `deploy-pages.yml` (subpath via repo name), Vercel button; verify subpath build in CI.
- Analytics adapter trio (`types/noop/posthog` with lazy import); wire the three events; grep-test for zero network when disabled.
- Verify `scripts/posthog-dashboard.mjs` against the live PostHog API (query-schema payloads drift — see maintainer note in the script); run it against a throwaway project and screenshot the dashboard for ANALYTICS.md.
- Finalize SETUP.md walkthrough incl. ₹1 self-test checklist; README badges; cut `v0.1.0`.
- Covers P0.8, P0.9, P0.11.

### Post-v0 manual gate (human, not Claude)
Real-device matrix into `docs/COMPAT.md`: {GPay, PhonePe, Paytm, BHIM} × {Android Chrome, iOS Safari} × {QR, upload-QR, deeplink, copy}. v0 announcement only after QR path is confirmed on GPay + PhonePe.

---

## v1 sketch (sessions TBD)
1. Workspaces restructure (`core` / `page` / `widget`), extract framework-free core.
2. Lit widget: redirect-button mode.
3. Inline quick-pay popover mode.
4. Distribution: npm publish + jsDelivr pin docs + embed snippet generator page.
5. Theming pass across page + widget.

## Non-goals reminder
Backend, PSPs, payment confirmation, subscriptions, hosted SaaS — permanently out (PRD §3, ADR-001/002). Close such issues with a link to the ADRs.
