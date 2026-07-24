/**
 * The analytics event contract (P0.11) — the source of truth docs/ANALYTICS.md
 * points at. Three events, fixed properties, nothing else, ever.
 *
 * Framework-free by contract (ADR-004): types only, no imports, no DOM.
 *
 * The union is deliberate rather than a loose `track(name, props)`: it makes an
 * out-of-contract event or a stray property a *typecheck* failure, so a
 * contribution that widens the contract has to widen this file — and therefore the
 * ANALYTICS.md table sitting next to it — in the same commit.
 *
 * Never add: donor message content, the creator's VPA, or any donor identifier.
 * Every number here measures *intent*, not income: UPI P2P has no confirmation
 * callback, so `pay_clicked` means a donor started a payment and nothing more
 * (ADR-001, ADR-007).
 */

/**
 * How a donor acted on the payment. Every value is a real click: a `deeplink` tap,
 * a `copy_vpa` tap, or a `qr_download` tap. There is no `qr_view` — the QR is always
 * on screen once an amount is payable (ADR-046), so a "view" is just `page_view`
 * under another name and would make the funnel meaningless (ADR-047, ANALYTICS.md).
 */
export const PAY_METHODS = ['deeplink', 'copy_vpa', 'qr_download'] as const;
export type PayMethod = (typeof PAY_METHODS)[number];

export type ChaiEvent =
  /**
   * `source` is the sanitised inbound `?ref=`/`?source=` host from
   * `src/lib/referral.ts` — present only when this visit came from another
   * deployment of the template, absent otherwise (ADR-027). It is a hostname, the
   * same class of data PostHog already records as `$referrer`, and it is what makes
   * clone-driven traffic countable without a backend. Standard `utm_*` parameters
   * need no help from us: posthog-js reads them off the URL itself.
   */
  | { readonly name: 'page_view'; readonly source?: string }
  | { readonly name: 'amount_selected'; readonly amount: number; readonly preset: boolean }
  | { readonly name: 'pay_clicked'; readonly method: PayMethod; readonly amount: number };

export type ChaiEventName = ChaiEvent['name'];

/**
 * Every event name the page may emit. Used by the PostHog adapter's `before_send`
 * to drop anything the SDK generates on its own, and by the contract test that
 * scans call sites.
 */
export const CHAI_EVENT_NAMES = ['page_view', 'amount_selected', 'pay_clicked'] as const;

export const isChaiEventName = (name: string): name is ChaiEventName =>
  (CHAI_EVENT_NAMES as readonly string[]).includes(name);

/**
 * The one thing an adapter must do. Synchronous and returning `void` on purpose:
 * no call site should ever be able to await, retry, or branch on delivery — that
 * would make analytics a dependency of the payment path.
 */
export interface AnalyticsAdapter {
  readonly track: (event: ChaiEvent) => void;
}

/** What a loaded provider does with an event. */
export type EventSink = (event: ChaiEvent) => void;
