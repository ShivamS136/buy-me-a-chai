import { describe, expect, it } from 'vitest';
import { resolveAsset } from './asset.ts';

describe('resolveAsset', () => {
  it('returns a public path unchanged at the site root', () => {
    expect(resolveAsset('/avatar.png', '/')).toBe('/avatar.png');
  });

  it('prefixes a public path with a GitHub Pages subpath base', () => {
    expect(resolveAsset('/avatar.png', '/buy-me-a-chai/')).toBe('/buy-me-a-chai/avatar.png');
  });

  it('never doubles the slash between base and path', () => {
    expect(resolveAsset('/works/tashn.png', '/buy-me-a-chai/')).toBe(
      '/buy-me-a-chai/works/tashn.png',
    );
  });

  it('leaves an absolute http(s) URL untouched', () => {
    expect(resolveAsset('https://cdn.example.com/a.png', '/buy-me-a-chai/')).toBe(
      'https://cdn.example.com/a.png',
    );
  });

  it('leaves a protocol-relative URL untouched', () => {
    expect(resolveAsset('//cdn.example.com/a.png', '/sub/')).toBe('//cdn.example.com/a.png');
  });

  it('defaults to import.meta.env.BASE_URL ("/" under Vitest)', () => {
    expect(resolveAsset('/a.png')).toBe('/a.png');
  });
});
