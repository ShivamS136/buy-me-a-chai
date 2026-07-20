/**
 * Reactive binding for the device heuristic (P0.10).
 *
 * `useSyncExternalStore` over the raw `matchMedia` change feed, so the pay-zone
 * layout follows a live change in the primary pointer — a mouse plugged into a
 * tablet, or a devtools device-emulation toggle — without a manual listener.
 *
 * The server snapshot is `false` (desktop): there is no SSR here, but the fallback
 * keeps the hook total for any non-DOM render path.
 */

import { useSyncExternalStore } from 'react';
import { isMobileDevice, subscribeMobile } from '../lib/device.ts';

export const useIsMobile = (): boolean =>
  useSyncExternalStore(subscribeMobile, isMobileDevice, () => false);
