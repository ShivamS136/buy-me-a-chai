# DESIGN.md — buy-me-a-chai

UI/UX specification for the v0 page (and forward pointers for the v1 widget). The page must feel warm, personal, and trustworthy — a chai stall, not a checkout counter.

## Design principles

1. **One job:** get a donor from landing to a payable UPI intent in ≤ 2 taps (amount → pay). Everything else (bio, works) supports trust, never blocks the flow.
2. **Honest UX:** never fake certainty. No success screens, no "payment received", no spinners pretending to wait for confirmation. The page's job ends when the UPI app opens or the QR is scanned.
3. **The guaranteed paths lead:** the QR and Copy UPI ID always work and are always visible, on every device (ADR-046). The `upi://` deeplink is a best-effort extra — UPI apps block most in-browser payments to a personal VPA — so it is present on mobile but deliberately de-emphasized and marked experimental, never the primary call. All three stay visible on mobile (hard rule 3).
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
│ ─ title · description      │ [Copy UPI ID][Save] │    view
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

### Pay zone — one layout, every device (ADR-046)
The QR leads as the hero on every device, always visible once an amount is payable — a phone donor screenshots it or scans on a second device; a desktop donor scans it directly. Beneath it:
- **QR** at ~240px, black-on-white in both themes. Caption: "Scan with any UPI app — GPay, PhonePe, Paytm, BHIM."
- **`Copy UPI ID` and `Save QR`** — equal-weight peers in one row, Copy then Save. These are the two guaranteed paths (ADR-006). Copy toast: "UPI ID copied · amount ₹150 — paste in any UPI app". `Save QR` drops out when the QR is over capacity; Copy never depends on it.
- **`Pay directly` (mobile only, experimental):** the quietest thing in the zone — a low-emphasis text link, tagged "experimental", that fires the `upi://` intent. A `upi://` link is a no-op on desktop, so it is mobile-only. It stays visible (hard rule 3) but never leads.
- **Honest-UX mechanism:** we cannot detect whether the deeplink opened an app, so instead of guessing we state the caveat up front. An always-visible line under `Pay directly` reads: "UPI apps block most in-browser payments to a personal UPI ID, so this opens in only a few apps. Scan the QR or copy the ID above instead." It blames the platform, never the donor, and points at the paths that always work — sitting right above it. This supersedes the old 1.5s visibility-change failure heuristic (ADR-046), which guessed at a failure we can simply name.

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

## The social card (`public/og.png`)

The picture that appears when a page is shared — WhatsApp above all, then X, LinkedIn, Slack. One file serves every clone, so it carries no name, no accent colour and no amounts: **everything personal is text**, baked per-creator into the served HTML by `chaiHead()` (`og:title`, `og:site_name`, `og:description`). Making the picture per-creator would need a build step that renders images, which this project does not have and does not want.

**The wordmark is the message.** The display line is the product name itself — *Buy Me A Chai*, capitalised exactly as `strings.brandName` capitalises it in the masthead, so the card and the page a visitor lands on carry the same wordmark — because next to og:title ("Buy {name} a chai") the brand name literally is the ask. The eyebrow says out loud what the page is for, in the creator's voice, since the creator is the one sharing the link: `SUPPORT MY WORK · STRAIGHT TO UPI`. The subline is the product's honest pitch demoted to a proof point: `Every rupee arrives whole — 0% commission.` "Chai" is set in the accent, the two-colour wordmark of hand-painted tapri signage.

Beside the words sits a drawn cutting-chai glass — bold ink outline, sticker-flat, milky-caramel brew, so it survives 340px. The facet band on its lower half is what makes it a cutting glass and not a generic cup; the ridges taper with the glass and are spaced by *angle* around the cylinder so they crowd toward the edges like a real pressed tumbler. The tea surface is ringed in the accent — the meniscus, the one brand gesture carried over from the first card. The steam is a single continuous line that ties itself into a heart: gratitude rising. (A ₹ in the steam was considered and rejected — rupees evaporating is the exact opposite of "every rupee arrives whole".)

Constraints any redesign must keep:

| Constraint | Why |
|---|---|
| Exactly 1200×630, PNG, no alpha | The one size that clears Facebook (≥1200×630), LinkedIn (≥1200×627), X and WhatsApp at once. Previews composite against light or dark chat bubbles, so transparency renders unpredictably. No crawler accepts SVG |
| Under ~300 KB | WhatsApp's 600 KB cap is the tightest by an order of magnitude |
| Bottom ~20% free of text | X crops to 2:1 and overlays the post headline across the lower edge |
| Legible at 340px wide | WhatsApp's render width. Anything under ~40px type at full size is texture, not copy — put nothing load-bearing there |
| No creator name, no amounts, no accent | One file, every clone. `chai.presets` are creator-configurable, so a price on the card would advertise a tier the page may not offer |
| No QR, no receipt, no confirmation | Hard rule 2 — and a QR-shaped mark on a payment card invites scanning something that is not a payment |

A creator replaces `public/og.png` with their own 1200×630 file; no config edit, and `update-template.yml` restores `public/` verbatim so it survives template pulls. Source and regeneration steps: `scripts/og-card.html`.

## v1 widget notes (forward-looking, don't build in v0)
- The payment card section above becomes `<chai-widget>` — that's why it's a self-contained 480px card with its own tokens.
- Redirect-button embed inherits accent color; inline embed opens the card in a popover anchored to the button.
