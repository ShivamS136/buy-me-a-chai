import { ChevronDown, Copy, QrCode as QrCodeIcon, Smartphone } from 'lucide-react';
import type { JSX } from 'react';
import { useCallback, useId, useState } from 'react';
import { useDeeplinkAttempt } from '../hooks/useDeeplinkAttempt.ts';
import { useIsMobile } from '../hooks/useIsMobile.ts';
import { useToast } from '../hooks/useToast.ts';
import type { UpiQr } from '../hooks/useUpiIntent.ts';
import { formatRupees } from '../lib/amount.ts';
import { copyText } from '../lib/clipboard.ts';
import type { UpiError, UpiIntent } from '../lib/upi.ts';
import { strings, upiErrorStrings } from '../strings.ts';
import { QrCode } from './QrCode.tsx';
import { Toast } from './Toast.tsx';

/**
 * The device-adaptive pay zone (P0.5, P0.6, P0.7) — everything below the tear.
 *
 * The three payment paths are peers by rule (hard rule 3, ADR-006); the device
 * only decides which leads:
 *  - Desktop: the QR is primary (a separate phone scans it), Copy UPI ID sits under
 *    it as the universal fallback.
 *  - Mobile: buttons lead (a phone cannot scan its own screen). "Pay with UPI app"
 *    fires the deeplink; Copy UPI ID is always there; the QR is one tap away in an
 *    accordion for the screenshot-then-upload flow.
 *
 * `useUpiIntent` already degrades `qr` to `null` past QR capacity without touching
 * the intent, so the copy and deeplink paths never depend on the QR.
 */
export interface PayZoneProps {
  readonly intent: UpiIntent | null;
  readonly errors: readonly UpiError[];
  readonly qr: UpiQr | null;
}

export function PayZone({ intent, errors, qr }: PayZoneProps): JSX.Element {
  const isMobile = useIsMobile();
  const { toast, showToast } = useToast();
  // Passing the current URI lets the callout clear itself when the amount changes.
  const { likelyFailed, markAttempt } = useDeeplinkAttempt(intent?.uri ?? null);
  const [qrOpen, setQrOpen] = useState(false);
  const qrPanelId = useId();

  // Read from the URI's own `am`, so the number on screen is the number encoded.
  const payableRupees = intent === null ? null : Number.parseInt(intent.amount, 10);

  const handleCopy = useCallback((): void => {
    if (intent === null || payableRupees === null) return;
    void copyText(intent.vpa).then((ok) => {
      showToast(ok ? strings.copyConfirmation(formatRupees(payableRupees)) : strings.copyFailed);
    });
  }, [intent, payableRupees, showToast]);

  const qrNode = (): JSX.Element =>
    intent !== null && payableRupees !== null && qr !== null ? (
      <QrCode
        svgDataUrl={qr.svgDataUrl}
        alt={strings.qrAlt(intent.vpa, formatRupees(payableRupees))}
        filename={strings.qrDownloadFilename(intent.vpa, payableRupees)}
        toPngDataUrl={qr.toPngDataUrl}
      />
    ) : (
      <p className="py-6 text-center text-[13px] text-chai-muted">{strings.qrUnavailable}</p>
    );

  const copyButton = (extraClass: string): JSX.Element => (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full text-[14px] font-semibold transition-colors ${extraClass}`}
    >
      <Copy aria-hidden="true" className="h-4 w-4" />
      {strings.copyUpiId}
    </button>
  );

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
      ) : isMobile ? (
        // ── Mobile: buttons lead, QR in an accordion ────────────────────
        <div className="flex flex-col gap-3">
          <a
            href={intent.uri}
            onClick={markAttempt}
            className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-chai-accent-strong px-6 text-[15px] font-semibold text-chai-accent-ink shadow-[0_2px_4px_rgb(43_29_20/0.14),0_12px_26px_-6px_rgb(163_78_34/0.45)] transition-transform hover:-translate-y-px active:translate-y-0 active:scale-[0.99]"
          >
            <Smartphone aria-hidden="true" className="h-5 w-5" />
            {strings.payWithUpiApp}
          </a>
          <p className="text-center text-[12px] leading-snug text-chai-muted">
            {strings.payWithUpiAppHint}
          </p>

          {/* The heuristic's nudge — polite, dismissed on the next amount change. */}
          <div aria-live="polite">
            {likelyFailed && (
              <p className="rounded-2xl bg-chai-accent-soft px-4 py-3 text-[13px] leading-snug text-chai-ink">
                {strings.deeplinkFallbackCallout}
              </p>
            )}
          </div>

          {copyButton(
            'border-2 border-chai-line text-chai-ink hover:border-chai-accent hover:text-chai-accent',
          )}

          <div className="mt-1">
            <button
              type="button"
              aria-expanded={qrOpen}
              aria-controls={qrPanelId}
              onClick={() => setQrOpen((open) => !open)}
              className="flex min-h-11 w-full items-center justify-between rounded-full px-4 text-[13px] font-semibold text-chai-muted transition-colors hover:text-chai-accent"
            >
              <span className="inline-flex items-center gap-2">
                <QrCodeIcon aria-hidden="true" className="h-4 w-4" />
                {qrOpen ? strings.hideQr : strings.showQr}
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`h-4 w-4 transition-transform ${qrOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {qrOpen && (
              <div id={qrPanelId} className="chai-fade-in mt-3 flex flex-col items-center gap-3">
                {qr !== null && (
                  <p className="text-center text-[12px] text-chai-muted">{strings.showQrHint}</p>
                )}
                {qrNode()}
              </div>
            )}
          </div>
        </div>
      ) : (
        // ── Desktop: QR leads, Copy UPI ID underneath ───────────────────
        <div className="flex flex-col items-center gap-5">
          {qrNode()}
          {copyButton(
            'border border-chai-line px-5 text-chai-ink hover:border-chai-accent hover:text-chai-accent',
          )}
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}
