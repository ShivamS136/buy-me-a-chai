import { Globe, Rss } from 'lucide-react';
import type { JSX } from 'react';
import type { ChaiCreator } from '../config/schema.ts';
import { resolveAsset } from '../lib/asset.ts';
import { resolveSocial } from '../lib/social.ts';
import { strings } from '../strings.ts';

/**
 * Creator identity block (P0.2): avatar, name, tagline, social links.
 *
 * On desktop this is the top of the left column; on mobile it is the first thing
 * under the masthead (DESIGN.md §anatomy, ADR-024). It is *not* a landmark — the
 * masthead is the page banner — but it carries the page's single `<h1>`, the
 * creator's name.
 *
 * A missing avatar becomes an initials disc in the accent tint rather than a broken
 * image (DESIGN.md §Empty states). Brand marks come from `simple-icons` via
 * `resolveSocial`; anything unmapped falls back to a globe, still labelled.
 */

/** First letters of the first and last name words — the initials-disc fallback. */
const initials = (name: string): string => {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
};

const socialIcon = (url: string): JSX.Element => {
  const resolved = resolveSocial(url);
  if (resolved.kind === 'brand' && resolved.brand !== null) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-5 w-5">
        <path d={resolved.brand.path} />
      </svg>
    );
  }
  if (resolved.kind === 'feed') return <Rss aria-hidden="true" className="h-5 w-5" />;
  return <Globe aria-hidden="true" className="h-5 w-5" />;
};

export interface ProfileProps {
  readonly creator: ChaiCreator;
}

export function Profile({ creator }: ProfileProps): JSX.Element {
  const { name, tagline, avatar, socials } = creator;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        {avatar === undefined ? (
          <div
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-chai-accent-soft text-[22px] font-bold text-chai-accent-strong shadow-[0_6px_16px_-6px_rgb(120_60_20/0.28)] ring-1 ring-chai-line"
          >
            {initials(name)}
          </div>
        ) : (
          <img
            // Decorative: the name beside it is the accessible identity, so a
            // redundant "X's avatar" alt would only add noise for screen readers.
            alt=""
            src={resolveAsset(avatar)}
            className="h-16 w-16 shrink-0 rounded-full object-cover shadow-[0_6px_16px_-6px_rgb(120_60_20/0.28)] ring-1 ring-chai-line"
          />
        )}
        <div className="min-w-0">
          <h1 className="text-balance text-[26px] font-bold leading-tight tracking-[-0.02em]">
            {name}
          </h1>
          {tagline !== undefined && (
            <p className="mt-0.5 text-[14px] leading-snug text-chai-muted">{tagline}</p>
          )}
        </div>
      </div>

      {socials.length > 0 && (
        <nav aria-label={strings.socialsLabel}>
          <ul className="flex flex-wrap gap-1">
            {socials.map((social) => (
              <li key={social.url}>
                <a
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={strings.externalLink(social.label)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full text-chai-muted transition-colors hover:bg-chai-accent-soft hover:text-chai-accent-strong"
                >
                  {socialIcon(social.url)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
