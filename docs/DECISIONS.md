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

## ADR-010: UPI URI encoding is RFC 3986 — never `URLSearchParams`
**Context:** ARCHITECTURE.md originally specified `URLSearchParams` encoding for the intent URI. `URLSearchParams` implements the WHATWG `x-www-form-urlencoded` serializer, which encodes a space as `+`. UPI apps decode `upi://` query strings with plain percent-decoders, where `+` is a literal plus (RFC 3986 §3.4). Verified: `new URLSearchParams({tn:'Thanks for the chai'}).toString()` → `tn=Thanks+for+the+chai`.
**Decision:** Encode with `encodeURIComponent`, additionally escaping `!'()*` so the payload is unreserved-only. Apply encoding to `pn` and `tn` **only**. Emit `pa`, `am` and `cu` verbatim — every character a regex-valid VPA can contain is RFC 3986 unreserved or `@`, and percent-encoding the `@` (`shivam%40okaxis`) would break parsers that don't decode `pa`.
**Consequences:** Donor notes and creator names render correctly in the payer's app instead of showing `+` for every space. `am` never gets a `%2E`. Supersedes ARCHITECTURE.md's earlier `URLSearchParams` wording, which is now corrected. A regression test asserts `encodeUpiComponent('a b') === 'a%20b'` **and** that `URLSearchParams` still differs, so the trap is locked shut.

## ADR-011: Integer rupees only, plus a numeric-integrity hard ceiling
**Context:** ARCHITECTURE.md left "1.5 → reject?" open. Meanwhile `(1e21).toFixed(2)` returns `"1e+21"`, which would emit a malformed `am`.
**Decision:** Reject fractional rupees (`AMOUNT_NOT_INTEGER`). Add `HARD_MAX_AMOUNT_RUPEES = 10_000_000` (₹1 crore) as a numeric-integrity guard with its own code, distinct from the ₹1,00,000 soft cap. The soft cap stays a UI warning surfaced via an `exceedsSoftCap` flag on the success value — the builder never errors on a large amount.
**Consequences:** Aligns with DESIGN.md, which already says "integers only (UPI supports paise but donors think in rupees)". Every amount the product can produce is an integer by construction (`basePrice` and `presets` are both integers). Avoids the silent class of failure where an app rounds or drops paise and we cannot detect it (ADR-001: no confirmation channel). `chai.maxAmountWarning` remains creator-configurable.

## ADR-012: The `tn` limit is 60 decoded code points, not an encoded-byte budget
**Context:** CLAUDE.md says "`tn` ≤ 60 chars"; ARCHITECTURE.md said "truncated to 60 chars post-encoding budget". These conflict. A post-encoding budget would allow a Devanagari note roughly 6 characters (each is 9 encoded bytes: `%E0%A4%9A`) and an emoji note about 5.
**Decision:** 60 **decoded code points**. Truncate via `Array.from`, never by UTF-16 slicing.
**Consequences:** Usable for the Hinglish/Indic audience this product targets, and it matches the character counter the donor reads in the UI. UTF-16 slicing is banned because splitting a surrogate pair yields a lone surrogate and `encodeURIComponent` throws `URIError` on one — that would crash the QR render path on a keystroke. Sanitising strips invisible and bidi-spoofing characters but deliberately **preserves** U+200C ZWNJ and U+200D ZWJ, which are semantically required in Devanagari conjuncts and family emoji.

## ADR-013: The placeholder guard is a deploy-time gate, not a build-time one
**Context:** The example config must ship with a creator-shaped VPA. `yourname@bank` is a valid *format*, so the Zod schema accepts it — which is required, because CI has to build the shipped example to prove the example is valid. But a fork that deployed it unedited would publish a page whose QR points at nobody.
**Decision:** Keep `pnpm build` pure so the canonical repo and every contributor fork build the example green. Add `pnpm build:deploy` = `check:placeholder && vite build`, used by the Pages workflow. The canonical repo's CI asserts the guard **rejects** the shipped example (a negative test) — that is what proves the guard is wired up. `CHAI_ALLOW_PLACEHOLDER=1` is the documented escape hatch for previewing a deploy.
**Consequences:** Two build entry points to keep straight. Detection is case- and whitespace-insensitive, so "editing" only the capitalisation still fails. The canonical repo must not publish a live demo from the placeholder config; if a public demo is ever wanted it needs either a real VPA or an unmissable "example only — do not send money" banner, per ADR-008's spirit.

## ADR-014: Toolchain — exact pins, current majors, Node 24
**Context:** ARCHITECTURE.md specified Vite 6 and CLAUDE.md specified Node 20+. At scaffolding time the registry had moved considerably, and `@vitejs/plugin-react@6` declares `peerDependencies: { vite: "^8.0.0" }` — Vite 6 and 7 will not install with it.
**Decision:** Vite 8, TypeScript 7, Zod 4, Vitest 4, Tailwind 4, Node 24 (`engines`, `.nvmrc`, `.node-version`, CI `node-version-file`). React stays pinned to 18.x including `@types/react` 18.x, per ADR-004. All dependencies are exact-pinned, no carets.
**Consequences:** Records a visible deviation from a written doc, forced by a hard peer constraint rather than preference. `@types/react` must never drift to 19.x while React is 18. `@vitest/coverage-v8` must track `vitest` exactly. Node 24 strips TypeScript types natively, which is why `scripts/check-config.mts` needs no `tsx`/`ts-node` dependency.

## ADR-015: The framework-free core emits error codes and is exempt from the `strings.ts` rule
**Context:** CLAUDE.md requires all user-visible strings to live in `src/strings.ts`. But `src/lib/upi.ts` and `src/config/*` must stay import-free so they can be extracted to `packages/core` for the v1 widget (ADR-004), and config errors are creator-facing build output rather than page copy.
**Decision:** The core emits a stable `UpiErrorCode` plus developer-facing English; UI copy is keyed off the code in `strings.ts`. Config validation messages live in the schema. The `Buy {name} a chai` `meta.title` default is derived in the schema too, because it is needed before React mounts.
**Consequences:** Two documented exceptions to a hard convention, noted in the `strings.ts` header so nobody "fixes" them. i18n later translates by code, not by string matching. Note the deliberate layering difference: the schema *rejects* a `creator.name` over 50 characters at build time, while `sanitizeName` *truncates* at runtime — build-time and runtime have different jobs.

## ADR-016: `defineConfig` is an identity function; two error surfaces by design
**Context:** `defineConfig` could validate at authoring time. If it did, an invalid config would throw a raw `ZodError` during module evaluation, before `load.ts` could format it.
**Decision:** `defineConfig` is a typed identity function and never parses. Validation happens exactly once, in `parseConfig`. Build enforcement is the `chai-config-validator` Vite plugin, because a bundler only bundles modules — it never executes them, so a module-scope `throw` in app code does **not** fail `vite build`.
**Consequences:** Creators always see the CONFIG.md-formatted block, never a Zod stack. TypeScript catches shape and typo mistakes in the editor; Zod catches value mistakes at build; neither can do the other's job. `src/config/load.ts` is kept side-effect-free so build scripts can `try`/`catch` it, with the app's singleton isolated in `src/config/config.ts`.

## ADR-017: We render the QR ourselves; `qrcode` is used only as an encoder
**Context:** ARCHITECTURE.md specified `qrcode` "(client-side canvas → dataURL)". Its `toCanvas`/`toDataURL` renderers require a real `<canvas>`, which jsdom does not implement. That makes the download path — an explicit P0.5 acceptance criterion ("downloadable as PNG") — untestable in CI, on a payment surface where a wrong QR sends money to a stranger unrecoverably (PRD §8.3).
**Decision:** Use only `qrcode`'s pure-JS `create()` to get the module matrix, and render both outputs ourselves in `src/lib/qr.ts`: an SVG for display and a hand-rolled 1-bit greyscale PNG for download. No canvas anywhere.
**Consequences:** `qr.test.ts` decodes the exact bytes a donor downloads, with `jsQR` reading the pixels back and Node's `zlib.inflateSync` independently validating our zlib stream — neither is our own code marking its own homework. Display and download derive from one matrix, so they cannot disagree. The cost is ~90 lines of encoder and a PNG that is roughly 10× larger than a compressed one (~14KB, using stored DEFLATE blocks rather than implementing Huffman coding) — paid once, on a button a donor presses at most once. `qr.ts` stays framework-free and DOM-free, so it extracts to `packages/core` with the rest (ADR-004). Supersedes ARCHITECTURE.md's "canvas → dataURL" wording, now corrected.

## ADR-018: The brand accent is a fill colour, not a text-on-fill colour
**Context:** The payment card's selected preset chip was originally a solid `--chai-accent` (#C4622D) fill with white text. Measured with the project's own `contrastRatio`, white on that accent is **4.09:1** — it clears WCAG 1.4.11 (3:1) for a UI component fill, but fails 1.4.3 (4.5:1) for the chip's label-sized text sitting on top of it. This is the same 4.09:1 that ADR-014-era work already established is within 0.5% of the theoretical maximum for this hue against both light and dark surfaces, so "pick a better terracotta" is not available.
**Decision:** Selected state is `--chai-accent-soft` tint plus a 2px `--chai-accent` border with ink text (13.9:1). A separate `--chai-accent-strong` (#A34E22, 5.7:1 on white) is defined for any surface that genuinely needs white text on a filled accent — the mobile "Pay with UPI app" button in Session 3 is the expected first user. The accent itself is reserved for borders, icons, focus rings and **large** text such as the amount numeral, where 3:1 is the applicable bar.
**Consequences:** DESIGN.md's `--chai-accent-ink: #FFFFFF` pairing is valid only against `accent-strong`, never against `accent`. Any future component putting normal-size text on the accent is an accessibility regression; the tokens are named so the correct one is the obvious one to reach for. Dark mode lifts the accent to #E08A4F (6.4:1 on the dark surface), where the constraint does not bind.

## ADR-019: The pay-zone layout turns on one device heuristic; the deeplink follows it
**Context:** ARCHITECTURE.md listed `isMobile()` and `canDeeplink()` as two device heuristics. In v0 they answer the same question. A `upi://` intent only resolves where a UPI app is installed — Android and iOS — which is exactly the coarse-pointer, phone-or-tablet population where a QR is useless because a device cannot scan its own screen. There is no device that is "mobile but cannot deeplink" or "desktop but can," so a second predicate would be an alias.
**Decision:** One heuristic, `isMobileDevice()` in `src/lib/device.ts`, resolved in confidence order: a positive `navigator.userAgentData.mobile`, then `matchMedia('(pointer: coarse)')` (which also catches tablets the client hint reports as non-mobile), then a UA sniff. `useIsMobile` binds it through `useSyncExternalStore` so the layout follows a live pointer change — a mouse plugged into a 2-in-1, or devtools emulation. `PayZone` leads with buttons + deeplink when it is true and with the QR when false; the deeplink is shown iff mobile.
**Consequences:** The three paths stay peers regardless of branch (hard rule 3) — copy and QR never hinge on the heuristic. A false "desktop" on a touch laptop just shows the QR, which still works; a false "mobile" shows a deeplink that may no-op, which the visibility heuristic (ADR-006) already catches and softens. `device.ts` is DOM-touching, so it sits beside `download.ts` in `src/lib` rather than in the framework-free core. Supersedes ARCHITECTURE.md's two-function wording, now corrected.

## ADR-020: The `<noscript>` block carries the real VPA, injected at build time
**Context:** Copy-UPI-ID is the one guaranteed payment path (ADR-006), and with JavaScript disabled it is the *only* one: the QR is built client-side and React never mounts. A generic "copy the UPI ID" sentence is useless without the actual ID, and the ID is not in the served HTML — it lives in `chai.config.ts`, which the static `index.html` cannot see.
**Decision:** A `chai-noscript` Vite plugin (`transformIndexHtml`) parses the config at build and replaces the `<noscript>` in `index.html` with the creator's real VPA and derived title, inline-styled so it renders without the bundle. Name, title and VPA are HTML-escaped — the VPA regex already forbids HTML-special characters, but a display name does not. Any failure leaves the static fallback noscript from `index.html` in place. The copy lives in the plugin, not `src/strings.ts`, for the same reason `meta.title`'s default lives in the schema (ADR-015): it is needed before — or entirely without — a React mount, so it cannot depend on the UI string layer.
**Consequences:** A JS-disabled donor sees the exact UPI ID to type into their app, on-thesis with "VPA typos are catastrophic; copy-VPA is the guaranteed path." A build-time *static QR* remains a logged nice-to-have (DESIGN.md §Empty/edge). The plugin runs in both serve and build but is guarded so a config error never blocks dev — the config validator plugin and `src/config/config.ts` already own that failure surface.
