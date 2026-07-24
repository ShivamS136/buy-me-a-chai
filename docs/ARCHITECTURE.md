# ARCHITECTURE.md — buy-me-a-chai

## Stack

| Layer | Choice | Why |
|---|---|---|
| Build | Vite 8 | Fast, first-class static output, `base` option handles Pages subpath. Vite 8 is forced by `@vitejs/plugin-react@6`'s `vite: ^8` peer (ADR-014) |
| UI | React 18 + TypeScript (strict) | Owner's home turf; v1 widget will NOT use React (see ADR-004) |
| Styling | Tailwind CSS v4 + CSS custom properties for theme tokens | Tokens make widget theming portable |
| Config | `chai.config.yaml` + `yaml` parser (build-only dep), validated by Zod v4 (`z.strictObject`) at build, served via `virtual:chai-config` | YAML keeps creator + template in separate files (conflict-free updates); build-time validation keeps Zod and the parser out of the browser (ADR-030). `chai.schema.json` (`z.toJSONSchema`) gives editor autocomplete |
| QR | `qrcode` as an **encoder only**; we render the SVG and PNG ourselves (ADR-017) | No server, no canvas, regenerates per keystroke — and the downloaded bytes are decodable in CI |
| Icons | Lucide for UI glyphs + `simple-icons` (CC0) for social brand marks | Lucide dropped brand icons in v1; both are inlined path data, no icon CDN (ADR-023) |
| Tests | Vitest + @testing-library/react + `jsqr` (decode QRs in tests) | URI builder & QR round-trip provable in CI |
| Package mgr | pnpm (Node 24) | Workspaces-ready for v1 monorepo. Node 24 strips TS types natively, so build scripts need no `tsx`/`ts-node` |
| CI/CD | GitHub Actions | lint + typecheck + test + build (root **and** subpath) on PR; deploy to Pages on main |
| Analytics | Adapter interface; PostHog adapter behind a build-time flag (ADR-028) | Optional by contract, not by if-statements scattered around — and a disabled build ships none of it |
| Lint/format | Biome | One binary, one config; enforces "no `any`" and the default-export rule that `tsc` cannot |

**Explicit rejections:** Next.js (no SSR need; static export friction), any backend/serverless (see CLAUDE.md hard rule 1), CSS-in-JS (widget portability), external font/icon CDNs (privacy).

## Repository layout (v0 — single package)

```
buy-me-a-chai/
├── CLAUDE.md
├── README.md
├── CONTRIBUTING.md
├── LICENSE                    # MIT
├── chai.config.yaml          # ← the creator's file (YAML, values only; example ships pre-filled)
├── chai.schema.json          # generated from the Zod schema — the creator's editor autocomplete (ADR-030)
├── index.html
├── vite.config.ts             # base: env BASE_PATH || '/'; chai-config (virtual module + analytics flag + HMR) + chai-config-validator + chai-noscript + chai-head plugins
├── biome.jsonc                # lint + format
├── tsconfig.json              # solution: references app / node / scripts projects
├── .nvmrc  .node-version      # Node 24
├── package.json
├── docs/                      # PRD, DESIGN, ARCHITECTURE, CONFIG, DECISIONS, ROADMAP, SETUP, COMPAT
├── .github/workflows/
│   ├── ci.yml                 # PR: lint, typecheck, schema-drift, test+coverage, build, no-analytics-bytes grep, subpath build, guard negative test
│   ├── deploy-pages.yml       # main: build:deploy with BASE_PATH from the repo name → Pages (ADR-029)
│   └── update-template.yml    # button: merge template updates into a PR, keeping the creator's config (ADR-031)
├── scripts/
│   ├── read-config.mts        # the only node:fs/YAML read of chai.config.yaml; memoised (ADR-030)
│   ├── gen-schema.mts         # writes chai.schema.json from Zod; --check is the CI drift guard
│   ├── check-config.mts       # CI step: Zod-validate chai.config.yaml, exit 1 on failure
│   ├── check-placeholder.mjs  # deploy gate: refuse to ship the unedited example (ADR-013)
│   └── placeholder-detect.mjs # pure detection logic, unit-tested
├── public/                    # avatar, favicon, og-image
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css              # @import "tailwindcss" + @theme tokens
    ├── strings.ts             # all user-visible copy
    ├── chai-env.d.ts          # ambient: __CHAI_ANALYTICS__ flag + virtual:chai-config module
    ├── config/
    │   ├── schema.ts          # Zod schema (.describe() feeds the JSON Schema) + inferred types
    │   ├── css-color.ts       # dependency-free CSS colour parse + WCAG contrast
    │   ├── warnings.ts        # WARN-only rules (contrast, CSP, note safety)
    │   ├── load.ts            # pure: parseConfig + declaresAnalytics + CONFIG.md error formatting
    │   └── config.ts          # the app's singleton — re-exports virtual:chai-config (ADR-030)
    ├── lib/                   # framework-free core, except the DOM-touching ones below
    │   ├── upi.ts             # buildUpiUri(), validateVpa(), formatAmount()
    │   ├── qr.ts              # matrix + SVG + PNG encoders, no canvas (ADR-017)
    │   ├── amount.ts          # donor input parsing, ₹ formatting (en-IN grouping)
    │   ├── markdown.ts        # bio markdown subset → AST: bold/italics/http links
    │   ├── social.ts          # social URL → simple-icons brand mark (ADR-023)
    │   ├── asset.ts           # config asset path → Vite base (GitHub Pages subpath)
    │   ├── download.ts        # data: URI → file download (DOM)
    │   ├── device.ts          # isMobileDevice() single pointer heuristic (DOM, ADR-019)
    │   ├── clipboard.ts       # copyText(): async Clipboard API + execCommand fallback (DOM)
    │   ├── referral.ts        # branding-link utm/ref tags (campaign injected) + inbound source read (ADR-027)
    │   └── theme.ts           # accent derivation + data-theme apply (DOM, ADR-021)
    ├── analytics/
    │   ├── types.ts           # the ChaiEvent union — the contract ANALYTICS.md documents
    │   ├── noop.ts            # default; one type import, zero state, zero network
    │   ├── deferred.ts        # buffers events until the provider chunk arrives; drops on failure
    │   ├── index.ts           # picks the adapter once; exports `track` — the only call site API
    │   └── posthog.ts         # the sole posthog-js importer; reached only via a flag-gated import() (ADR-028)
    ├── components/
    │   ├── Masthead.tsx       # locked brand banner + use-this-template CTA (ADR-026, ADR-027)
    │   ├── Profile.tsx  Bio.tsx  Works.tsx   # creator identity + trust (left column)
    │   ├── ReferralNote.tsx   # inbound ?ref=/?source= chip above the grid (ADR-027)
    │   ├── PaymentCard.tsx    # amount chips, custom input, message (pinned right column)
    │   ├── PayZone.tsx        # QR-led on every device; Copy+Save row; mobile-only experimental deeplink (ADR-046)
    │   ├── QrCode.tsx  Toast.tsx
    │   └── Footer.tsx         # repo + maker-support template links (ADR-026, ADR-027)
    └── hooks/
        ├── useUpiIntent.ts    # amount+note → { intent, errors, qr }
        ├── useIsMobile.ts     # useSyncExternalStore over the pointer heuristic
        └── useToast.ts        # one ephemeral copy-confirmation toast
```

v1 restructures to pnpm workspaces: `packages/page`, `packages/widget` (Lit web component), `packages/core` (upi.ts, schema — shared, framework-free). **Do not pre-create this in v0**; `src/lib` and `src/config` are written framework-free so extraction is mechanical.

## Key flows

### Config → page
`chai.config.yaml` (creator-edited, gitignored? **No** — committed; it's the point of the fork) → read once by `scripts/read-config.mts` (`node:fs` + YAML) → validated with Zod in `src/config/load.ts` → served to the browser as a plain object via the `virtual:chai-config` module (ADR-030). The validation and the parse both happen in Node at build time, so **neither Zod nor a YAML parser ships in the browser bundle** — it dropped ~70 kB. `src/config/config.ts` is a thin re-export of the virtual module; a bad config throws in the plugin's `load` hook, which surfaces as Vite's dev overlay and, in build, via the `chai-config-validator` plugin's formatted per-field report (a separate `apply:'build'` plugin, since a serve-mode throw would abort Vitest — ADR-016). CI runs the build, a dedicated `pnpm check:config` step, and `pnpm check:schema` (which fails if `chai.schema.json` has drifted from the Zod schema). Two more plugins read the same memoised YAML: `chai-noscript` bakes the creator's real VPA into the `<noscript>` block of `index.html` so a JS-disabled donor still gets a UPI ID to copy (ADR-020); `chai-head` injects the document title, description, `<html lang>`, OG/Twitter cards and a forced `data-theme` — head tags that must be in the *served* HTML because social crawlers never run the bundle (ADR-022). The analytics API key is injected into the config from `VITE_POSTHOG_KEY` by the `chai-config` plugin at build time, not written in the YAML.

### Amount → payable intent
```
(amountRupees, note) → buildUpiUri({vpa, name, amount, note})
  → upi://pay?pa=..&pn=..&am=150.00&cu=INR&tn=..
  → QrCode renders dataURL          (desktop primary)
  → <a href={uri}> intent           (mobile primary)
  → clipboard copies vpa            (universal fallback)
```
`buildUpiUri` rules (unit-tested, 100% branch): 2-decimal `am`, whole rupees only (ADR-011); `tn` truncated to 60 **decoded code points** (ADR-012); RFC 3986 `encodeURIComponent` encoding applied to `pn`/`tn` only — **never `URLSearchParams`**, which emits `+` for a space (ADR-010) — while `pa`/`am`/`cu` are emitted verbatim; **no** `mc`/`tr`/`mode`/`purpose` params (P2P safety — see CLAUDE.md).

### Deeplink honesty
We cannot detect whether a `upi://` intent opened an app — there is no callback. Rather than guess, the pay zone demotes the deeplink to an experimental, mobile-only affordance and states the caveat up front with an always-visible line ("…opens in only a few apps. Scan the QR or copy the ID above instead"). This retired the old 1.5s `visibilitychange` failure heuristic and its `useDeeplinkAttempt` hook (ADR-046): a static, honest caveat beats a probabilistic one, and the two guaranteed paths sit right above it.

### Analytics contract
```ts
type ChaiEvent =
  | { name: 'page_view'; source?: string }   // sanitised inbound ?ref= host (ADR-027)
  | { name: 'amount_selected'; amount: number; preset: boolean }
  | { name: 'pay_clicked'; method: 'deeplink' | 'copy_vpa' | 'qr_download'; amount: number };
```
Call sites import one function, `track(event)`, from `src/analytics/index.ts`; nothing else reaches the adapter. The adapter is chosen once at startup by two gates: the build-time `__CHAI_ANALYTICS__` flag (does the config declare analytics? — decides which *bytes* ship) and the runtime `config.analytics` (is there a key? — decides whether they *run*). See ADR-028; the reason the second exists is that `load.ts` erases the analytics object when `VITE_POSTHOG_KEY` is unset, so a fork that copies a config but not its environment lands on `noop`.

`track` is synchronous, returns nothing, and never throws — a payment path that could be broken by analytics would be a worse trade than no analytics. Events emitted before the PostHog chunk resolves are buffered (cap 20) and replayed; if the chunk never arrives, they are dropped silently.

**Never** track note content, donor identifiers, or IP-adjacent data. Three enforcement layers, because "we were careful" is not a mechanism: the `ChaiEvent` union makes a fourth event a typecheck failure, `src/analytics/contract.test.ts` scans every source file for out-of-contract call sites and for any `fetch`/`sendBeacon`/`XMLHttpRequest` anywhere in `src/`, and the SDK's `before_send` drops any event PostHog generated on its own.

## Build & deploy

- **GitHub Pages (default):** `deploy-pages.yml` — checkout → pnpm install → `BASE_PATH=/${repo-name}/ pnpm build:deploy` → upload-pages-artifact → deploy. `build:deploy` runs the placeholder guard first (ADR-013), so an unedited fork cannot publish the example page. Uses `${{ github.event.repository.name }}` so renamed forks work untouched; a custom domain overrides it with the `CHAI_BASE_PATH` repository variable set to `/` (ADR-029). Deploy deliberately does not re-run lint/tests — CI runs on the same push.
- **Vercel:** zero config (`dist` output, `pnpm build`); "Deploy" button in README with repo URL pre-filled.
- **Custom domain:** documented in SETUP.md (CNAME file for Pages / dashboard for Vercel), not automated.
- SPA with a single route ⇒ no 404 routing hacks needed.

## Testing strategy

| Area | Approach |
|---|---|
| `upi.ts` | Table-driven unit tests: amounts (1, 1.5→rejected per ADR-011, 100000+), notes (empty→default, 61 chars, emoji, `&`/`#`), VPA validation matrix |
| QR round-trip | Generate QR → decode the **rendered pixels** and the **downloaded PNG** with `jsqr` → assert exact URI equality. The PNG's zlib stream is separately validated by Node's `inflateSync`, so our encoder is not marking its own homework |
| Config schema | Valid example passes; each invalid field yields its specific error message |
| Components | PaymentCard interaction (chip select, custom amount, counter), PayZone device branching (mock `device.ts`) |
| Analytics | `deferred.ts` buffering/failure/cap in isolation; `selectAdapter` gates; a source scan (`contract.test.ts`) for out-of-contract events and stray network primitives; a rendered-page assertion that a disabled build calls neither `fetch` nor `sendBeacon` |
| CI gate | `pnpm verify` on every PR, plus a subpath build, a config-validity check, a grep proving a disabled build carries no PostHog bytes (ADR-028), and a **negative** test asserting the placeholder guard rejects the shipped example (ADR-013) |

Manual matrix (community-maintained `docs/COMPAT.md`): {GPay, PhonePe, Paytm, BHIM, CRED} × {Android Chrome, iOS Safari} × {QR scan, upload-QR, deeplink, copy}.

## Security & privacy posture

- No secrets anywhere (PostHog public key is public by nature; still via env `VITE_POSTHOG_KEY` so forks don't inherit the example's).
- CSP via meta tag: `default-src 'self'` + PostHog host only when enabled.
- Donor message → UPI `tn` only; sanitized (strip control chars); never persisted, never sent to analytics.
- Dependencies minimal & pinned; Renovate optional for the canonical repo, not forks.
