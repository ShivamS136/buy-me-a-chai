/**
 * Maps a social link's URL to a brand mark (P0.2).
 *
 * Lucide dropped every brand glyph in v1.x, so the recognisable logos come from
 * `simple-icons` (CC0, path-data only — no CDN, no runtime, nothing leaves the
 * device, which keeps the privacy rule intact). Only the brands mapped below are
 * imported, so the bundle carries ~30 path strings, not the full 3,000-icon set
 * (`simple-icons` is side-effect-free ESM and tree-shakes on the named imports).
 *
 * Framework-free by contract (ADR-004): URL in, brand data out. The component maps
 * the non-brand kinds to a Lucide glyph; this file never touches React or the DOM.
 *
 * A brand that isn't in the table — LinkedIn, for one, which simple-icons no longer
 * ships — falls back to the generic globe, still carrying its config `label`, so an
 * unknown domain degrades to a labelled link rather than nothing.
 */

import {
  siBandcamp,
  siBehance,
  siBluesky,
  siBuymeacoffee,
  siDevdotto,
  siDiscord,
  siDribbble,
  siFacebook,
  siGithub,
  siGitlab,
  siHashnode,
  siInstagram,
  siKofi,
  siMastodon,
  siMedium,
  siNotion,
  siPatreon,
  siProducthunt,
  siReddit,
  siSpotify,
  siStackoverflow,
  siSubstack,
  siTelegram,
  siThreads,
  siTwitch,
  siWhatsapp,
  siX,
  siYoutube,
} from 'simple-icons';

/** The subset of a `simple-icons` datum the UI needs — a 24×24 single path. */
export interface BrandIcon {
  readonly title: string;
  readonly path: string;
}

export type SocialKind = 'brand' | 'feed' | 'link';

export interface ResolvedSocial {
  readonly kind: SocialKind;
  /** The brand mark, present only when `kind === 'brand'`. */
  readonly brand: BrandIcon | null;
}

/**
 * Registrable domains → brand mark. Each entry lists every host a brand serves
 * from, so `youtu.be` and `youtube.com` resolve to the same mark. Matching is on
 * the apex or any subdomain of it (see `hostMatchesDomain`), never a bare
 * `endsWith`, so `notx.com` never picks up X's mark.
 */
const BRAND_TABLE: ReadonlyArray<readonly [readonly string[], BrandIcon]> = [
  [['github.com'], siGithub],
  [['gitlab.com'], siGitlab],
  [['x.com', 'twitter.com'], siX],
  [['youtube.com', 'youtu.be'], siYoutube],
  [['instagram.com'], siInstagram],
  [['facebook.com', 'fb.com'], siFacebook],
  [['mastodon.social', 'mastodon.online', 'fosstodon.org'], siMastodon],
  [['bsky.app', 'bsky.social'], siBluesky],
  [['threads.net', 'threads.com'], siThreads],
  [['t.me', 'telegram.me', 'telegram.org'], siTelegram],
  [['wa.me', 'whatsapp.com'], siWhatsapp],
  [['discord.gg', 'discord.com'], siDiscord],
  [['reddit.com'], siReddit],
  [['twitch.tv'], siTwitch],
  [['dribbble.com'], siDribbble],
  [['behance.net'], siBehance],
  [['medium.com'], siMedium],
  [['substack.com'], siSubstack],
  [['dev.to'], siDevdotto],
  [['hashnode.com', 'hashnode.dev'], siHashnode],
  [['stackoverflow.com'], siStackoverflow],
  [['ko-fi.com'], siKofi],
  [['buymeacoffee.com', 'buymeacoff.ee'], siBuymeacoffee],
  [['patreon.com'], siPatreon],
  [['producthunt.com'], siProducthunt],
  [['spotify.com'], siSpotify],
  [['bandcamp.com'], siBandcamp],
  [['notion.so', 'notion.site'], siNotion],
];

/** Apex or any subdomain of it — `github.com` and `gist.github.com`, never `notgithub.com`. */
const hostMatchesDomain = (host: string, domain: string): boolean =>
  host === domain || host.endsWith(`.${domain}`);

const FEED_PATH_RE = /(\.(xml|rss|atom)$|(^|\/)(feed|rss|atom)(\/|$))/;

export const resolveSocial = (url: string): ResolvedSocial => {
  let host: string;
  let path: string;
  try {
    const parsed = new URL(url);
    host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    path = parsed.pathname.toLowerCase();
  } catch {
    // The schema already guarantees an http(s) URL, so this is unreachable from a
    // built page — but the classifier must never throw on a caller's bad input.
    return { kind: 'link', brand: null };
  }

  for (const [domains, brand] of BRAND_TABLE) {
    if (domains.some((domain) => hostMatchesDomain(host, domain))) {
      return { kind: 'brand', brand };
    }
  }

  if (FEED_PATH_RE.test(path)) return { kind: 'feed', brand: null };
  return { kind: 'link', brand: null };
};
