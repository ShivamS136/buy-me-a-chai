# Contributing to buy-me-a-chai

Thanks for helping keep chai commission-free. ☕

## Before you start

1. Read [docs/PRD.md](docs/PRD.md) §3 (non-goals) and [docs/DECISIONS.md](docs/DECISIONS.md). **Features needing a backend, PSP, or payment confirmation will be closed** with a link to ADR-001/002 — it's the project's core promise, not stubbornness.
2. For anything non-trivial, open an issue first. Small fixes: straight to PR.

## Most-wanted contributions

- **UPI app compatibility reports** — test your device/app combo against the matrix in `docs/COMPAT.md` and PR your results. Highest-value, zero-code contribution.
- **Analytics adapters** — Umami, Plausible, GoatCounter behind the `AnalyticsAdapter` interface (`src/analytics/types.ts`). Rules: lazy-load, zero bytes when disabled, only the three contract events, never donor message content.
- **Themes** — token presets; must pass AA contrast in light and dark.
- **i18n groundwork** — strings live in `src/strings.ts`; Hinglish and Hindi first.
- **Docs** — SETUP.md clarity for non-dev creators is a product surface.

## Dev setup

```bash
corepack enable pnpm   # once — picks up the pinned pnpm from package.json
pnpm install
pnpm dev               # local dev server with the example config
pnpm verify            # lint + typecheck + test + build — must be green before PR
```

**Node 24+, pnpm 11+.** Both are enforced (`engines` + `engine-strict=true`), so a mismatch fails
`pnpm install` rather than producing confusing errors later. `nvm use` / `fnm use` picks up `.nvmrc`.

Lint and format are Biome: `pnpm lint` to check, `pnpm lint:fix` to autofix.

## Ground rules (enforced in review)

- TypeScript strict, no `any`. All user-visible strings via `strings.ts`.
- Any change touching `src/lib/upi.ts`, QR, deeplink, or clipboard **must include tests in the same PR**. The URI builder and config schema stay at 100% branch coverage.
- No new runtime dependencies without an issue discussion (bundle size and auditability are features).
- No network calls outside the enabled analytics adapter. No external CDNs for fonts/icons/scripts on the page.
- UPI URIs: `pa, pn, am, cu, tn` only — never add `mc`/`tr`/`mode` (see CLAUDE.md "UPI domain knowledge").
- Never encode UPI params with `URLSearchParams` — it emits `+` for spaces (ADR-010).
- `src/lib/` and `src/config/` are framework-free and stay import-free (no React, no `node:*`, not even `strings.ts`) so the v1 widget can extract them. They emit error *codes*; UI copy is keyed off the code in `strings.ts` (ADR-015).
- Never add UI implying payment confirmation.
- Conventional Commits. Keep PRs single-purpose.

## PR checklist

- [ ] `pnpm verify` green (lint + typecheck + test + build)
- [ ] Builds correctly with subpath: `BASE_PATH=/buy-me-a-chai/ pnpm build`
- [ ] Docs updated if behavior/config changed (CONFIG.md for schema, COMPAT.md for device findings)
- [ ] New ADR proposed in DECISIONS.md if you changed a decided direction

## Code of conduct

Be kind, assume good faith, review the code not the person. Creators of all skill levels file issues here — setup questions are welcome, RTFM responses are not.
