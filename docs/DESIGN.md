# DESIGN.md — buy-me-a-chai

UI/UX specification for the v0 page (and forward pointers for the v1 widget). The page must feel warm, personal, and trustworthy — a chai stall, not a checkout counter.

## Design principles

1. **One job:** get a donor from landing to a payable UPI intent in ≤ 2 taps (amount → pay). Everything else (bio, works) supports trust, never blocks the flow.
2. **Honest UX:** never fake certainty. No success screens, no "payment received", no spinners pretending to wait for confirmation. The page's job ends when the UPI app opens or the QR is scanned.
3. **Fallbacks are first-class:** QR, Copy UPI ID, and deeplink are peers. Whichever is most likely to work on the current device is visually primary; the others remain one glance away.
4. **Creator's page, not ours:** project branding is a locked masthead wordmark plus a "Create your support page" CTA into GitHub's use-this-template flow, and two tiny footer links — "Powered by buy-me-a-chai" (the repo) and "Support {maker}" (the maintainer's support page). Their values live in the `branding` block of `chai.config.yaml` (defaults = the maker's, ADR-032); a fork overrides them there to rebrand, or deletes the links from source to remove them (no toggle — the code is public). The links are referral-tagged so clone-driven traffic is traceable to the source project, and an inbound `?ref=`/`?source=` shows a small "Referred via …" chip (ADR-026, ADR-027). They are the only ask of a free project; keep them tiny.

## Visual language

- **Tone:** a warm terracotta accent on a clean off-white canvas. The core palette is brand-locked — identical on every fork — and only the accent is creator-overridable, via config `theme.accent` (ADR-025). Default theme tokens (CSS custom properties):
  - `--chai-bg` #FAF8F4 (warm off-white) · `--chai-surface` #FFFFFF · `--chai-ink` #2B1D14 (dark brew)
  - `--chai-accent` #C4622D (masala chai terracotta) · `--chai-accent-ink` #FFFFFF
  - `--chai-accent-strong` #A34E22 — **the only accent you may put white text on.** The brand accent is 4.09:1 against white: fine for fills, borders, icons and large text (≥24px, where 3:1 applies), but it fails AA for normal-size text placed on top of it. See ADR-018.
  - Dark mode: bg #1A130E, surface #241B14, ink #F3E9DF, accent lifted to #E08A4F (6.4:1) so it still reads as terracotta on a dark brew.
  - `theme.mode` (`light`/`dark`/`auto`) pins the palette: forced modes stamp `data-theme` on `<html>` (baked in at build for no flash), `auto` follows the OS via `prefers-color-scheme`. A custom `theme.accent` is the *only* palette knob — it recolours the CTA, borders, focus rings and accent text, never the canvas — and is derived into contrast-safe `-strong`/`-soft`/`-ink` companions per surface (darkened so white text on the "Pay" button clears AA, lifted for the dark surface), so any accent stays legible in both themes (ADR-021, ADR-025).
  - The QR is always black on white, in both themes. Inverting it is the most common way to make a QR unscannable.
- **Type:** system stack + optional display font for the name ("Inter" self-hosted; no external font CDN calls — privacy rule). Base 16px, generous line-height. With no webfont in v0, the type personality comes from scale and tracking: a tiny letter-spaced eyebrow (11px / 0.16em) against a very large, tightly-tracked amount numeral (52px / -0.03em). Amounts are `tabular-nums` so a live-updating figure holds its column instead of reflowing on every keystroke. The VPA is set in `--font-vpa` (monospace) for a functional reason — it is an identifier donors verify character by character, and fixed-width glyphs are what make a transposed character visible.
- **The tear:** the payment card is split by a perforated line with punched notches, above which is what the donor chooses and below which is what they carry to their UPI app. It borrows the chai-stall ticket stub deliberately — the page is a tapri, not a checkout counter. The card leans into that ticket identity: a deep warm lift-shadow, and the resolved VPA set in a monospace "receipt field" pill below the amount. On desktop it is the pinned right column — a live ticket that stays in view as the profile and projects scroll past (ADR-024).
- **Clean canvas:** the background is a flat off-white — no gradient, no glow. An accent-tinted canvas would fight a creator's custom accent, so warmth is carried by the accent, the dark-brew ink and the ☕ marks instead, and the page's signature is structural (the pinned ticket, the tear), not atmospheric (ADR-025).
- **Iconography:** Lucide for UI glyphs (chevron, copy, download, smartphone, globe). Social **brand marks** come from `simple-icons` instead — Lucide dropped its brand icons in v1 — inlined as CC0 path data, never a CDN (ADR-023); an unmapped domain falls back to the Lucide globe, still labelled. The chai cup ☕ emoji is allowed in strings; keep it out of buttons that fire payments (clarity > cuteness).
- **Motion:** micro only — QR crossfade on regenerate (150ms), copy-toast slide, and a single staggered fade-up of the sections on first load (header → trust → card → footer). All of it is disabled under `prefers-reduced-motion`. Still no confetti and nothing that implies a confirmed payment (see honest UX) — the entrance is a warm greeting, not a success animation.

## Page anatomy (single route `/`)

A locked masthead and the footer frame the page full-width. Between them, one grid changes shape by viewport (ADR-024).

**Desktop (≥1024px)** — two columns; the payment ticket is pinned and always visible:

```
┌─────────────────────────────────────────────────┐
│ ☕ buy me a chai                       (masthead) │
├────────────────────────────┬────────────────────┤
│ [avatar] Name              │  BUY ME A CHAI      │
│          tagline · socials │  [1☕][3☕][5☕]       │
│ Bio (markdown subset)      │  [ custom ₹ ____ ]  │
│                            │  [ message ______ ] │  ← sticky:
│ Projects                   │  ──── tear ────     │    the ticket
│ ─ title · description      │  QR (large, live)   │    stays in
│ ─ title · description      │  [ Copy UPI ID ]    │    view
├────────────────────────────┴────────────────────┤
│ powered-by · support the maker         (footer)  │
└─────────────────────────────────────────────────┘
```

**Mobile** — one column, in this order: masthead → profile + socials → payment (QR path) → projects → footer.

Projects are a vertical stack of full-width cards: the **title** is the link, the description runs to 300 characters with line breaks preserved, and an image becomes a 56px thumbnail (ADR-036). The list is free to grow because it comes *after* the payment card on mobile and sits *beside* the sticky ticket on desktop — a long list scrolls past the CTA rather than burying it.

The masthead, grid and footer share a `max-w-[480px] lg:max-w-[1040px]` shell so their edges line up. The masthead's right side carries a single "Create your support page" CTA into the use-this-template flow — the page's own quiet growth loop; the footer carries both the repo credit and the maker's support link. Below `lg` that CTA collapses to its bare glyph, since the phrase cannot share a narrow row with the wordmark. The payment card keeps its own ≤480px max-width, so it stays a clean lift-out for the v1 widget. When the page is opened with an inbound `?ref=`/`?source=`, a small "Referred via …" chip sits above the grid (ADR-027).

## Core flow & states

### Amount selection
- Default selected: the cheapest tier. Each chip stacks an optional `emoji` over the creator's label (`chai.presets[].label`, e.g. "Cutting chai") over `₹amount`. The label takes the vertical slack so the prices align across chips however the names wrap; the emoji is `aria-hidden` and the accessible name is label + price, "Cutting chai, ₹20" (ADR-035).
- Custom input: numeric, ₹ prefix, min 1, integers only (UPI supports paise but donors think in rupees). > ₹1,00,000 shows inline caution: "Large amount — double-check before paying." (Banks apply per-txn UPI limits; we don't block, we warn.)
- Changing amount regenerates QR + deeplink instantly. Show the resolved amount inside the pay zone header: "Paying ₹150 to `shivam@okaxis`". The VPA is always visible near payment actions — donors verify, trust increases.

### Message
- One line, 60-char counter, placeholder from config `defaultNote`. Empty ⇒ default note used. Strip newlines; warn (don't block) on emoji ("some UPI apps drop emojis").

### Pay zone — device adaptive
- **Desktop (no touch / wide):** QR primary at ~240px with download button ("Save QR"). Below: `Copy UPI ID` secondary. Caption: "Scan with any UPI app — GPay, PhonePe, Paytm, BHIM."
- **Mobile:** buttons primary:
  1. `Pay with UPI app` → fires `upi://` intent. Sub-caption: "Opens your UPI app. If nothing happens, use the options below." After tap, swap caption to the fallback nudge (see below).
  2. `Copy UPI ID` → copies VPA, toast: "UPI ID copied · amount ₹150 — paste in any UPI app".
  3. `Show QR` accordion → for screenshot-then-upload-QR flow ("Open your UPI app → scan/upload this QR").
- **Deeplink failure handling (critical):** we cannot detect failure. Heuristic: on `Pay with UPI app` tap, start a 1.5s visibility-change check — if the page never lost visibility, surface a gentle callout: "App didn't open? GPay/PhonePe sometimes block browser payments — Copy UPI ID works everywhere." This is the honest-UX centerpiece; get the copy right, no blame on the donor.

### After-tap state (all methods)
- No success state. Show a calm note: "Complete the payment in your UPI app. This page can't confirm payments — that's why it's commission-free 🙂" — turning the limitation into the brand promise.

## Empty/edge states
- Config missing avatar → initials disc in accent color.
- No works → hide section entirely (no empty placeholders).
- JS disabled → server-rendered? No (static SPA). The `<noscript>` shows the creator's real VPA in plain text plus copy instructions — baked into `index.html` at build time by the `chai-noscript` plugin (ADR-020), since the config VPA is not otherwise in the served HTML. A build-time **static QR** is still a nice-to-have, not built.
- Invalid clipboard API (old browsers) → fallback to a select-all readonly input.

## Accessibility
- All pay actions are real `<button>`/`<a>`; chip group is a radiogroup with arrow-key support.
- QR `img` alt: "UPI QR code for {vpa}, amount ₹{amount}".
- Toasts are `aria-live="polite"`. Contrast AA on all theme tokens (verify dark mode accent).
- Hit targets ≥ 44px on mobile.

## Copy guidelines (strings.ts)
- Voice: friendly Indian-English, light Hinglish allowed in defaults ("Chai pe charcha?" as sample tagline in the example config), zero corporate-speak.
- Never: "donation processed", "transaction successful", "secure payment gateway" (we are not a gateway).
- Always disclose: "Payments go directly to the creator's UPI. No middleman, no fees."

## v1 widget notes (forward-looking, don't build in v0)
- The payment card section above becomes `<chai-widget>` — that's why it's a self-contained 480px card with its own tokens.
- Redirect-button embed inherits accent color; inline embed opens the card in a popover anchored to the button.
