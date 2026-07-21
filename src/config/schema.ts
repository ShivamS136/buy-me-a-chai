/**
 * The `chai.config.yaml` schema — the public API of this project (ADR-003, ADR-030).
 *
 * Framework-free by contract (ADR-004): no React, no DOM, no `node:*`. Field
 * `.describe()`s feed `chai.schema.json` (via `pnpm gen:schema`), the creator's
 * editor autocomplete. The values are validated here at build time; the browser
 * receives the result as a plain object, so this schema never ships in the bundle.
 *
 * Every object level is `z.strictObject`, so a typo like `cretor` fails the build
 * instead of silently producing a page the creator cannot debug.
 *
 * Copy exception (ADR-015): these messages are creator-facing build output, not UI
 * copy, so they live here rather than in `src/strings.ts` — that file cannot be
 * imported without dragging UI concerns into the extractable core.
 */

import { z } from 'zod';
import { VPA_REGEX } from '../lib/upi.ts';
import { parseCssColor } from './css-color.ts';

/**
 * Bumped when the schema changes shape. CONFIG.md ties the schema to package
 * semver; a literal makes future `docs/MIGRATIONS.md` codemods detectable.
 */
export const CHAI_CONFIG_SCHEMA_VERSION = 0;

// ── Shared primitives ────────────────────────────────────────────────────────

/** C0 + DEL, but tab/LF/CR allowed — used for multi-line text. */
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
/** C0 + DEL including tab/LF/CR — used for single-line text. */
const CONTROL_CHARS_STRICT = /[\u0000-\u001f\u007f]/;

const issue = (ctx: z.RefinementCtx, message: string): void => {
  ctx.addIssue({ code: 'custom', message });
};

/**
 * Message style, per the CONFIG.md error block: messages are standalone sentences
 * that do NOT repeat the field path — the formatter's path column already carries
 * it. `chai.presets[0].amount → Expected integer ≥ 1, got 0`, never
 * `chai.presets[0].amount → chai.presets[0].amount must be…`.
 *
 * Counts and received values are interpolated because Zod's built-in `.max()` /
 * `.min()` messages are static, which is why these are all hand-rolled.
 */

/**
 * Single-line plain text. Trims first, then measures — the limit is post-trim so
 * trailing spaces never cost a creator characters.
 */
const line = (max: number) =>
  z
    .string()
    .transform((v) => v.trim())
    .superRefine((v, ctx) => {
      if (CONTROL_CHARS_STRICT.test(v)) {
        issue(ctx, 'Contains a line break or control character — keep it on one line.');
        return;
      }
      if (v.length > max) {
        issue(ctx, `Too long: ${v.length} characters — ${max} max. Trim ${v.length - max}.`);
      }
    });

/** Multi-line text (the bio): newlines allowed, script vectors rejected. */
const block = (max: number) =>
  z
    .string()
    .transform((v) => v.trim())
    .superRefine((v, ctx) => {
      if (CONTROL_CHARS.test(v)) {
        issue(ctx, 'Contains a control character — remove it.');
        return;
      }
      if (/<\s*script/i.test(v) || /javascript\s*:/i.test(v)) {
        issue(
          ctx,
          'Contains a script tag or javascript: URL — not allowed (only **bold**, _italics_ and [links](https://…) render).',
        );
        return;
      }
      if (v.length > max) {
        issue(ctx, `Too long: ${v.length} characters — ${max} max. Trim ${v.length - max}.`);
      }
    });

/**
 * A path under `public/`, or an absolute http(s) URL.
 *
 * Must start with `/`: a relative path breaks on a GitHub Pages subpath, which is
 * exactly the deploy target most forks use (hard rule 7). The leading-slash form is
 * stored verbatim and resolved against Vite's `base` at render time.
 */
const assetPath = () =>
  z
    .string()
    .transform((v) => v.trim())
    .superRefine((v, ctx) => {
      if (v.length === 0) {
        issue(ctx, 'Empty — remove the line, or point it at a file in public/.');
        return;
      }
      if (/^data:/i.test(v)) {
        issue(ctx, 'Must not be a data: URI — put the file in public/ instead.');
        return;
      }
      if (/^https?:\/\//i.test(v)) return;
      if (!v.startsWith('/')) {
        issue(
          ctx,
          'Must start with "/" (e.g. "/avatar.png"). Relative paths break on GitHub Pages subpaths.',
        );
        return;
      }
      if (/\s/.test(v)) {
        issue(ctx, 'Contains a space — rename the file without spaces.');
      }
    });

/** http(s) URL. Hand-rolled rather than `z.url()` so the message is ours. */
const httpUrl = () =>
  z
    .string()
    .transform((v) => v.trim())
    .superRefine((v, ctx) => {
      let parsed: URL;
      try {
        parsed = new URL(v);
      } catch {
        issue(ctx, `Not a valid URL: "${v}". Include https:// at the start.`);
        return;
      }
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        issue(ctx, `Must be an http(s) URL, got "${parsed.protocol}//…".`);
      }
    });

/**
 * An integer number of rupees in [min, max].
 *
 * `z.custom` rather than `z.number().int().min().max()` because CONFIG.md's error
 * format requires the received value in the message ("Expected integer ≥ 1, got 0")
 * and Zod's built-in messages are static.
 */
const rupeeInt = (min: number, max: number) =>
  z.custom<number>().superRefine((v, ctx) => {
    if (typeof v !== 'number' || Number.isNaN(v)) {
      issue(ctx, `Expected a number of rupees, got ${JSON.stringify(v) ?? typeof v}.`);
      return;
    }
    if (!Number.isFinite(v)) {
      issue(ctx, `Expected a finite number of rupees, got ${v}.`);
      return;
    }
    if (!Number.isInteger(v)) {
      issue(ctx, `Expected a whole number of rupees, got ${v}.`);
      return;
    }
    if (v < min) {
      issue(ctx, `Expected integer ≥ ${min}, got ${v}.`);
      return;
    }
    if (v > max) {
      issue(ctx, `Expected integer ≤ ${max}, got ${v}.`);
    }
  });

// ── creator ──────────────────────────────────────────────────────────────────

const URL_SCHEME_RE = /^[a-z][a-z0-9+.-]*:\/\//i;
const WWW_PREFIX_RE = /(^|\s)www\./i;
/**
 * A curated TLD allowlist, deliberately NOT a generic `\.[a-z]{2,}`: that would
 * reject real names like "Ram.Kumar", "A.B. Nair" or "St. Louis". We trade a little
 * recall for zero false rejections, because the failure mode here is "creator
 * cannot build their own page".
 */
const NAME_URL_TLDS = [
  'com',
  'net',
  'org',
  'io',
  'in',
  'co',
  'dev',
  'app',
  'me',
  'xyz',
  'shop',
  'site',
  'online',
  'info',
  'biz',
  'tech',
  'store',
  'blog',
  'page',
  'link',
  'gg',
  'ai',
  'sh',
  'to',
  'ly',
  'fyi',
  'cc',
];
const BARE_DOMAIN_RE = new RegExp(
  `(^|\\s)[a-z0-9][a-z0-9-]*\\.(${NAME_URL_TLDS.join('|')})\\b`,
  'i',
);

const looksLikeUrl = (v: string): boolean =>
  URL_SCHEME_RE.test(v) || WWW_PREFIX_RE.test(v) || BARE_DOMAIN_RE.test(v);

const creatorNameSchema = line(50).superRefine((v, ctx) => {
  if (v.length === 0) {
    issue(ctx, 'Required (1–50 characters).');
    return;
  }
  if (looksLikeUrl(v)) {
    issue(
      ctx,
      `Looks like a URL ("${v}"). Use your display name here; links belong in creator.socials.`,
    );
  }
});

/**
 * The VPA. No `.trim()`, no `.toLowerCase()`, ever.
 *
 * A silently "helpful" mutation here is ADR-008's unrecoverable failure: money goes
 * to a stranger. A stray trailing space must fail the build loudly, not be healed.
 * The regex is imported from `src/lib/upi.ts` so there is one definition and one
 * test matrix.
 */
const vpaSchema = z.string().superRefine((v, ctx) => {
  if (VPA_REGEX.test(v)) return;

  const generic = `Invalid UPI ID "${v}". Expected format like name@bank. Double-check in your UPI app → profile.`;
  if (/\s/.test(v)) {
    issue(ctx, `Invalid UPI ID "${v}" (contains space)`);
    return;
  }
  const atCount = v.split('@').length - 1;
  if (atCount === 0) {
    issue(ctx, `Invalid UPI ID "${v}" (missing @). ${generic}`);
    return;
  }
  if (atCount > 1) {
    issue(ctx, `Invalid UPI ID "${v}" (more than one @)`);
    return;
  }
  const handle = v.slice(0, v.indexOf('@'));
  const bank = v.slice(v.indexOf('@') + 1);
  if (handle.length < 2) {
    issue(ctx, `Invalid UPI ID "${v}" (the part before @ is too short — 2 characters minimum)`);
    return;
  }
  if (!/^[a-zA-Z]/.test(bank)) {
    issue(
      ctx,
      `Invalid UPI ID "${v}" (the bank handle must start with a letter, e.g. okaxis, ybl, paytm)`,
    );
    return;
  }
  if (bank.length < 3) {
    issue(ctx, `Invalid UPI ID "${v}" (the bank handle is too short, e.g. okaxis, ybl, paytm)`);
    return;
  }
  issue(ctx, generic);
});

const socialSchema = z.strictObject({
  label: line(24)
    .describe('The platform name, e.g. "GitHub" — also the icon and the link’s accessible name.')
    .superRefine((v, ctx) => {
      if (v.length === 0) issue(ctx, 'Required (e.g. "GitHub").');
    }),
  url: httpUrl().describe('The full https:// URL to your profile on that platform.'),
});

const creatorSchema = z.strictObject({
  name: creatorNameSchema.describe(
    'Your display name — the page heading and the browser title. 1–50 characters.',
  ),
  vpa: vpaSchema.describe(
    'Your UPI ID, like name@okaxis. Copy it from your UPI app — this is where money goes. Never edit it by hand.',
  ),
  tagline: line(120).describe('A one-line tagline shown under your name.').optional(),
  avatar: assetPath()
    .describe('Path to a square avatar in public/, e.g. /avatar.png. Omit for an initials disc.')
    .optional(),
  bio: block(500)
    .describe(
      'A short bio. Supports **bold**, _italics_ and [links](https://…). Up to 500 characters.',
    )
    .optional(),
  // Defaults to [] rather than undefined so Profile.tsx needs no branch.
  socials: z
    .array(socialSchema)
    .max(6, { error: 'More than 6 entries — pick your best 6.' })
    .describe('Up to 6 social links, shown as icons under your name.')
    .default([]),
});

// ── works ────────────────────────────────────────────────────────────────────

const workSchema = z.strictObject({
  title: line(60)
    .describe('The project’s name.')
    .superRefine((v, ctx) => {
      if (v.length === 0) issue(ctx, 'Required.');
    }),
  // block(), not line(): a projects list is where a creator explains what a thing
  // actually is, so line breaks are kept and the cap is long-form (ADR-036).
  description: block(500)
    .describe('What the project is. Line breaks are kept. Up to 500 characters.')
    .optional(),
  url: httpUrl().describe('Where the project lives — repo, site, or write-up.'),
  image: assetPath().describe('Optional thumbnail in public/, e.g. /works/thing.png.').optional(),
});

// ── chai ─────────────────────────────────────────────────────────────────────

/**
 * One preset chip: a named tier at an explicit rupee amount (ADR-035).
 *
 * The label is what the donor reads — "Cutting chai", not "1 ☕" — so it carries
 * the whole invitation. 24 characters is the width a third of the 480px card can
 * hold at two lines before the chips stop looking like peers.
 */
const GRAPHEME_SEGMENTER = new Intl.Segmenter('en', { granularity: 'grapheme' });

/**
 * The chip's decorative glyph — "☕", "☕☕🍟".
 *
 * Counted in **grapheme clusters**, not code points or UTF-16 units: a single
 * visible emoji can be five code points (ZWJ sequences) or two (flags), and a
 * creator counts what they can see. `Intl.Segmenter` is build-time only, like the
 * rest of this file, so nothing here reaches the browser.
 *
 * Purely ornamental: it is `aria-hidden` on the chip and the accessible name comes
 * from `label` + amount, so a screen reader never hears "coffee coffee fries".
 */
const emojiSchema = z
  .string()
  .transform((v) => v.trim())
  .superRefine((v, ctx) => {
    if (v.length === 0) {
      issue(ctx, 'Empty — remove the line, or put an emoji here (e.g. "☕").');
      return;
    }
    if (CONTROL_CHARS_STRICT.test(v)) {
      issue(ctx, 'Contains a line break or control character — remove it.');
      return;
    }
    const glyphs = [...GRAPHEME_SEGMENTER.segment(v)].length;
    if (glyphs > 3) {
      issue(ctx, `Too many glyphs: ${glyphs} — 3 max, so the chip stays a chip.`);
    }
  });

const presetSchema = z.strictObject({
  label: line(24)
    .describe('What the chip says — e.g. “Cutting chai”. Keep it short; it sits above the price.')
    .superRefine((v, ctx) => {
      if (v.length === 0) issue(ctx, 'Required — a chip with no label is a bare number.');
    }),
  amount: rupeeInt(1, 100_000).describe('What this chip pays, in whole rupees (e.g. 20).'),
  emoji: emojiSchema
    .describe(
      'Optional glyph shown above the label — e.g. “☕” or “☕☕🍟”. 3 max, decorative only.',
    )
    .optional(),
});

/**
 * Presets, in order: validate items → uniqueness → length → sort.
 *
 * Sorting before the uniqueness check would hide which entry was authored twice.
 * The comparator is load-bearing: a bare `.sort()` is lexicographic, so [100, 20]
 * would stay [100, 20]. `.transform` only runs when no issue was added, so a
 * failing array is never silently sorted.
 *
 * Uniqueness is by amount, not by label: two chips at ₹50 are the same choice
 * twice however they are named, and a donor cannot tell which one they tapped.
 */
const presetsSchema = z
  .array(presetSchema)
  .superRefine((arr, ctx) => {
    const seen = new Set<number>();
    for (const preset of arr) {
      if (seen.has(preset.amount)) {
        issue(ctx, `Duplicate amount: ₹${preset.amount} appears twice. Presets must be distinct.`);
        break;
      }
      seen.add(preset.amount);
    }
    if (arr.length < 1) {
      issue(ctx, 'Needs at least 1 preset (label + amount).');
    }
    if (arr.length > 4) {
      issue(ctx, `Has ${arr.length} entries — 4 max (the chips stop fitting at 320px).`);
    }
  })
  .transform((arr) => [...arr].sort((a, b) => a.amount - b.amount))
  .default([
    { label: 'Cutting chai', amount: 20, emoji: '☕' },
    { label: 'Chai for me and you', amount: 50, emoji: '☕☕' },
    { label: '2 chai + chips', amount: 100, emoji: '☕☕🍟' },
  ]);

/**
 * The note attached when a donor leaves the message field empty.
 *
 * Trimmed first — the 60-char UPI ceiling is measured post-trim. Empty is a valid
 * value and means `tn` is omitted entirely: we do not substitute an English string,
 * because there is no i18n yet and a wrong-language note is worse than none.
 */
const defaultNoteSchema = z
  .string()
  .transform((v) => v.trim())
  .superRefine((v, ctx) => {
    if (CONTROL_CHARS_STRICT.test(v)) {
      issue(ctx, 'Must be a single line — remove the line break.');
      return;
    }
    // Counted the same way `sanitizeNote` counts at runtime: NFC code points, not
    // UTF-16 units. Measuring differently here would let a note pass the build and
    // then be silently truncated on the payment surface — Devanagari and emoji are
    // exactly where the two measures diverge.
    const length = Array.from(v.normalize('NFC')).length;
    if (length > 60) {
      issue(
        ctx,
        `Too long: ${length} characters after trimming — UPI notes are capped at 60. Trim ${length - 60}.`,
      );
    }
  })
  .default('');

/**
 * Every field defaults, so the whole block is optional — `.prefault({})` rather
 * than `.default({})`, for the same Zod v4 reason as `themeSchema`. A config with
 * nothing but a `creator` is valid and gets the shipped chai tiers.
 */
const chaiSchema = z
  .strictObject({
    presets: presetsSchema.describe(
      'The one-tap chips: 1–4 named tiers, each a label and a rupee amount. Sorted by amount automatically.',
    ),
    allowCustomAmount: z
      .boolean()
      .describe('Show the “enter your own amount” field. Default true.')
      .default(true),
    // A soft UI warning threshold only. It never blocks a donor (P0.3: we warn).
    maxAmountWarning: rupeeInt(1, 10_000_000)
      .describe('Amounts above this show a “double-check” caution — a nudge, never a block.')
      .default(100_000),
    defaultNote: defaultNoteSchema.describe(
      'The payment note used when a donor leaves the message field empty. ≤ 60 characters; plain words are safest.',
    ),
    allowDonorMessage: z
      .boolean()
      .describe('Let donors attach a one-line message to the payment. Default true.')
      .default(true),
  })
  .prefault({});

// ── theme ────────────────────────────────────────────────────────────────────

const accentSchema = z
  .string()
  .transform((v) => v.trim())
  .superRefine((v, ctx) => {
    const parsed = parseCssColor(v);
    if (parsed.kind === 'invalid') {
      issue(ctx, parsed.reason);
    }
  })
  .describe(
    'Your accent colour (hex / rgb() / oklch()). The one palette knob — recolours the CTA, borders and links, never the off-white canvas.',
  )
  .default('#C4622D');

// `.prefault({})`, not `.default({})`: in Zod v4, `.default({})` short-circuits and
// returns the literal `{}` without applying the inner field defaults.
const themeSchema = z
  .strictObject({
    mode: z
      .enum(['light', 'dark', 'auto'])
      .describe('light / dark pin the palette; auto follows the visitor’s OS. Default auto.')
      .default('auto'),
    accent: accentSchema,
  })
  .prefault({});

// ── analytics ────────────────────────────────────────────────────────────────

// No `.default()`: absence is the disabled state, and disabled must mean the object
// is literally `undefined` so the noop adapter is chosen and zero bytes ship.
const analyticsSchema = z
  .strictObject({
    provider: z
      .enum(['posthog'], {
        error: 'Must be "posthog" (the only adapter in v0).',
      })
      .describe('The analytics provider. Only "posthog" in v0.'),
    // May legitimately be undefined: it comes from an unset VITE_POSTHOG_KEY.
    apiKey: z
      .string()
      .describe(
        'Leave this out — the key is injected at build from the VITE_POSTHOG_KEY environment variable, never written here.',
      )
      .optional(),
    host: httpUrl()
      .superRefine((v, ctx) => {
        if (v.startsWith('http://')) {
          issue(ctx, `Must use https://, got "${v}".`);
        }
      })
      .transform((v) => v.replace(/\/+$/, ''))
      .describe(
        'Your PostHog ingestion host. Default is US cloud; use the EU host if you signed up there.',
      )
      .default('https://us.i.posthog.com'),
  })
  .describe('Optional analytics. Omit this whole block to ship zero tracking code (the default).')
  .optional();

// ── meta ─────────────────────────────────────────────────────────────────────

const BCP47_RE = /^[a-z]{2,3}(-[A-Z][a-z]{3})?(-([A-Z]{2}|[0-9]{3}))?$/;

const metaSchema = z
  .strictObject({
    title: line(70)
      .describe('Browser tab and social-card title. Defaults to “Buy {your name} a chai”.')
      .superRefine((v, ctx) => {
        if (v.length === 0) {
          issue(ctx, 'Empty — remove the line to use the default "Buy {name} a chai".');
        }
      })
      .optional(),
    description: line(160)
      .describe('Meta description for search results and social cards.')
      .optional(),
    ogImage: assetPath()
      .describe('Social-share image. Use an absolute https:// URL for reliable crawler previews.')
      .optional(),
    language: z
      .string()
      .transform((v) => v.trim())
      .superRefine((v, ctx) => {
        if (!BCP47_RE.test(v)) {
          issue(ctx, `Must be a BCP-47 tag like "en", "hi", or "en-IN" — got "${v}".`);
        }
      })
      .describe('The page’s BCP-47 language tag (sets <html lang>). Default "en".')
      .default('en'),
  })
  .prefault({});

// ── branding ─────────────────────────────────────────────────────────────────

/**
 * Origin branding (ADR-032) — who made this template, shown in the masthead and
 * footer. Every field DEFAULTS to the maker's own value, so a creator who never
 * touches `branding` inherits it, and a maker who changes their support URL sees it
 * propagate to every fork on the next template update. Overriding a field rebrands
 * that one link.
 *
 * The links themselves live in `Masthead.tsx` / `Footer.tsx`; deleting them is still
 * a source edit, deliberately (ADR-026).
 *
 * This block is where the old `MAKER` / `MAKER_PROJECT` constants went (ADR-027,
 * superseded by ADR-032): the defaults below are the maker's, and a creator
 * rebrands by overriding `branding` in `chai.config.yaml` — never by editing code.
 */
const makerSchema = z
  .strictObject({
    name: line(50)
      .describe('The template author’s display name, shown in the footer “Support …” link.')
      .default('Shivam Sharma'),
    supportUrl: httpUrl()
      .describe('The author’s own support page — Buy Me a Coffee, Ko-fi, GitHub Sponsors, …')
      .default('https://shivams136.github.io/my-chai'),
  })
  .prefault({});

const makerProjectSchema = z
  .strictObject({
    name: line(50)
      .describe('The template repo / package name — the “Powered by …” credit in the footer.')
      .default('buy-me-a-chai'),
    repoUrl: httpUrl()
      .describe('The canonical template repository, linked from the footer credit.')
      .default('https://github.com/shivams136/buy-me-a-chai'),
    templateUrl: httpUrl()
      .describe(
        'GitHub’s “Use this template” URL — where the masthead CTA sends a visitor who wants their own page.',
      )
      .default('https://github.com/shivams136/buy-me-a-chai/generate'),
  })
  .prefault({});

// `.prefault({})`, not `.default({})`: in Zod v4 `.default({})` returns the literal
// `{}` without applying the inner field defaults (same reason as `themeSchema`).
const brandingSchema = z
  .strictObject({
    maker: makerSchema.describe('The template author — their name and support page.'),
    project: makerProjectSchema.describe(
      'The template repository — its name, repo URL and template URL.',
    ),
  })
  .prefault({});

// ── top level ────────────────────────────────────────────────────────────────

/**
 * `meta.title` defaults to `Buy {creator.name} a chai`, which no sub-schema can see.
 * It is applied in a top-level transform after `.strictObject` — the order is forced,
 * since the result of `.transform` has no `.strict()` to call.
 */
export const chaiConfigSchema = z
  .strictObject({
    creator: creatorSchema.describe('Who you are — name, UPI ID, bio, social links.'),
    works: z
      .array(workSchema)
      .max(12, { error: 'More than 12 entries — keep your 12 best.' })
      .describe('Your projects, up to 12. Omit or leave empty to hide the section.')
      .default([]),
    chai: chaiSchema.describe('Pricing and the donor’s amount + message controls.'),
    theme: themeSchema.describe('Palette mode and your accent colour.'),
    analytics: analyticsSchema,
    meta: metaSchema.describe('Page title, description, social card, and language.'),
    branding: brandingSchema.describe(
      'The buy-me-a-chai template’s own links. Defaults to the template author’s; override to make them yours.',
    ),
  })
  .transform((cfg) => ({
    ...cfg,
    meta: { ...cfg.meta, title: cfg.meta.title ?? `Buy ${cfg.creator.name} a chai` },
  }));

// ── types ────────────────────────────────────────────────────────────────────

/** What creators write — defaults optional. */
export type ChaiConfigInput = z.input<typeof chaiConfigSchema>;
/** What components consume — defaults applied, `meta.title` always a string. */
export type ChaiConfig = z.output<typeof chaiConfigSchema>;
export type ChaiCreator = ChaiConfig['creator'];
export type ChaiWork = ChaiConfig['works'][number];
export type ChaiPreset = ChaiConfig['chai']['presets'][number];
export type ChaiSocial = ChaiCreator['socials'][number];
export type ChaiTheme = ChaiConfig['theme'];
export type ChaiAnalytics = NonNullable<ChaiConfig['analytics']>;
export type ChaiBranding = ChaiConfig['branding'];
