/**
 * Every user-visible string on the page.
 *
 * Centralised to prepare for i18n (Hinglish first, v2) — but we are NOT building
 * i18n yet. Add keys here; do not add a translation layer.
 *
 * Copy rules that outrank style (PRD §8, ADR-006):
 *  - Never imply a payment completed. We have no confirmation channel and never
 *    will. "Payment happens in your UPI app" is the strongest claim available.
 *  - Never promise the deeplink works. It is a best-effort accelerator; QR and
 *    copy-VPA are the guaranteed paths.
 *
 * Two documented exceptions live outside this file (ADR-015):
 *  - `src/lib/upi.ts` and `src/config/*` are framework-free so they can be
 *    extracted to `packages/core` for the v1 widget. They emit stable error codes
 *    plus developer-facing English; UI copy is keyed off the code here.
 *  - `meta.title`'s `Buy {name} a chai` default is derived in the config schema,
 *    because it is needed before React mounts.
 *
 * Entries are values or plain functions — never templates resolved at call sites,
 * so a future i18n layer has one interception point per string.
 */

import type { UpiErrorCode } from './lib/upi.ts';

export const strings = {
  /** Fallback document title; the real one is derived from config `meta.title`. */
  documentTitle: 'Buy me a chai',
  /** Shown inside <noscript> — the page needs JS to build the QR client-side. */
  noscript:
    'This page needs JavaScript to generate the UPI QR code. You can still pay by copying the UPI ID shown above into any UPI app.',

  // ── Payment card ───────────────────────────────────────────────────────────

  paymentCardTitle: 'Buy me a chai',
  /**
   * PRD §8 and DESIGN.md both require this disclosure to be present, not buried:
   * it is the product's entire thesis and the reason the page can be free.
   */
  disclosure: '0% commission · straight to UPI',
  amountGroupLabel: 'Pick a chai',
  /**
   * A preset chip stacks two halves: the creator's tier name ("Cutting chai",
   * straight from `chai.presets[].label` — config, so not a string in this file)
   * above the price ("₹20"). Both are `aria-hidden`; `presetChipLabel` is what
   * assistive tech reads, because the two visual lines announce as one run-on.
   */
  presetChipPrice: (formattedAmount: string): string => `₹${formattedAmount}`,
  /** Accessible name for a chip — the creator's label, then what it costs. */
  presetChipLabel: (label: string, formattedAmount: string): string =>
    `${label}, ₹${formattedAmount}`,

  customAmountLabel: 'Or enter your own amount',
  customAmountPlaceholder: 'Amount in ₹',
  /** P0.3: we warn above the soft cap, we never block. */
  largeAmountWarning: 'Large amount — double-check before paying.',

  messageLabel: 'Message (optional)',
  messageHint: 'Goes into the payment note your UPI app shows.',
  messageCounter: (used: number, max: number): string => `${used}/${max}`,
  /** Some apps silently strip non-ASCII from `tn`; warn, never block. */
  messageEmojiWarning: 'Some UPI apps drop emojis from the payment note.',

  // ── QR ─────────────────────────────────────────────────────────────────────

  qrCaption: 'Scan with any UPI app — GPay, PhonePe, Paytm, BHIM.',
  /** DESIGN.md requires the VPA and amount as the QR's text alternative. */
  qrAlt: (vpa: string, formattedAmount: string): string =>
    `UPI QR code for ${vpa}, amount ₹${formattedAmount}`,
  qrDownload: 'Save QR',
  qrDownloadFilename: (vpa: string, rupees: number): string =>
    `chai-${vpa.replace(/[^a-zA-Z0-9]+/g, '-')}-${rupees}.png`,
  qrUnavailable: 'QR unavailable for this message — shorten it, or copy the UPI ID instead.',

  /** The VPA stays visible next to every payment action so donors can verify it. */
  payingTo: (formattedAmount: string, vpa: string): string =>
    `Paying ₹${formattedAmount} to ${vpa}`,

  // ── Pay zone (P0.5, P0.6, P0.7) ──────────────────────────────────────────────

  /**
   * The experimental deeplink label (ADR-046). UPI apps block most in-browser
   * payments to a personal VPA, so it opens in only a few apps — a demoted,
   * clearly-caveated affordance, never a primary call. Never promises success.
   */
  payDirectly: 'Pay directly',
  /** The tag beside it, so the label reads as a demoted, best-effort path. */
  experimentalTag: 'experimental',
  /**
   * The always-visible caveat under the deeplink — the honest-UX mechanism now
   * (ADR-046, replacing the old visibility-change failure heuristic). Blames the
   * platform, never the donor, and points at the two paths that always work, which
   * sit right above it.
   */
  payDirectlyWarning:
    'UPI apps block most in-browser payments to a personal UPI ID, so this opens in only a few apps. Scan the QR or copy the ID above instead.',

  /** Copy the VPA (P0.7). The universal fallback: always visible, works everywhere. */
  copyUpiId: 'Copy UPI ID',
  /**
   * Copy confirmation. A copied UPI ID carries no amount, so the toast reminds the
   * donor what to enter. Never phrased as a completed payment (PRD §8).
   */
  copyConfirmation: (formattedAmount: string): string =>
    `UPI ID copied · amount ₹${formattedAmount} — paste in any UPI app.`,
  /** Both clipboard paths failed; the VPA is still on screen to select manually. */
  copyFailed: "Couldn't copy automatically — the UPI ID is shown above; select and copy it.",

  /**
   * The honest-UX centrepiece (DESIGN.md §After-tap): the limitation *is* the
   * pitch. Never replace this with anything that reads as confirmation.
   */
  noConfirmationNote:
    "Complete the payment in your UPI app. This page can't confirm payments — that's why it's commission-free 🙂",

  amountPrompt: 'Pick an amount to get your QR code.',

  // ── Page frame — masthead, profile, works, footer (P0.2) ─────────────────────

  /**
   * The project wordmark in the masthead (ADR-026). This is locked branding — the
   * core identity every fork carries — as opposed to the creator's own name in the
   * profile below it. Set as a wordmark, not a sentence — it reads as the project's
   * logotype rather than a heading.
   */
  brandName: 'Buy Me A Chai',
  /** Skip link target: the payment card is the page's one job (DESIGN.md §1). */
  skipToPayment: 'Skip to payment',
  /** Label for the social-links row; the links themselves carry the brand names. */
  socialsLabel: 'Find me on',
  /**
   * Accessible name for any link that opens a new tab — the visual label plus the
   * new-tab cue screen readers otherwise miss. Used by socials, works and footer.
   */
  externalLink: (label: string): string => `${label} (opens in a new tab)`,
  /** Heading for the works/projects section (P0.2). Hidden entirely when empty. */
  worksHeading: 'Things I make',

  /**
   * The project's template links, shown in the masthead and footer (ADR-026,
   * ADR-027). Both are deletable from source by any fork — the code is public. The
   * URLs and names live in the `branding` block of `chai.config.yaml` (ADR-032);
   * these are the labels, taking the maker/project name so it flows through.
   */
  poweredBy: (projectName: string): string => `Powered by ${projectName}`,
  poweredByTagline: 'self-hosted · 0% commission',
  /**
   * Masthead CTA. It sells the template, not the source: a visitor who likes this
   * page can have their own in a click. It is also the link that drives clone
   * attribution, so it is referral-tagged like the rest (ADR-027).
   */
  createYourPage: 'Create your support page',
  /** Support-link label — the maker's name comes from `branding.maker` in the config. */
  supportMaker: (makerName: string): string => `Support ${makerName}`,
  /** Inbound referral chip, shown when the page is opened with `?ref=` / `?source=`. */
  referredVia: (source: string): string => `Referred via ${source}`,
  /** Always-disclosed (DESIGN.md §Copy): where the money actually goes. */
  footerDisclosure: "Payments go directly to the creator's UPI. No middleman, no fees.",

  // ── Demo banner (ADR-034) ────────────────────────────────────────────────────

  /**
   * Shown only on the canonical public demo, which publishes the *example* config
   * past the placeholder guard (ADR-013). It states plainly that the page is an
   * example and its UPI ID is not a real payment target — ADR-008's payment-honesty
   * rule applied to the demo. Rendered behind the build-time `__CHAI_DEMO__` gate, so
   * it never reaches a real creator's page.
   */
  demoBanner: "Live demo · example page — don't send money.",
  /** CTA in the demo banner: a visitor can spin up their own from the template. */
  demoBannerCta: 'Make your own ↗',
} as const;

/**
 * UI copy for `lib/upi.ts` error codes (ADR-015). The library emits stable codes
 * plus developer-facing English; donors see these.
 *
 * `VPA_*` and `NAME_*` are creator misconfiguration, not donor mistakes — but the
 * build gate (P0.1) means a deployed page cannot reach them, so the copy stays
 * calm and points at the page owner rather than blaming the donor.
 */
export const upiErrorStrings: Record<UpiErrorCode, string> = {
  VPA_REQUIRED: 'This page has no UPI ID set — the page owner needs to fix it.',
  VPA_INVALID_FORMAT: "This page's UPI ID looks invalid — the page owner needs to fix it.",
  NAME_REQUIRED: 'This page has no creator name set — the page owner needs to fix it.',
  AMOUNT_NOT_FINITE: 'Enter an amount in rupees.',
  AMOUNT_NOT_INTEGER: 'Whole rupees only — UPI apps round paise on P2P payments.',
  AMOUNT_BELOW_MIN: 'Enter at least ₹1.',
  AMOUNT_ABOVE_HARD_MAX: "That's above the ₹1,00,00,000 limit this page can build a QR for.",
};

export type StringKey = keyof typeof strings;
