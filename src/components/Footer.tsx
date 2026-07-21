import type { JSX } from 'react';
import { withReferral } from '../lib/referral.ts';
import { MAKER, MAKER_PROJECT } from '../project.ts';
import { strings } from '../strings.ts';

/**
 * The project's two template links (ADR-026, ADR-027): a credit link to the repo and
 * the maintainer's support page. Both ship on by default and both are deletable from
 * source — the only ask of a free project (DESIGN.md §4). Their URLs live in
 * `src/project.ts`; the hrefs are referral-tagged so clone-driven traffic is
 * traceable. Paired with the always-on disclosure of where donations actually go
 * (DESIGN.md §Copy). Full-width and outside the layout grid; the inner width tracks
 * the page shell.
 */
export function Footer(): JSX.Element {
  return (
    <footer className="border-t border-chai-line">
      <div className="mx-auto flex w-full max-w-[480px] flex-col items-center gap-2 px-4 py-8 text-center text-chai-muted lg:max-w-[1040px]">
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12px]">
          <a
            href={withReferral(MAKER_PROJECT.repoUrl, 'footer')}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={strings.externalLink(strings.poweredBy(MAKER_PROJECT.name))}
            className="font-medium text-chai-ink underline-offset-2 hover:text-chai-accent-strong hover:underline"
          >
            {strings.poweredBy(MAKER_PROJECT.name)}
          </a>
          <span aria-hidden="true">·</span>
          <a
            href={withReferral(MAKER.supportUrl, 'footer')}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={strings.externalLink(strings.supportMaker(MAKER.name))}
            className="font-medium text-chai-ink underline-offset-2 hover:text-chai-accent-strong hover:underline"
          >
            {strings.supportMaker(MAKER.name)}
          </a>
        </p>
        <p className="text-[11px]">{strings.poweredByTagline}</p>
        <p className="text-[11px] opacity-80">{strings.footerDisclosure}</p>
      </div>
    </footer>
  );
}
