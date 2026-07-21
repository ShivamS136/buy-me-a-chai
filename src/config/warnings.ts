/**
 * WARN-only config rules.
 *
 * These deliberately live outside Zod: Zod has no warn channel, and abusing
 * `superRefine` for advisory rules would fail the build. CONFIG.md is explicit that
 * accent contrast is a warning, not an error — a creator must always be able to
 * ship a page we merely disapprove of.
 *
 * Pure: no I/O, never throws, never mutates.
 */

import { contrastRatio, floorToOneDecimal, parseCssColor, type Rgb } from './css-color.ts';
import type { ChaiConfig } from './schema.ts';

export interface ChaiWarning {
  readonly path: string;
  readonly message: string;
}

/**
 * Surface tokens from docs/DESIGN.md, duplicated here as plain numbers because this
 * check runs in plain Node (the build config check) where no CSS is available to
 * read `--chai-surface` from.
 */
const LIGHT_SURFACE: Rgb = { r: 0xff, g: 0xff, b: 0xff, a: 1 };
const DARK_SURFACE: Rgb = { r: 0x24, g: 0x1b, b: 0x14, a: 1 };

/**
 * 3:1, not 4.5:1 — and the difference is not a relaxation, it is the only
 * satisfiable rule.
 *
 * DESIGN.md pairs `--chai-accent` with a white `--chai-accent-ink` and uses the same
 * accent in both themes, so this token is a *fill* that text sits on, not body text
 * on a surface. WCAG 1.4.11 (non-text contrast) sets that bar at 3:1.
 *
 * At 4.5:1 the rule was impossible to satisfy: clearing it against #FFFFFF requires
 * relative luminance ≤ 0.1833, and against #241B14 requires ≥ 0.2294. That band is
 * empty — no RGB colour exists that passes both, so with the default `mode: 'auto'`
 * every config on earth emitted a warning, which trains creators to ignore the
 * warning channel entirely.
 *
 * The 4.5:1 check that genuinely applies — white ink on an accent fill at normal
 * text size, e.g. the "Pay" button — is not warned here at all: `src/lib/theme.ts`
 * *derives* `--chai-accent-strong` to clear 4.5:1 at runtime (ADR-021), so it is
 * guaranteed rather than something a creator could get wrong and need warning about.
 */
const MIN_ACCENT_CONTRAST = 3;

const NOTE_RISKY_CHARS = ['&', '#', '?', '%', '='];

export function collectWarnings(config: ChaiConfig): ChaiWarning[] {
  const warnings: ChaiWarning[] = [];
  const warn = (path: string, message: string): void => {
    warnings.push({ path, message });
  };

  // ── accent contrast (advisory only) ────────────────────────────────────────
  const accent = parseCssColor(config.theme.accent);
  if (accent.kind === 'rgb') {
    const { mode } = config.theme;
    if (mode === 'light' || mode === 'auto') {
      const ratio = contrastRatio(accent.rgb, LIGHT_SURFACE);
      if (ratio < MIN_ACCENT_CONTRAST) {
        warn(
          'theme.accent',
          `Contrast ${floorToOneDecimal(ratio)}:1 against the light surface (#FFFFFF) is below the 3:1 minimum for a UI colour. Buttons and links in this accent will be hard to make out — try a darker shade.`,
        );
      }
    }
    if (mode === 'dark' || mode === 'auto') {
      const ratio = contrastRatio(accent.rgb, DARK_SURFACE);
      if (ratio < MIN_ACCENT_CONTRAST) {
        warn(
          'theme.accent',
          `Contrast ${floorToOneDecimal(ratio)}:1 against the dark surface (#241B14) is below the 3:1 minimum for a UI colour. Try a lighter shade for dark mode.`,
        );
      }
    }
  } else if (accent.kind === 'opaque-syntax') {
    warn(
      'theme.accent',
      `Contrast check skipped — ${accent.fn}() is valid CSS but is not parsed at build time. Verify AA contrast manually (docs/DESIGN.md).`,
    );
  }

  // ── UPI note safety ────────────────────────────────────────────────────────
  const risky = NOTE_RISKY_CHARS.filter((ch) => config.chai.defaultNote.includes(ch));
  if (risky.length > 0) {
    warn(
      'chai.defaultNote',
      `Contains ${risky.map((c) => `"${c}"`).join(', ')} — some UPI apps mangle notes with special characters. Plain words and spaces are safest.`,
    );
  }

  if (!config.chai.allowDonorMessage && config.chai.defaultNote.length === 0) {
    warn(
      'chai.defaultNote',
      'No note will ever be attached to payments (donor messages are off and defaultNote is empty). Set defaultNote so you can tell donations apart in your UPI app.',
    );
  }

  const largestChip = Math.max(...config.chai.presets) * config.chai.basePrice;
  if (largestChip > config.chai.maxAmountWarning) {
    warn(
      'chai',
      `Your largest preset is ₹${largestChip}, above maxAmountWarning ₹${config.chai.maxAmountWarning}. Donors will see the high-amount warning on a default chip.`,
    );
  }

  // ── analytics hygiene ──────────────────────────────────────────────────────
  const { analytics } = config;
  if (analytics && analytics.apiKey !== undefined && !analytics.apiKey.startsWith('phc_')) {
    warn(
      'analytics.apiKey',
      'Doesn\'t look like a PostHog project key (they start with "phc_"). Analytics may silently no-op.',
    );
  }

  // ── remote assets vs the page CSP ──────────────────────────────────────────
  const remoteAssets: ReadonlyArray<readonly [string, string | undefined]> = [
    ['creator.avatar', config.creator.avatar],
    ['meta.ogImage', config.meta.ogImage],
    ...config.works.map(
      (work, i) => [`works[${i}].image`, work.image] as readonly [string, string | undefined],
    ),
  ];
  for (const [path, value] of remoteAssets) {
    if (value !== undefined && /^https?:\/\//i.test(value)) {
      warn(
        path,
        `Remote asset "${value}" loads from a third party, which lets them see your visitors' IP addresses — and it will break outright once the page ships its CSP (default-src 'self', planned). Download it into public/ and reference it as "/file.png".`,
      );
    }
  }

  // ── duplicate socials ──────────────────────────────────────────────────────
  const seenUrls = new Set<string>();
  for (const social of config.creator.socials) {
    const normalized = social.url.replace(/\/+$/, '').toLowerCase();
    if (seenUrls.has(normalized)) {
      warn('creator.socials', `Duplicate link: "${social.url}" appears twice.`);
    }
    seenUrls.add(normalized);
  }

  // ── i18n reservation ───────────────────────────────────────────────────────
  if (config.meta.language !== 'en') {
    warn(
      'meta.language',
      'Only "en" copy ships in v0 — the page text stays English; this only sets <html lang>.',
    );
  }

  return warnings;
}
