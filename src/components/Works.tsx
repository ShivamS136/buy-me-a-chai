import type { JSX } from 'react';
import type { ChaiWork } from '../config/schema.ts';
import { resolveAsset } from '../lib/asset.ts';
import { strings } from '../strings.ts';

/**
 * The works/projects list (P0.2, ADR-036).
 *
 * A vertical stack of full-width cards rather than a fixed-width card rail:
 * descriptions are long-form (up to 300 characters, line breaks preserved), and a
 * 200px card could only ever show a clipped teaser of one. The height this frees is
 * safe to spend — works sit *after* the payment card in the mobile grid order and
 * *beside* a sticky ticket on desktop (ADR-024), so a long list scrolls past the CTA
 * instead of burying it (DESIGN.md §1). Hidden entirely when empty; no placeholder.
 *
 * The **title** is the link, not the whole row. With a paragraph of description
 * beside it, wrapping the row in one anchor would make that text unselectable, give
 * the link an unreasonably long accessible name, and permanently rule out rendering
 * markdown in the description, since nested anchors are invalid HTML.
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

      <ul className="flex flex-col gap-3 mt-1 pt-3 border-t border-chai-line">
        {works.map((work) => (
          <li key={work.url} className="flex gap-3.5 p-3 bg-chai-surface rounded-lg shadow">
            {work.image !== undefined && (
              <img
                alt=""
                src={resolveAsset(work.image)}
                className="h-14 w-14 shrink-0 rounded-xl object-cover"
              />
            )}
            {/* min-w-0 lets a long unbroken word wrap instead of stretching the row. */}
            <div className="min-w-0">
              <h3 className="text-[14px] font-semibold leading-snug text-chai-ink">
                <a
                  href={work.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={strings.externalLink(work.title)}
                  className="underline-offset-2 hover:text-chai-accent-strong hover:underline"
                >
                  {work.title}
                </a>
              </h3>
              {work.description !== undefined && (
                // whitespace-pre-line honours the line breaks `block()` now allows.
                <p className="mt-1 whitespace-pre-line text-[12px] leading-relaxed text-chai-muted">
                  {work.description}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
