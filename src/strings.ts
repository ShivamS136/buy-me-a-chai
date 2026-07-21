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
  amountGroupLabel: 'How many chai?',
  /**
   * A preset chip stacks its two halves, so they are two strings: the quantity
   * ("3 ☕") above the price ("₹150"). Both are `aria-hidden` — `presetChipLabel`
   * is what assistive tech reads, because "3 ☕" does not announce usefully.
   */
  presetChipCount: (chaiCount: number): string => `${chaiCount} ☕`,
  presetChipPrice: (formattedAmount: string): string => `₹${formattedAmount}`,
  /** Accessible name for a chip — the emoji does not read well in a screen reader. */
  presetChipLabel: (chaiCount: number, formattedAmount: string): string =>
    chaiCount === 1 ? `1 chai, ₹${formattedAmount}` : `${chaiCount} chai, ₹${formattedAmount}`,

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

  // ── Pay zone — device adaptive (P0.6, P0.7) ──────────────────────────────────

  /**
   * Mobile-primary action. Never promises success — the deeplink is a best-effort
   * accelerator, not a guaranteed path (ADR-006). The honest framing lives in the
   * hint below it, which is always shown.
   */
  payWithUpiApp: 'Pay with UPI app',
  payWithUpiAppHint: 'Opens your UPI app. If nothing happens, use the options below.',

  /**
   * Surfaced only after a tap that never took the page to the background — the
   * heuristic's best guess that the intent silently failed (P0.6). Points at the
   * copy path, which works everywhere, and blames the app, never the donor.
   */
  deeplinkFallbackCallout:
    "App didn't open? GPay and PhonePe sometimes block browser payments — Copy UPI ID works everywhere.",

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
   * Mobile `Show QR` accordion (P0.5): the screenshot-then-upload-QR path for
   * donors whose deeplink fails and who would rather scan than copy.
   */
  showQr: 'Show QR',
  hideQr: 'Hide QR',
  showQrHint: 'Open your UPI app, then scan or upload this QR.',

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
   * profile below it. Lowercase on purpose: it reads as a logotype, not a heading.
   */
  brandName: 'buy me a chai',
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
   * URLs and names live in `src/project.ts` (the one place a fork edits); these are
   * the labels, keyed off those constants so the maker's name flows through.
   */
  poweredBy: (projectName: string): string => `Powered by ${projectName}`,
  poweredByTagline: 'self-hosted · 0% commission',
  /**
   * Masthead CTA. It sells the template, not the source: a visitor who likes this
   * page can have their own in a click. It is also the link that drives clone
   * attribution, so it is referral-tagged like the rest (ADR-027).
   */
  createYourPage: 'Create your support page',
  /** Support-link label — the maker's name is the primary variable (`src/project.ts`). */
  supportMaker: (makerName: string): string => `Support ${makerName}`,
  /** Inbound referral chip, shown when the page is opened with `?ref=` / `?source=`. */
  referredVia: (source: string): string => `Referred via ${source}`,
  /** Always-disclosed (DESIGN.md §Copy): where the money actually goes. */
  footerDisclosure: "Payments go directly to the creator's UPI. No middleman, no fees.",
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
