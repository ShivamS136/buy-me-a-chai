# ARCHITECTURE.md — buy-me-a-chai

## Stack

| Layer | Choice | Why |
|---|---|---|
| Build | Vite 8 | Fast, first-class static output, `base` option handles Pages subpath. Vite 8 is forced by `@vitejs/plugin-react@6`'s `vite: ^8` peer (ADR-014) |
| UI | React 18 + TypeScript (strict) | Owner's home turf; v1 widget will NOT use React (see ADR-004) |
| Styling | Tailwind CSS v4 + CSS custom properties for theme tokens | Tokens make widget theming portable |
| Validation | Zod v4 (`z.strictObject`) | Config schema = runtime validation + inferred TS types, one source of truth |
| QR | `qrcode` (client-side canvas → dataURL) | No server, regenerates per keystroke |
| Tests | Vitest + @testing-library/react + `jsqr` (decode QRs in tests) | URI builder & QR round-trip provable in CI |
| Package mgr | pnpm (Node 24) | Workspaces-ready for v1 monorepo. Node 24 strips TS types natively, so build scripts need no `tsx`/`ts-node` |
| CI/CD | GitHub Actions | lint + typecheck + test + build (root **and** subpath) on PR; deploy to Pages on main |
| Analytics | Adapter interface; PostHog adapter (lazy-loaded only when enabled) | Optional by contract, not by if-statements scattered around |
| Lint/format | Biome | One binary, one config; enforces "no `any`" and the default-export rule that `tsc` cannot |

**Explicit rejections:** Next.js (no SSR need; static export friction), any backend/serverless (see CLAUDE.md hard rule 1), CSS-in-JS (widget portability), external font/icon CDNs (privacy).

## Repository layout (v0 — single package)

```
buy-me-a-chai/
├── CLAUDE.md
├── README.md
├── CONTRIBUTING.md
├── LICENSE                    # MIT
├── chai.config.ts             # ← the creator's file (example ships pre-filled)
├── index.html
├── vite.config.ts             # base: env BASE_PATH || '/'; chai-config-validator plugin
├── biome.jsonc                # lint + format
├── tsconfig.json              # solution: references app / node / scripts projects
├── .nvmrc  .node-version      # Node 24
├── package.json
├── docs/                      # PRD, DESIGN, ARCHITECTURE, CONFIG, DECISIONS, ROADMAP, SETUP, COMPAT
├── .github/workflows/
│   ├── ci.yml                 # PR: lint, typecheck, test+coverage, build, subpath build, guard negative test
│   └── deploy-pages.yml       # main: build:deploy with BASE_PATH=/buy-me-a-chai/ → Pages
├── scripts/
│   ├── check-config.mts       # CI step: Zod-validate chai.config.ts, exit 1 on failure
│   ├── check-placeholder.mjs  # deploy gate: refuse to ship the unedited example (ADR-013)
│   └── placeholder-detect.mjs # pure detection logic, unit-tested
├── public/                    # avatar, favicon, og-image
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css              # @import "tailwindcss" + @theme tokens
    ├── strings.ts             # all user-visible copy
    ├── config/
    │   ├── schema.ts          # Zod schema + defineConfig() + inferred types
    │   ├── css-color.ts       # dependency-free CSS colour parse + WCAG contrast
    │   ├── warnings.ts        # WARN-only rules (contrast, CSP, note safety)
    │   ├── load.ts            # pure: parseConfig + CONFIG.md error formatting
    │   └── config.ts          # the app's singleton (throws at import on bad config)
    ├── lib/
    │   ├── upi.ts             # buildUpiUri(), validateVpa(), formatAmount()
    │   ├── device.ts          # isMobile(), canDeeplink() heuristics
    │   └── clipboard.ts
    ├── analytics/
    │   ├── types.ts           # AnalyticsAdapter { track(event, props) }
    │   ├── noop.ts            # default; zero imports, zero network
    │   └── posthog.ts         # dynamic import('posthog-js') only when enabled
    ├── components/
    │   ├── Header.tsx  Bio.tsx  Works.tsx
    │   ├── PaymentCard.tsx    # amount chips, custom input, message
    │   ├── PayZone.tsx        # device-adaptive QR/deeplink/copy
    │   ├── QrCode.tsx  Toast.tsx
    │   └── Footer.tsx
    └── hooks/
        ├── useUpiIntent.ts    # amount+note → { uri, qrDataUrl }
        └── useDeeplinkAttempt.ts  # visibility-change failure heuristic
```

v1 restructures to pnpm workspaces: `packages/page`, `packages/widget` (Lit web component), `packages/core` (upi.ts, schema — shared, framework-free). **Do not pre-create this in v0**; `src/lib` and `src/config` are written framework-free so extraction is mechanical.

## Key flows

### Config → page
`chai.config.ts` (creator-edited, gitignored? **No** — committed; it's the point of the fork) → parsed with Zod → an invalid config fails the build with a formatted error listing each bad field. Enforcement is the `chai-config-validator` plugin in `vite.config.ts`, **not** an import in app code: a bundler only bundles modules, it never executes them, so a module-scope throw would not fail `vite build` (ADR-016). `src/config/config.ts` additionally throws at module load so `pnpm dev` shows the same block in Vite's overlay. CI runs both the build and a dedicated `pnpm check:config` step.

### Amount → payable intent
```
(amountRupees, note) → buildUpiUri({vpa, name, amount, note})
  → upi://pay?pa=..&pn=..&am=150.00&cu=INR&tn=..
  → QrCode renders dataURL          (desktop primary)
  → <a href={uri}> intent           (mobile primary)
  → clipboard copies vpa            (universal fallback)
```
`buildUpiUri` rules (unit-tested, 100% branch): 2-decimal `am`, whole rupees only (ADR-011); `tn` truncated to 60 **decoded code points** (ADR-012); RFC 3986 `encodeURIComponent` encoding applied to `pn`/`tn` only — **never `URLSearchParams`**, which emits `+` for a space (ADR-010) — while `pa`/`am`/`cu` are emitted verbatim; **no** `mc`/`tr`/`mode`/`purpose` params (P2P safety — see CLAUDE.md).

### Deeplink attempt heuristic
On intent click: record `t0`, listen for `visibilitychange` for 1500ms. If document never became hidden ⇒ app likely didn't open ⇒ set `deeplinkLikelyFailed` state ⇒ PayZone surfaces fallback callout. False positives are acceptable (callout is gentle); false negatives cost nothing.

### Analytics contract
```ts
type ChaiEvent =
  | { name: 'page_view' }
  | { name: 'amount_selected'; amount: number; preset: boolean }
  | { name: 'pay_clicked'; method: 'qr_view' | 'deeplink' | 'copy_vpa' | 'qr_download'; amount: number };
```
Adapter chosen once at startup from config. `noop` is the default export path; PostHog is `import()`-ed lazily so disabled builds ship zero analytics bytes. **Never** track note content, donor identifiers, or IP-adjacent data.

## Build & deploy

- **GitHub Pages (default):** `deploy-pages.yml` — checkout → pnpm install → `BASE_PATH=/${repo-name}/ pnpm build:deploy` → upload-pages-artifact → deploy. `build:deploy` runs the placeholder guard first (ADR-013), so an unedited fork cannot publish the example page. Uses `${{ github.event.repository.name }}` so renamed forks work untouched.
- **Vercel:** zero config (`dist` output, `pnpm build`); "Deploy" button in README with repo URL pre-filled.
- **Custom domain:** documented in SETUP.md (CNAME file for Pages / dashboard for Vercel), not automated.
- SPA with a single route ⇒ no 404 routing hacks needed.

## Testing strategy

| Area | Approach |
|---|---|
| `upi.ts` | Table-driven unit tests: amounts (1, 1.5→rejected per ADR-011, 100000+), notes (empty→default, 61 chars, emoji, `&`/`#`), VPA validation matrix |
| QR round-trip | Generate QR → decode with `jsqr` → assert exact URI equality |
| Config schema | Valid example passes; each invalid field yields its specific error message |
| Components | PaymentCard interaction (chip select, custom amount, counter), PayZone device branching (mock `device.ts`) |
| CI gate | `pnpm verify` on every PR, plus a subpath build, a config-validity check, and a **negative** test asserting the placeholder guard rejects the shipped example (ADR-013) |

Manual matrix (community-maintained `docs/COMPAT.md`): {GPay, PhonePe, Paytm, BHIM, CRED} × {Android Chrome, iOS Safari} × {QR scan, upload-QR, deeplink, copy}.

## Security & privacy posture

- No secrets anywhere (PostHog public key is public by nature; still via env `VITE_POSTHOG_KEY` so forks don't inherit the example's).
- CSP via meta tag: `default-src 'self'` + PostHog host only when enabled.
- Donor message → UPI `tn` only; sanitized (strip control chars); never persisted, never sent to analytics.
- Dependencies minimal & pinned; Renovate optional for the canonical repo, not forks.
