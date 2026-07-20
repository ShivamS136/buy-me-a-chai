/**
 * Device-class heuristic that decides the pay-zone layout (P0.6, P0.10).
 *
 * One signal, deliberately: `isMobileDevice()` answers "does the device showing
 * this page also pay from it?" — which is the real distinction the pay zone turns
 * on. On such a device the QR is near-useless (a phone cannot scan its own screen)
 * so buttons lead; on a desktop the QR leads and the phone scans it. The deeplink
 * is shown on exactly the same devices, because `upi://` only resolves where a UPI
 * app is installed — Android and iOS — which is the same population (ADR-019). So
 * there is no separate `canDeeplink()`; it would be an alias.
 *
 * DOM-touching, so it lives in `src/lib` beside `download.ts` rather than in the
 * framework-free core — `upi.ts`/`qr.ts` stay pure for the v1 widget (ADR-004).
 */

/**
 * The primary pointer is coarse (touch), not fine (mouse/trackpad). This reflects
 * the *primary* input, so a touch laptop with a trackpad reads as fine → desktop,
 * while a phone or tablet reads as coarse → mobile. That is exactly the QR-can't-
 * self-scan population we care about.
 */
export const COARSE_POINTER_QUERY = '(pointer: coarse)';

/** Last-resort signal for engines without `matchMedia` or client hints. */
const MOBILE_UA_RE = /Android|iPhone|iPad|iPod|IEMobile|BlackBerry|Opera Mini|Mobile/i;

interface UserAgentDataLike {
  readonly mobile?: boolean;
}

const userAgentData = (): UserAgentDataLike | undefined =>
  (navigator as Navigator & { userAgentData?: UserAgentDataLike }).userAgentData;

/**
 * True on phones and tablets. The order is a confidence ladder: Chromium's client
 * hint when it positively says "mobile", then the primary-pointer media query
 * (which also catches tablets the client hint reports as non-mobile), then a UA
 * sniff only where neither exists.
 *
 * Never early-returns `false` on the client hint: `userAgentData.mobile` is `false`
 * on tablets, which we still treat as mobile, so a `false` there must fall through
 * to the pointer query rather than settle the answer.
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  if (userAgentData()?.mobile === true) return true;

  if (typeof window.matchMedia === 'function' && window.matchMedia(COARSE_POINTER_QUERY).matches) {
    return true;
  }

  return MOBILE_UA_RE.test(navigator.userAgent);
};

/**
 * Subscribes to primary-pointer changes so the layout follows a device that gains
 * or loses a mouse (plugging one in, or a devtools device-emulation toggle). The
 * store snapshot is `isMobileDevice`; this is only the change feed for
 * `useSyncExternalStore`.
 */
export const subscribeMobile = (onChange: () => void): (() => void) => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const query = window.matchMedia(COARSE_POINTER_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
