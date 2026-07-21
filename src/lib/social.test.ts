import { describe, expect, it } from 'vitest';
import { resolveSocial } from './social.ts';

describe('resolveSocial', () => {
  it('maps a known domain to its brand mark', () => {
    const resolved = resolveSocial('https://github.com/shivams136');
    expect(resolved.kind).toBe('brand');
    expect(resolved.brand?.title).toBe('GitHub');
    expect(resolved.brand?.path.length).toBeGreaterThan(0);
  });

  it('maps twitter.com and x.com to the same X mark', () => {
    expect(resolveSocial('https://twitter.com/x').brand?.title).toBe('X');
    expect(resolveSocial('https://x.com/x').brand?.title).toBe('X');
  });

  it('matches a subdomain of a brand', () => {
    expect(resolveSocial('https://gist.github.com/x').brand?.title).toBe('GitHub');
  });

  it('strips a leading www. before matching', () => {
    expect(resolveSocial('https://www.youtube.com/@x').brand?.title).toBe('YouTube');
  });

  it('does not match a lookalike domain', () => {
    expect(resolveSocial('https://notgithub.com/x').kind).toBe('link');
  });

  it('falls back to a generic link for an unmapped brand (LinkedIn)', () => {
    const resolved = resolveSocial('https://www.linkedin.com/in/x');
    expect(resolved.kind).toBe('link');
    expect(resolved.brand).toBeNull();
  });

  it('classifies a feed URL', () => {
    expect(resolveSocial('https://blog.example.com/feed.xml').kind).toBe('feed');
    expect(resolveSocial('https://blog.example.com/rss').kind).toBe('feed');
  });

  it('returns a plain link for an unparseable URL, never throwing', () => {
    expect(resolveSocial('not a url')).toEqual({ kind: 'link', brand: null });
  });
});
