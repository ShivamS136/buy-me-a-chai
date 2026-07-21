import { describe, expect, it } from 'vitest';
import { MAKER_PROJECT } from '../project.ts';
import { readInboundSource, withReferral } from './referral.ts';

describe('withReferral', () => {
  it('tags a link with the source project (campaign) and the clone host (source)', () => {
    const parsed = new URL(withReferral('https://github.com/x/y', 'footer', 'asha.dev'));
    expect(parsed.searchParams.get('utm_campaign')).toBe(MAKER_PROJECT.name);
    expect(parsed.searchParams.get('utm_source')).toBe('asha.dev');
    expect(parsed.searchParams.get('utm_medium')).toBe('referral');
    expect(parsed.searchParams.get('utm_content')).toBe('footer');
    expect(parsed.searchParams.get('ref')).toBe('asha.dev');
    // The destination path is preserved, only query params are added.
    expect(parsed.origin + parsed.pathname).toBe('https://github.com/x/y');
  });

  it('leaves the url untouched when there is no host (build/SSR)', () => {
    expect(withReferral('https://github.com/x/y', 'footer', '')).toBe('https://github.com/x/y');
  });

  it('leaves the url untouched when it cannot be parsed', () => {
    expect(withReferral('not a url', 'footer', 'asha.dev')).toBe('not a url');
  });
});

describe('readInboundSource', () => {
  it('reads ref, source, or utm_source', () => {
    expect(readInboundSource('?ref=hackernews')).toBe('hackernews');
    expect(readInboundSource('?source=newsletter')).toBe('newsletter');
    expect(readInboundSource('?utm_source=twitter')).toBe('twitter');
  });

  it('prefers ref over the other keys', () => {
    expect(readInboundSource('?utm_source=twitter&ref=hn')).toBe('hn');
  });

  it('strips angle brackets and control characters and caps the length', () => {
    expect(readInboundSource('?ref=%3Cscript%3Ex')).toBe('scriptx');
    expect(readInboundSource(`?ref=${'a'.repeat(80)}`)).toBe('a'.repeat(48));
  });

  it('returns null when absent, empty, or whitespace only', () => {
    expect(readInboundSource('')).toBeNull();
    expect(readInboundSource('?ref=')).toBeNull();
    expect(readInboundSource('?ref=%20%20')).toBeNull();
  });
});
