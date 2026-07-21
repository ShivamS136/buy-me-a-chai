/**
 * Applies `theme.mode` and `theme.accent` at runtime (P0.10, part of Session 4's
 * theme work).
 *
 * Two things happen here:
 *
 *  1. **Mode.** `mode: 'light' | 'dark'` pins the palette by stamping `data-theme`
 *     on `<html>`; `'auto'` (the default) removes it and lets the
 *     `prefers-color-scheme` media query in index.css decide. The build's
 *     `chai-head` plugin stamps the same attribute into the served HTML so a forced
 *     theme paints without a flash — this re-affirms it for `pnpm dev` and tests.
 *
 *  2. **Accent.** A creator's `theme.accent` overrides `--chai-accent` and its
 *     derived `-strong` / `-soft` / `-ink` companions. The accent alone is not
 *     enough: `-strong` is the *only* token allowed to carry white text (ADR-018),
 *     and a light accent would fail AA there, so it is darkened until white clears
 *     4.5:1. Dark mode needs the mirror — the accent is lifted until it clears 4.5:1
 *     on the dark surface, exactly as the hand-tuned defaults do. The tokens are
 *     injected with the *same* selectors index.css uses, appended after it, so equal
 *     specificity resolves in our favour by source order — including under a forced
 *     `[data-theme="dark"]`.
 *
 * DOM-touching, so it lives in `src/lib` beside `device.ts`/`download.ts` rather
 * than in the framework-free core (ADR-004). The derivation itself is pure and
 * unit-tested; only `applyTheme` reaches for `document`.
 */

import { contrastRatio, parseCssColor, type Rgb } from '../config/css-color.ts';
import type { ChaiTheme } from '../config/schema.ts';

export const ACCENT_STYLE_ID = 'chai-theme-accent';

/** Must equal the `:root` defaults in index.css — see the short-circuit below. */
const DEFAULT_ACCENT: Rgb = { r: 0xc4, g: 0x62, b: 0x2d, a: 1 };
const WHITE: Rgb = { r: 255, g: 255, b: 255, a: 1 };
const BLACK: Rgb = { r: 0, g: 0, b: 0, a: 1 };
/** The dark surface token (`--chai-surface` in dark) the accent sits on. */
const DARK_SURFACE: Rgb = { r: 0x24, g: 0x1b, b: 0x14, a: 1 };
/** AA for normal text — the bar `-strong` must clear against its ink. */
const AA_TEXT = 4.5;

const clampByte = (n: number): number => Math.max(0, Math.min(255, Math.round(n)));

const toHex = ({ r, g, b }: Rgb): string =>
  `#${[r, g, b].map((c) => clampByte(c).toString(16).padStart(2, '0')).join('')}`;

/** Linear sRGB blend of `a` toward `b` by `t` (0–1). Opaque result. */
const mix = (a: Rgb, b: Rgb, t: number): Rgb => ({
  r: a.r * (1 - t) + b.r * t,
  g: a.g * (1 - t) + b.g * t,
  b: a.b * (1 - t) + b.b * t,
  a: 1,
});

const sameRgb = (a: Rgb, b: Rgb): boolean =>
  clampByte(a.r) === clampByte(b.r) &&
  clampByte(a.g) === clampByte(b.g) &&
  clampByte(a.b) === clampByte(b.b) &&
  a.a === b.a;

/**
 * Blends `color` toward `toward` in small steps until it clears `target` contrast
 * against `bg`. Steps of 0.04 give a fine ramp; `toward` (black or white) always
 * reaches the target eventually, so the final step is the guaranteed fallback.
 */
const shiftToContrast = (color: Rgb, toward: Rgb, bg: Rgb, target: number): Rgb => {
  if (contrastRatio(color, bg) >= target) return color;
  let result = color;
  for (let t = 0.04; t <= 1; t += 0.04) {
    result = mix(color, toward, t);
    if (contrastRatio(result, bg) >= target) return result;
  }
  return toward;
};

interface AccentTokens {
  readonly accent: string;
  readonly strong: string;
  readonly soft: string;
  readonly ink: string;
}

/**
 * The four accent tokens for one surface, derived from an RGB accent.
 *
 * `strong` carries the ink colour, so it is shifted (down toward black on white,
 * up toward white on the dark surface) until that ink clears AA. `soft` is a heavy
 * tint of the accent that stays a background for body ink, and `ink` is the colour
 * that sits on `strong`.
 */
const lightTokens = (accent: Rgb): AccentTokens => ({
  accent: toHex(accent),
  strong: toHex(shiftToContrast(accent, BLACK, WHITE, AA_TEXT)),
  soft: toHex(mix(accent, WHITE, 0.88)),
  ink: '#ffffff',
});

const darkTokens = (accent: Rgb): AccentTokens => {
  const lifted = shiftToContrast(accent, WHITE, DARK_SURFACE, AA_TEXT);
  return {
    accent: toHex(lifted),
    // In dark mode the ink is the dark surface, so the lifted accent already clears
    // AA against it — strong and accent are one and the same (as in the defaults).
    strong: toHex(lifted),
    soft: toHex(mix(accent, DARK_SURFACE, 0.82)),
    ink: toHex(DARK_SURFACE),
  };
};

/** Best-effort tokens for a `color-mix()`-only accent (oklch/lab, etc.). */
const opaqueTokens = (raw: string, surface: 'light' | 'dark'): AccentTokens =>
  surface === 'light'
    ? {
        accent: raw,
        strong: `color-mix(in oklab, ${raw}, black 30%)`,
        soft: `color-mix(in oklab, ${raw}, white 88%)`,
        ink: '#ffffff',
      }
    : {
        accent: `color-mix(in oklab, ${raw}, white 28%)`,
        strong: `color-mix(in oklab, ${raw}, white 28%)`,
        soft: `color-mix(in oklab, ${raw}, #241b14 82%)`,
        ink: '#241b14',
      };

const declarations = (t: AccentTokens): string =>
  `--chai-accent:${t.accent};--chai-accent-strong:${t.strong};--chai-accent-soft:${t.soft};--chai-accent-ink:${t.ink}`;

/**
 * The CSS to override the accent tokens, or `null` when nothing is needed —
 * i.e. when the accent is the built-in terracotta (index.css already carries the
 * hand-tuned tokens, which beat any derivation), or the value could not be parsed
 * (the build fails on that anyway).
 */
export const accentThemeCss = (accent: string): string | null => {
  const parsed = parseCssColor(accent);

  let light: AccentTokens;
  let dark: AccentTokens;
  if (parsed.kind === 'rgb') {
    if (sameRgb(parsed.rgb, DEFAULT_ACCENT)) return null;
    light = lightTokens(parsed.rgb);
    dark = darkTokens(parsed.rgb);
  } else if (parsed.kind === 'opaque-syntax') {
    const raw = accent.trim();
    light = opaqueTokens(raw, 'light');
    dark = opaqueTokens(raw, 'dark');
  } else {
    return null;
  }

  // Mirror index.css's selectors so a forced [data-theme="dark"] resolves to these
  // by source order (this stylesheet is appended after index.css).
  return [
    `:root{${declarations(light)}}`,
    `@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${declarations(dark)}}}`,
    `:root[data-theme="dark"]{${declarations(dark)}}`,
  ].join('');
};

/** Stamps the mode and injects the accent override. No-op outside the browser. */
export const applyTheme = (theme: ChaiTheme): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  if (theme.mode === 'light' || theme.mode === 'dark') {
    root.dataset.theme = theme.mode;
  } else {
    delete root.dataset.theme;
  }

  const css = accentThemeCss(theme.accent);
  const existing = document.getElementById(ACCENT_STYLE_ID);
  if (css === null) {
    existing?.remove();
    return;
  }
  const style = existing ?? document.createElement('style');
  style.id = ACCENT_STYLE_ID;
  style.textContent = css;
  if (existing === null) document.head.appendChild(style);
};
