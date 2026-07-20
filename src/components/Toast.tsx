import type { JSX } from 'react';
import type { ToastMessage } from '../hooks/useToast.ts';

/**
 * The copy-confirmation toast (P0.7).
 *
 * Presentational: timing lives in `useToast`, this just renders the current
 * message. The `aria-live="polite"` region is always mounted and the pill is keyed
 * by `id`, so a repeated copy re-announces instead of going silent — a live region
 * speaks on content change, and the same text twice is no change.
 *
 * Fixed to the bottom of the viewport for v0; the v1 widget, which must not bleed
 * into a host page, will re-anchor it (DESIGN.md §v1).
 */
export interface ToastProps {
  readonly toast: ToastMessage | null;
}

export function Toast({ toast }: ToastProps): JSX.Element {
  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
    >
      {toast !== null && (
        <span
          key={toast.id}
          className="chai-toast-in max-w-[440px] rounded-full bg-chai-ink px-5 py-2.5 text-center text-[13px] font-medium text-chai-bg shadow-[0_8px_24px_rgb(43_29_20/0.28)]"
        >
          {toast.text}
        </span>
      )}
    </div>
  );
}
