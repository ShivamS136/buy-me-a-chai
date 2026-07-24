# PRD — buy-me-a-chai

**Repo:** `shivams136/buy-me-a-chai` · **License:** MIT · **Status:** v0 in development
**One-liner:** A zero-commission, self-hosted "Buy Me a Chai" page for Indian creators, powered by UPI P2P. Fork it, edit one config file, deploy free. Your page, your VPA, your host.

---

## 1. Problem Statement

Indian devs and creators who want casual sponsorship ("buy me a chai") must choose between international platforms (Buy Me a Coffee, Ko-fi — 5%+ commission plus FX pain, weak UPI support) or Indian central platforms (buymeachai.in, chai4.me — commissions or poor maintenance, bugs, privacy concerns, platform risk). Meanwhile UPI P2P transfers are free and universal in India. There is no polished, maintained, self-hostable open-source option that gives creators a donation page with **zero middleman**.

The cost of not solving it: creators either lose a cut of small donations (where fees hurt most), depend on an unreliable third party, or paste a raw UPI ID with no presentation, no amount presets, and no analytics.

## 2. Goals

1. **Time-to-live page < 15 minutes** for a dev: fork/template → edit config → deploy on GitHub Pages or Vercel free tier.
2. **₹0 running cost, 0% commission, 0 signups** — no backend, no database, no accounts, fully static.
3. **Payment success on every Indian smartphone** via at least one of: QR scan, copy-UPI-ID, or `upi://` deeplink.
4. **Embeddable**: a creator can add a chai button/widget to an existing site with one `<script>` tag (v1).
5. **Trustable**: 100% of code auditable; no data leaves the page unless the creator opts into analytics.

## 3. Non-Goals

- **Payment confirmation / receipts / donor lists** — P2P UPI has no callback API. Anything requiring confirmation needs a PSP (payment aggregator) and reintroduces commissions and KYC. Permanently out of scope; this constraint is *why* the product can be free.
- **Recurring memberships / subscriptions** — needs mandates (UPI Autopay) via a PSP. Out of scope.
- **Hosted multi-tenant SaaS** — the product is the anti-platform. We ship a template, not a service. A showcase/directory site may come later (P2) but never intermediates payments.
- **International payments** — UPI-only for v0/v1. PayPal.me / crypto links can be config-driven extra links later (P2).
- **Custom domain automation** — documented, not automated. Hosting providers already handle this.

## 4. Target Users

- **Primary:** Indian developers / OSS maintainers with a GitHub account (can fork, edit a file, deploy).
- **Secondary:** Non-dev creators (artists, writers, streamers) via the "Deploy to Vercel" one-click path and a well-written setup guide.
- **Tertiary (donors):** Anyone in India with a UPI app. Assume mobile-first, possibly low patience, possibly non-technical.

## 5. User Stories

**Creator**
- As a dev, I want to fork a template and edit one typed config file so that my page goes live without writing UI code.
- As a creator, I want to name my own chai tiers and price each one so donors get one-tap amount choices that sound like my shop, not a form.
- As a creator, I want a build-time check that fails on an invalid/missing VPA so I never publish a broken payment page.
- As a creator, I want a guided "send yourself ₹1" self-test in the setup docs so a VPA typo never silently redirects donations to a stranger.
- As a creator, I want optional analytics (page views, amount selections, pay clicks) so I can gauge interest — knowing completions can't be tracked.
- As a creator, I want to embed a chai button on my blog so donors don't need to find my page.

**Donor**
- As a donor on mobile, I want to tap an amount and tap "Pay directly" so I can pay in seconds where deeplinks work.
- As a donor on mobile where deeplinks fail, I want to copy the UPI ID (with amount shown) or screenshot the QR so I can still pay from within my UPI app.
- As a donor on desktop, I want a QR that updates live with my chosen amount and message so I scan once and pay.
- As a donor, I want to attach a short message (transaction note) so the creator knows who/why.

## 6. Requirements

### P0 — Must have (v0, the page)

| # | Requirement | Acceptance criteria |
|---|---|---|
| P0.1 | Config file (`chai.config.yaml`) drives the entire page | Zod-validated at build; build fails with a readable error on invalid VPA format, missing name, or non-positive base price |
| P0.2 | Creator profile section | Renders name, avatar, bio (markdown subset), social links, works/projects list from config |
| P0.3 | Chai amount selector | Up to 4 named preset chips (label + explicit ₹ amount, e.g. "Cutting chai" ₹20) + custom amount input; amount ≥ ₹1; ₹1,00,000 soft cap with warning copy |
| P0.4 | Donor message field | Optional; sanitized; max 60 chars (UPI `tn` limits); default note from config used when empty |
| P0.5 | Live UPI QR | Client-side QR of `upi://pay?...` regenerated on every amount/note change; downloadable as PNG |
| P0.6 | UPI deeplink button (mobile only) | Fires `upi://` intent; visible only on mobile UAs; labeled honestly ("works on most UPI apps") |
| P0.7 | Copy UPI ID fallback | One-tap copy of VPA with toast; always visible; shown prominently when deeplink likely fails |
| P0.8 | Static export | `npm run build` emits pure static assets; works on GitHub Pages subpath (`/buy-me-a-chai/`) and Vercel root |
| P0.9 | Deploy paths | GitHub Actions workflow for Pages (default); "Deploy to Vercel" button in README |
| P0.10 | Mobile-first responsive UI | Usable at 320px; QR-primary layout on desktop, button-primary on mobile |
| P0.11 | Analytics adapter (off by default) | Interface with events `page_view`, `amount_selected`, `pay_clicked{method}`; PostHog adapter; zero network calls when disabled |

### P1 — Should have (v1, the widget)

| # | Requirement | Acceptance criteria |
|---|---|---|
| P1.1 | Web Component `<chai-widget>` | Framework-agnostic; attributes for vpa/name/base; served via jsDelivr from GitHub releases + npm |
| P1.2 | Embed mode: redirect button | Styled "Buy me a chai ☕" button linking to the hosted page |
| P1.3 | Embed mode: inline quick-pay | Popover with amount chips + QR + copy, no redirect |
| P1.4 | Embed snippet generator | Page at `/embed` on the creator's own site that outputs copy-paste snippets pre-filled from their config |
| P1.5 | Theming | Light/dark + accent color via config and CSS custom properties |

### P2 — Future considerations

- i18n (Hinglish/Hindi strings), multiple VPAs (personal/business toggle), extra payment links (PayPal.me), Umami/Plausible adapters, showcase directory site, OG-image generation per config.

## 7. Success Metrics

- **Leading:** GitHub stars/forks; template-repo "Use this template" count; issues tagged `setup-problem` < 10% of setup attempts; time-to-live-page from docs test runs (< 15 min).
- **Lagging:** # of live deployed pages found via GitHub code search for the config signature; community PRs (themes, adapters); widget CDN hits on jsDelivr.
- No donation-volume metrics exist by design — we never see payments.

## 8. Key Product Constraints (read before designing anything)

1. **No payment confirmation.** UPI P2P has no webhook. All analytics are *intent*, never *completion*. Copy must never imply "payment received."
2. **Deeplinks are unreliable by design.** GPay/PhonePe throttle `upi://` intents to unverified VPAs from browsers (silent failures, "exceeds limit for this merchant", ignored amount fields). The deeplink is a *best-effort accelerator*; QR + copy-VPA are the guaranteed paths and must never be hidden behind it.
3. **VPA typos are catastrophic** (money goes to a stranger, unrecoverable). Build validation + mandatory documented ₹1 self-test.
4. **Tax footnote:** README must note that gifts from non-relatives > ₹50,000/FY are taxable income in India (Sec 56(2)(x)) and that high-volume inbound P2P on a personal VPA may draw bank scrutiny. Informational only, not advice.
5. **NPCI compliance posture:** we generate standard UPI intent URIs — same as printing a QR on paper. We are not a payment aggregator; no money ever touches the project.

## 9. Open Questions

- **[Engineering, non-blocking]** Exact per-app deeplink behavior matrix (GPay/PhonePe/Paytm/BHIM/CRED, Android/iOS) — build a `docs/COMPAT.md` from community testing; ship v0 with conservative copy.
- **[Design, non-blocking]** Should custom amount default to base price or empty? (v0: default = 1 chai, editable.)
- **[Product, blocking for P1.4 only]** Snippet generator lives on creator's site vs. project docs site — v0 decision deferred.

## 10. Phasing

- **v0 (page):** P0.1–P0.11. Ship when a fresh fork deploys to Pages and a real ₹1 payment succeeds via QR on GPay + PhonePe.
- **v1 (widget):** P1.1–P1.5.
- **v2:** P2 items by community demand.
