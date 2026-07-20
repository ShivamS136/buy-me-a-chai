# CLAUDE.md — buy-me-a-chai

Instructions for Claude Code when working in this repository. Read this fully before making changes.

## What this project is

A **zero-commission, self-hosted UPI donation page** for Indian creators. Creators fork/template this repo, edit `chai.config.ts`, and deploy to GitHub Pages or Vercel for free. Donors pay via UPI P2P (QR scan / copy VPA / `upi://` deeplink) directly to the creator's UPI ID. **There is no backend, no database, no accounts, and no payment processing anywhere in this project — by design, forever.**

Owner: `shivams136`. Canonical repo: `github.com/shivams136/buy-me-a-chai`.

## Documents map

| File | Purpose |
|---|---|
| `docs/PRD.md` | Requirements, scope, priorities. **Check scope here before adding features.** |
| `docs/DESIGN.md` | UI/UX spec: layout, flows, states, copy guidelines |
| `docs/ARCHITECTURE.md` | Tech stack, project structure, build/deploy pipeline |
| `docs/CONFIG.md` | The `chai.config.ts` schema — the public API of this project |
| `docs/ANALYTICS.md` | Event contract (3 events, fixed properties) + PostHog dashboard spec + `scripts/posthog-dashboard.mjs` |
| `docs/DECISIONS.md` | ADRs. **Do not re-litigate decided items; add a new ADR to change one.** |
| `docs/ROADMAP.md` | Phases v0/v1/v2 |
| `docs/SETUP.md` | Creator-facing setup guide (treat as a product surface — keep beginner-friendly) |

## Hard rules (never violate)

1. **Never add a server, API route, serverless function, or database.** Output must remain pure static assets. If a feature seems to need a backend, it's out of scope — say so and point to `docs/PRD.md` §3.
2. **Never imply payment confirmation.** No "Thank you for your donation!" post-payment states, no fake success screens. We cannot know if payment happened. Allowed: "QR scanned? Payment happens in your UPI app."
3. **Never hide the QR or Copy-UPI-ID fallbacks behind the deeplink.** Deeplinks fail silently on GPay/PhonePe for P2P VPAs. All three payment paths stay visible on mobile.
4. **Never make network calls when analytics is disabled.** Grep for `fetch(`/`navigator.sendBeacon` after touching analytics code; the no-op adapter must be truly inert.
5. **Never collect, store, or transmit donor PII.** The donor message goes into the UPI `tn` param only.
6. **Config is the only customization API.** No feature should require creators to edit component source. If it needs customization, it goes in `chai.config.ts` schema + `docs/CONFIG.md`.
7. **All builds must work on a GitHub Pages subpath** (`/buy-me-a-chai/`). Never hardcode absolute paths; use Vite `base`.

## UPI domain knowledge (do not "fix" these)

- UPI URI format: `upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR&tn=<note>`. `am` uses 2 decimals. `tn` ≤ 60 **decoded code points** (ADR-012), percent-encoded, avoid special chars beyond spaces (some apps choke).
- Encode with `encodeURIComponent`, **never `URLSearchParams`** — it emits `+` for a space, which UPI apps show literally (ADR-010). Encode `pn` and `tn` only; `pa`/`am`/`cu` are emitted verbatim.
- Amounts are whole rupees only; fractional amounts are rejected (ADR-011).
- Do NOT add `mc` (merchant code) or `tr` params for P2P — they can trigger merchant-verification failures.
- Amount in QR is a convenience; some apps let donors edit it. That's fine.
- Deeplink flakiness on GPay/PhonePe is a **platform policy, not our bug**. Don't add retry loops or user-agent hacks that pretend to solve it; keep honest fallback UX.
- VPA regex (build validation): `/^[a-zA-Z0-9.\-_]{2,49}@[a-zA-Z][a-zA-Z0-9]{2,49}$/` — reject spaces, uppercase-normalize is NOT allowed (VPAs are case-insensitive but preserve what the creator typed).

## Tech stack (see ARCHITECTURE.md for detail)

- Vite 8 + React 18 + TypeScript strict. No Next.js (no SSR needed; static only).
- Tailwind CSS v4 (CSS-first: `@tailwindcss/vite` + `@import "tailwindcss"`, no `tailwind.config.js`). Zod v4 for config validation (`z.strictObject`). `qrcode` package for QR (client-side, lands in Session 2).
- Vitest + Testing Library for unit tests; the UPI URI builder and config validator must have 100% branch coverage (enforced by `coverage.thresholds` in `vite.config.ts`).
- Biome for lint + format (`pnpm lint`). It enforces the conventions below that `tsc` cannot — no `any`, no stray default exports.
- pnpm. **Node 24** (`.nvmrc`, `.node-version`, `engines`). Node 24 strips TypeScript types natively, which is why build scripts run as plain `node scripts/*.mts` with no `tsx`/`ts-node`.
- Monorepo later (v1 widget) via pnpm workspaces — v0 is a single package, don't prematurely restructure.
- Exact-pinned dependency versions, no carets. See ADR-014 for why the stack tracks current majors.

## Conventions

- TypeScript strict; no `any`; no default exports except `chai.config.ts` and route components.
- Components in `src/components/`, one component per file, PascalCase. Hooks in `src/hooks/`, `use*` camelCase.
- All user-visible strings in `src/strings.ts` (prepares for i18n; don't build i18n yet).
- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`). Small, reviewable commits.
- Every PR that changes payment-path code (URI builder, QR, deeplink, copy) must update or add tests in the same PR.
- Accessibility: interactive elements keyboard-reachable, QR has text alternative (the VPA + amount), color contrast AA.

## Working style for Claude Code sessions

- **Session 1 is scaffolding only** (repo init, tooling, config schema, CI) — no UI. Follow `docs/ROADMAP.md` session breakdown.
- Before implementing, restate which PRD requirement IDs (e.g. P0.5) the change covers.
- Prefer rebuilding a messy module cleanly over patching it incrementally (owner preference).
- When ambiguous, choose the option that keeps the project simpler/static and note the decision as a proposed ADR in `docs/DECISIONS.md`.
- Run `pnpm verify` (= `lint && typecheck && test && build`) before declaring any task done. The build must succeed with the example config.

## Testing payments (manual, documented in SETUP.md)

Real verification requires a human with a UPI app. Claude Code's responsibility ends at: valid URI per spec, QR decodes to that exact URI (test with a QR decode lib in unit tests), and correct URL-encoding of notes with spaces/emoji.
