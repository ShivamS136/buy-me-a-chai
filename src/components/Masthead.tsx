import { Coffee, Globe } from 'lucide-react';
import type { JSX } from 'react';
import { withReferral } from '../lib/referral.ts';
import { resolveSocial } from '../lib/social.ts';
import { MAKER_PROJECT } from '../project.ts';
import { strings } from '../strings.ts';

/**
 * The masthead (ADR-026): the project's locked brand bar, identical on every fork.
 *
 * It is the page's banner landmark, and it frames the creator's content as "made
 * with buy me a chai". Deliberately *not* an <h1> — the creator's name downstream is
 * the page's single heading, so this wordmark is plain text (a logotype).
 *
 * The right side carries one CTA — "Create your support page" — pointing at GitHub's
 * use-this-template flow rather than the bare repo: a visitor who likes this page is
 * one click from having their own. It is referral-tagged, so it doubles as the signal
 * that measures clone-driven traffic (ADR-027). The maker's support link lives only in
 * the footer, so the masthead stays a clean brand bar. The inner width tracks the page
 * shell so the wordmark lines up with the profile column.
 */

/** The repo's brand glyph (GitHub, GitLab, …), or a globe if the host is unmapped. */
const repoGlyph = (): JSX.Element => {
  const resolved = resolveSocial(MAKER_PROJECT.repoUrl);
  if (resolved.kind === 'brand' && resolved.brand !== null) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-[18px] w-[18px]">
        <path d={resolved.brand.path} />
      </svg>
    );
  }
  return <Globe aria-hidden="true" className="h-[18px] w-[18px]" />;
};

export function Masthead(): JSX.Element {
  return (
    <header className="border-b border-chai-line">
      {/* Two variants of one CTA. "Create your support page" is a full phrase that
          cannot share a narrow row with the wordmark, so below `lg` it collapses to
          the bare glyph. Exactly one is ever displayed, so only one reaches the
          accessibility tree — the other is `display:none`. */}
      <div className="mx-auto flex w-full max-w-[480px] gap-3 px-4 py-3 items-center justify-between lg:max-w-[1040px]">
        <span className="inline-flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-chai-ink">
          <Coffee aria-hidden="true" className="h-[18px] w-[18px] text-chai-accent" />
          {strings.brandName}
        </span>

        <a
          href={withReferral(MAKER_PROJECT.templateUrl, 'masthead')}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={strings.externalLink(strings.createYourPage)}
          className="hidden lg:inline-flex h-10 items-center gap-2 rounded-full border border-chai-line px-4 text-[14px] font-semibold text-chai-ink transition-colors hover:border-chai-accent hover:text-chai-accent-strong"
        >
          {repoGlyph()}
          {strings.createYourPage}
        </a>
        <a
          href={withReferral(MAKER_PROJECT.templateUrl, 'masthead')}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={strings.externalLink(strings.createYourPage)}
          className="inline-flex lg:hidden h-10 items-center px-4 text-chai-ink transition-colors hover:border-chai-accent hover:text-chai-accent-strong"
        >
          {repoGlyph()}
        </a>
      </div>
    </header>
  );
}
