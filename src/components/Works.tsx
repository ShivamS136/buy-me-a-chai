import type { JSX } from 'react';
import type { ChaiWork } from '../config/schema.ts';
import { resolveAsset } from '../lib/asset.ts';
import { strings } from '../strings.ts';

/**
 * The works/projects strip (P0.2).
 *
 * A horizontal, scroll-snapped rail rather than a vertical list (DESIGN.md
 * §anatomy): the works are trust content that sits *above* the payment card, so
 * their height must stay bounded no matter how many a creator lists — otherwise a
 * 12-project list would bury the one CTA that matters (DESIGN.md §1). Hidden
 * entirely when empty; no placeholder (DESIGN.md §Empty states).
 *
 * Each card is one big link. The visible title is the accessible name; the new-tab
 * cue is folded into the aria-label so it isn't lost on screen readers.
 */
export interface WorksProps {
  readonly works: readonly ChaiWork[];
}

export function Works({ works }: WorksProps): JSX.Element | null {
  if (works.length === 0) return null;

  return (
    <section aria-labelledby="chai-works-heading">
      <h2
        id="chai-works-heading"
        className="text-[12px] font-semibold uppercase tracking-[0.14em] text-chai-muted"
      >
        {strings.worksHeading}
      </h2>

      {/* Two shapes, one list. On mobile a horizontal scroll-snap rail whose `-mx`/
          `px` bleed lets a scrolled card peek in from the side (space is scarce above
          the CTA); on desktop, where the left column is wide, it unfolds into a plain
          two-column grid so every project is visible at once. */}
      <ul className="-mx-1 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0 lg:pb-0">
        {works.map((work) => (
          <li key={work.url} className="w-[200px] shrink-0 snap-start lg:w-auto">
            <a
              href={work.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={strings.externalLink(work.title)}
              className="group block h-full overflow-hidden rounded-2xl border border-chai-line bg-chai-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-chai-accent hover:shadow-[0_12px_26px_-14px_rgb(120_60_20/0.32)]"
            >
              {work.image !== undefined && (
                <img
                  alt=""
                  src={resolveAsset(work.image)}
                  className="aspect-video w-full object-cover"
                />
              )}
              <div className="p-3.5">
                <h3 className="text-[14px] font-semibold leading-snug text-chai-ink group-hover:text-chai-accent-strong">
                  {work.title}
                </h3>
                {work.description !== undefined && (
                  <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-chai-muted">
                    {work.description}
                  </p>
                )}
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
