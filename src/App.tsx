import type { JSX } from 'react';
import { Bio } from './components/Bio.tsx';
import { Footer } from './components/Footer.tsx';
import { Masthead } from './components/Masthead.tsx';
import { PaymentCard } from './components/PaymentCard.tsx';
import { Profile } from './components/Profile.tsx';
import { ReferralNote } from './components/ReferralNote.tsx';
import { Works } from './components/Works.tsx';
import { config } from './config/config.ts';
import { strings } from './strings.ts';

/**
 * The page (P0.2, P0.10).
 *
 * A locked-brand masthead, a two-shape body, and the project's footer. The body is
 * one grid (`.chai-grid`, index.css): on mobile a single column in reading order —
 * profile → payment → projects; on desktop the profile and projects fill a left
 * column while the payment ticket takes its own right column and stays pinned
 * (always-visible) as the left scrolls (DESIGN.md §anatomy, ADR-024).
 *
 * Landmarks: `Masthead` is the banner, `Footer` the contentinfo, the three body
 * sections sit in `<main>`. A skip link jumps keyboard and screen-reader users
 * straight to the payment card — the page's one job (DESIGN.md §1) — past the
 * identity and projects. The creator's name is the page's single `<h1>` (in the
 * profile); the masthead wordmark is a logotype, not a heading.
 *
 * Default export is permitted here — CLAUDE.md allows it for route components.
 */
export default function App(): JSX.Element {
  const { creator, works } = config;
  const hasBio = creator.bio !== undefined && creator.bio.trim().length > 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#chai-pay"
        className="sr-only rounded-full bg-chai-ink px-4 py-2 text-[14px] font-semibold text-chai-bg focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
      >
        {strings.skipToPayment}
      </a>

      <Masthead />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-[480px] px-4 py-8 lg:max-w-[1040px] lg:py-12">
          <ReferralNote />
          <div className="chai-grid">
            <div
              className="chai-area-profile chai-rise flex flex-col gap-6"
              style={{ animationDelay: '60ms' }}
            >
              <Profile creator={creator} />
              {hasBio && creator.bio !== undefined && <Bio bio={creator.bio} />}
            </div>

            {/* Skip-link target. `tabIndex={-1}` lets focus land here without adding a
                tab stop; `scroll-mt` keeps it off the top edge. On desktop the inner
                wrapper is what stays pinned, so the QR is always in view. */}
            <div id="chai-pay" tabIndex={-1} className="chai-area-payment scroll-mt-4 outline-none">
              <div className="chai-rise lg:sticky lg:top-6" style={{ animationDelay: '140ms' }}>
                <PaymentCard config={config} />
              </div>
            </div>

            {works.length > 0 && (
              <div className="chai-area-works chai-rise" style={{ animationDelay: '220ms' }}>
                <Works works={works} />
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
