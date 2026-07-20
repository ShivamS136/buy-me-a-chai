/**
 * The deeplink-failure heuristic (P0.6, ADR-006).
 *
 * We cannot detect whether a `upi://` intent actually opened an app — there is no
 * callback. The proxy: when the donor taps "Pay with UPI app", start a short timer
 * and watch for the page losing visibility. If a UPI app (or the app switcher)
 * takes over, the tab goes hidden / blurs; if nothing happens in the window, the
 * intent almost certainly did not resolve and we surface a gentle Copy-UPI-ID nudge.
 *
 * The asymmetry is deliberate (DESIGN.md §Deeplink failure handling): a false
 * positive costs only a soft, dismissible callout, while a false negative costs
 * nothing. So any hint of the app opening suppresses the callout, and the callout
 * never blames the donor.
 *
 * Failure is recorded *against the URI it was attempted for*, and `likelyFailed` is
 * derived by comparing that to the current URI — so changing the amount (a new URI)
 * clears the callout on its own, with no reset plumbing and no stale boolean.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export const DEEPLINK_TIMEOUT_MS = 1500;

export interface DeeplinkAttempt {
  /** The last attempt for the *current* URI elapsed without the page ever hiding. */
  readonly likelyFailed: boolean;
  /** Call on the deeplink tap — starts the visibility watch for the current URI. */
  readonly markAttempt: () => void;
}

export function useDeeplinkAttempt(
  uri: string | null,
  timeoutMs: number = DEEPLINK_TIMEOUT_MS,
): DeeplinkAttempt {
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanup = useRef<(() => void) | null>(null);

  const teardown = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (cleanup.current !== null) {
      cleanup.current();
      cleanup.current = null;
    }
  }, []);

  const markAttempt = useCallback(() => {
    teardown();
    // Optimistically clear: this tap is a fresh attempt, so hide any prior callout
    // for the duration of the watch. It reappears only if *this* attempt fails —
    // a retry that finally opens the app must not keep nagging.
    setFailedFor(null);
    const target = uri;

    let appOpened = false;
    const onHidden = (): void => {
      if (document.visibilityState === 'hidden') appOpened = true;
    };
    // `blur`/`pagehide` catch Android intent hand-offs that never flip
    // visibilityState; treating them as "opened" only ever suppresses the callout.
    const onLeave = (): void => {
      appOpened = true;
    };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', onLeave);
    window.addEventListener('blur', onLeave);
    cleanup.current = () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', onLeave);
      window.removeEventListener('blur', onLeave);
    };

    timer.current = setTimeout(() => {
      if (!appOpened && document.visibilityState !== 'hidden') {
        setFailedFor(target);
      }
      teardown();
    }, timeoutMs);
  }, [teardown, timeoutMs, uri]);

  // Never leave a timer or listener running after the card unmounts.
  useEffect(() => teardown, [teardown]);

  return { likelyFailed: failedFor !== null && failedFor === uri, markAttempt };
}
