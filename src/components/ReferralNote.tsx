import { ArrowUpRight } from 'lucide-react';
import type { JSX } from 'react';
import { readInboundSource } from '../lib/referral.ts';
import { strings } from '../strings.ts';

/**
 * The inbound referral chip (ADR-027).
 *
 * When the page is opened with `?ref=` / `?source=` / `?utm_source=`, we surface
 * where the visit came from — a quiet reference, no more. The value is sanitised by
 * `readInboundSource` and rendered as text (never a URL or markup), so a crafted
 * param cannot inject. Renders nothing when there is no such param, which is the
 * common case. PostHog capture of the same signal lands in Session 5.
 */
export function ReferralNote(): JSX.Element | null {
  const source = readInboundSource();
  if (source === null) return null;

  return (
    <div className="mb-6">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-chai-accent-soft px-3 py-1 text-[12px] text-chai-ink">
        <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 text-chai-accent" />
        {strings.referredVia(source)}
      </span>
    </div>
  );
}
