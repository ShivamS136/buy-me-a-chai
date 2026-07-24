import type { JSX } from 'react';
import { strings } from '../strings.ts';

/**
 * The live UPI QR (P0.5) — the pay zone's hero on every device.
 *
 * Presentational by design: it receives an already-rendered SVG data URI and never
 * encodes anything itself, so every QR the page shows is derived from one matrix.
 * The Save-QR action is not here — it sits in `PayZone`'s action row beside Copy
 * UPI ID (ADR-046), which owns the PNG encode and the analytics.
 *
 * An `<img>` rather than inline SVG so the symbol carries a real `alt` — the VPA
 * and amount in text, which is both the accessibility requirement (DESIGN.md) and
 * the fallback for a donor whose images fail to load.
 */
export interface QrCodeProps {
  readonly svgDataUrl: string;
  readonly alt: string;
}

export function QrCode({ svgDataUrl, alt }: QrCodeProps): JSX.Element {
  return (
    <figure className="flex flex-col items-center gap-3">
      {/*
       * The plate stays white in dark mode. A QR is read by luminance contrast,
       * and inverting it is the single most common way to make one unscannable.
       */}
      <div className="rounded-2xl bg-white p-3 shadow-[0_1px_2px_rgb(43_29_20/0.08),0_8px_24px_rgb(43_29_20/0.08)] ring-1 ring-chai-line">
        <img
          // Re-keying on the URI remounts the image, which replays the crossfade
          // each time the amount or message changes (DESIGN.md §Motion).
          key={svgDataUrl}
          src={svgDataUrl}
          alt={alt}
          className="chai-fade-in h-56 w-56 sm:h-60 sm:w-60"
        />
      </div>

      <figcaption className="text-center text-[13px] leading-snug text-chai-muted">
        {strings.qrCaption}
      </figcaption>
    </figure>
  );
}
