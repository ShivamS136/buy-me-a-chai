import { afterEach, describe, expect, it } from 'vitest';
import { contrastRatio, parseCssColor, type Rgb } from '../config/css-color.ts';
import { ACCENT_STYLE_ID, accentThemeCss, applyTheme } from './theme.ts';

const WHITE: Rgb = { r: 255, g: 255, b: 255, a: 1 };
const DARK_SURFACE: Rgb = { r: 0x24, g: 0x1b, b: 0x14, a: 1 };

/** Pulls a token's hex out of a specific selector block in the generated CSS. */
const tokenIn = (css: string, selector: RegExp, token: string): Rgb | null => {
  const block = selector.exec(css)?.[1];
  if (block === undefined) return null;
  const hex = new RegExp(`${token}:(#[0-9a-f]{6})`, 'i').exec(block)?.[1];
  if (hex === undefined) return null;
  const parsed = parseCssColor(hex);
  return parsed.kind === 'rgb' ? parsed.rgb : null;
};

const LIGHT_ROOT = /:root\{([^}]*)\}/;
const FORCED_DARK = /:root\[data-theme="dark"\]\{([^}]*)\}/;

describe('accentThemeCss', () => {
  it('returns null for the built-in accent, in any equivalent notation', () => {
    expect(accentThemeCss('#C4622D')).toBeNull();
    expect(accentThemeCss('#c4622d')).toBeNull();
    expect(accentThemeCss('rgb(196 98 45)')).toBeNull();
  });

  it('returns null for an unparseable accent (the build fails on it anyway)', () => {
    expect(accentThemeCss('definitely-not-a-color')).toBeNull();
  });

  it('emits light, auto-dark and forced-dark blocks for a custom accent', () => {
    const css = accentThemeCss('#2563eb') ?? '';
    expect(css).toContain(':root{');
    expect(css).toContain('@media (prefers-color-scheme:dark){:root:not([data-theme="light"])');
    expect(css).toContain(':root[data-theme="dark"]');
  });

  it('darkens -strong until white text clears AA on the light surface', () => {
    const css = accentThemeCss('#ff8800') ?? '';
    const strong = tokenIn(css, LIGHT_ROOT, '--chai-accent-strong');
    expect(strong).not.toBeNull();
    if (strong !== null) {
      expect(contrastRatio(strong, WHITE)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('lifts the accent until it clears AA on the dark surface', () => {
    // A deep blue is unreadable on the dark brew until lifted.
    const css = accentThemeCss('#1e3a8a') ?? '';
    const accent = tokenIn(css, FORCED_DARK, '--chai-accent');
    expect(accent).not.toBeNull();
    if (accent !== null) {
      expect(contrastRatio(accent, DARK_SURFACE)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('uses color-mix() for a modern color function it cannot parse to RGB', () => {
    const css = accentThemeCss('oklch(0.7 0.15 40)') ?? '';
    expect(css).toContain('color-mix(in oklab, oklch(0.7 0.15 40)');
  });
});

describe('applyTheme', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.getElementById(ACCENT_STYLE_ID)?.remove();
  });

  it('stamps data-theme for a forced mode', () => {
    applyTheme({ mode: 'dark', accent: '#C4622D' });
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('clears a previously forced data-theme when the mode is auto', () => {
    document.documentElement.dataset.theme = 'dark';
    applyTheme({ mode: 'auto', accent: '#C4622D' });
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('injects an accent stylesheet for a custom accent and removes it for the default', () => {
    applyTheme({ mode: 'auto', accent: '#2563eb' });
    const style = document.getElementById(ACCENT_STYLE_ID);
    expect(style).not.toBeNull();
    expect(style?.textContent ?? '').toContain('--chai-accent:');

    applyTheme({ mode: 'auto', accent: '#C4622D' });
    expect(document.getElementById(ACCENT_STYLE_ID)).toBeNull();
  });
});
