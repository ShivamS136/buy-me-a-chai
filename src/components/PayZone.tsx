import { Copy, Download, Smartphone } from 'lucide-react';
import type { JSX } from 'react';
import { useCallback, useId } from 'react';
import { track } from '../analytics/index.ts';
import { useIsMobile } from '../hooks/useIsMobile.ts';
import { useToast } from '../hooks/useToast.ts';
import type { UpiQr } from '../hooks/useUpiIntent.ts';
import { formatRupees } from '../lib/amount.ts';
import { copyText } from '../lib/clipboard.ts';
import { downloadDataUrl } from '../lib/download.ts';
import type { UpiError, UpiIntent } from '../lib/upi.ts';
import { strings, upiErrorStrings } from '../strings.ts';
import { QrCode } from './QrCode.tsx';
import { Toast } from './Toast.tsx';

/**
 * The pay zone (P0.5, P0.6, P0.7) — everything below the tear.
 *
 * One layout on every device (ADR-046): the QR leads as the hero, always visible,
 * with Copy UPI ID and Save QR as equal-weight peers in a single row beneath it.
 * These are the two guaranteed paths (ADR-006) and they carry the same weight on a
 * phone as on a desktop — a phone donor screenshots or copies; a desktop donor scans
 * with a second device.
 *
 * The `upi://` deeplink is demoted to an experimental, mobile-only affordance kept
 * deliberately quiet: UPI apps block most in-browser payments to a personal VPA
 * (ADR-005/006), so it works in only a few apps. Its low visual weight and its
 * always-visible caveat are the honest-UX mechanism now — it replaces the old 1.5s
 * failure heuristic, which guessed at a failure we can simply state up front. It
 * stays a peer that is always present (hard rule 3), never the primary call.
 *
 * `useUpiIntent` already degrades `qr` to `null` past QR capacity without touching
 * the intent, so Copy UPI ID and the deeplink never depend on the QR.
 */
export interface PayZoneProps {
  readonly intent: UpiIntent | null;
  readonly errors: readonly UpiError[];
  readonly qr: UpiQr | null;
}

export function PayZone({ intent, errors, qr }: PayZoneProps): JSX.Element {
  const isMobile = useIsMobile();
  const { toast, showToast } = useToast();
  const warningId = useId();

  // Read from the URI's own `am`, so the number on screen is the number encoded.
  const payableRupees = intent === null ? null : Number.parseInt(intent.amount, 10);

  const handleCopy = useCallback((): void => {
    if (intent === null || payableRupees === null) return;
    track({ name: 'pay_clicked', method: 'copy_vpa', amount: payableRupees });
    void copyText(intent.vpa).then((ok) => {
      showToast(ok ? strings.copyConfirmation(formatRupees(payableRupees)) : strings.copyFailed);
    });
  }, [intent, payableRupees, showToast]);

  // Encode the PNG only inside the handler — never in render — so a keystroke that
  // regenerates the QR does not rebuild ~14 KB of base64 the donor never asked for.
  const handleSaveQr = useCallback((): void => {
    if (intent === null || payableRupees === null || qr === null) return;
    track({ name: 'pay_clicked', method: 'qr_download', amount: payableRupees });
    downloadDataUrl(qr.toPngDataUrl(), strings.qrDownloadFilename(intent.vpa, payableRupees));
  }, [intent, payableRupees, qr]);

  return (
    <div className="mt-7">
      {/* Errors and the resolved amount share one polite region, so a screen
          reader hears the amount update and any error as the donor edits. */}
      <div aria-live="polite">
        {errors.length > 0 && (
          <ul className="mb-4 space-y-1 text-[13px] text-chai-error">
            {errors.map((error) => (
              <li key={error.code}>{upiErrorStrings[error.code]}</li>
            ))}
          </ul>
        )}

        {intent !== null && payableRupees !== null && (
          <div className="mb-6 text-center">
            {/* One sentence for assistive tech; split visually for sighted donors.
                The amount is the largest thing on the card because it is the one
                number a donor must get right; the VPA sits under it in monospace,
                where they verify it character by character (DESIGN.md). */}
            <p className="sr-only">{strings.payingTo(formatRupees(payableRupees), intent.vpa)}</p>
            <p aria-hidden="true" className="chai-numeral flex items-start justify-center gap-1">
              <span className="mt-1.5 text-[26px] font-semibold leading-none text-chai-accent">
                ₹
              </span>
              <span className="text-[52px] font-bold leading-none tracking-[-0.03em]">
                {formatRupees(payableRupees)}
              </span>
            </p>
            <p aria-hidden="true" className="mt-3">
              <span className="inline-block break-all rounded-lg bg-chai-accent-soft px-2.5 py-1 font-vpa text-[13px] text-chai-ink">
                {intent.vpa}
              </span>
            </p>
          </div>
        )}
      </div>

      {intent === null || payableRupees === null ? (
        errors.length === 0 && (
          <p className="py-8 text-center text-[13px] text-chai-muted">{strings.amountPrompt}</p>
        )
      ) : (
        <div className="flex flex-col items-center gap-5">
          {/* The QR is the hero on every device, always visible (ADR-046). */}
          {qr !== null ? (
            <QrCode
              svgDataUrl={qr.svgDataUrl}
              alt={strings.qrAlt(intent.vpa, formatRupees(payableRupees))}
            />
          ) : (
            <p className="py-6 text-center text-[13px] text-chai-muted">{strings.qrUnavailable}</p>
          )}

          {/* Copy UPI ID and Save QR — equal-weight peers, one row, Copy then Save.
              Save QR drops out when the QR is over capacity; Copy never depends on it. */}
          <div className="flex w-full gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border-2 border-chai-line text-[14px] font-semibold text-chai-ink transition-colors hover:border-chai-accent hover:text-chai-accent"
            >
              <Copy aria-hidden="true" className="h-4 w-4" />
              {strings.copyUpiId}
            </button>
            {qr !== null && (
              <button
                type="button"
                onClick={handleSaveQr}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border-2 border-chai-line text-[14px] font-semibold text-chai-ink transition-colors hover:border-chai-accent hover:text-chai-accent"
              >
                <Download aria-hidden="true" className="h-4 w-4" />
                {strings.qrDownload}
              </button>
            )}
          </div>

          {/* Experimental deeplink — mobile only, deliberately the quietest thing
              here. A `upi://` link is a no-op on desktop, and on mobile it works in
              only a few apps; the caveat below sets that expectation up front. */}
          {isMobile && (
            <div className="w-full border-t border-chai-line pt-4 text-center">
              <a
                href={intent.uri}
                aria-describedby={warningId}
                onClick={() => {
                  track({ name: 'pay_clicked', method: 'deeplink', amount: payableRupees });
                }}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-chai-muted transition-colors hover:text-chai-accent"
              >
                <Smartphone aria-hidden="true" className="h-4 w-4" />
                {strings.payDirectly}
                <span className="rounded-full border border-chai-line px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  {strings.experimentalTag}
                </span>
              </a>
              <p
                id={warningId}
                className="mx-auto mt-2 max-w-[19rem] text-[12px] leading-snug text-chai-muted"
              >
                {strings.payDirectlyWarning}
              </p>
            </div>
          )}
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}
