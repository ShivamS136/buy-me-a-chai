/**
 * A single ephemeral toast (P0.7 copy confirmation).
 *
 * Deliberately not a queue: the page fires one toast, on copy, and a second copy
 * should replace the first, not stack. Each `show` bumps a monotonic `id` so an
 * identical message still re-announces — a live region only speaks when its
 * content node changes, and "copied" twice is the same text.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/** Long enough to read a short line, short enough not to linger. */
export const TOAST_DURATION_MS = 4000;

export interface ToastMessage {
  readonly text: string;
  /** Re-mount key: forces a fresh announcement even for a repeated message. */
  readonly id: number;
}

export interface ToastController {
  readonly toast: ToastMessage | null;
  readonly showToast: (text: string) => void;
}

export function useToast(durationMs: number = TOAST_DURATION_MS): ToastController {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const idRef = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const showToast = useCallback(
    (text: string) => {
      clearTimer();
      idRef.current += 1;
      setToast({ text, id: idRef.current });
      timer.current = setTimeout(() => {
        setToast(null);
        timer.current = null;
      }, durationMs);
    },
    [clearTimer, durationMs],
  );

  // Never leave a timer running after the card unmounts.
  useEffect(() => clearTimer, [clearTimer]);

  return { toast, showToast };
}
