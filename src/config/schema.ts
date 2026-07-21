/**
 * The `chai.config.ts` schema — the public API of this project (ADR-003).
 *
 * Framework-free by contract (ADR-004): no React, no DOM, no `node:*`. It runs in
 * the browser bundle and inside a plain Node build check.
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
 * it. `chai.basePrice → Expected integer ≥ 1, got 0`, never
 * `chai.basePrice → chai.basePrice must be…`.
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
  label: line(24).superRefine((v, ctx) => {
    if (v.length === 0) issue(ctx, 'Required (e.g. "GitHub").');
  }),
  url: httpUrl(),
});

const creatorSchema = z.strictObject({
  name: creatorNameSchema,
  vpa: vpaSchema,
  tagline: line(80).optional(),
  avatar: assetPath().optional(),
  bio: block(500).optional(),
  // Defaults to [] rather than undefined so Profile.tsx needs no branch.
  socials: z
    .array(socialSchema)
    .max(6, { error: 'More than 6 entries — pick your best 6.' })
    .default([]),
});

// ── works ────────────────────────────────────────────────────────────────────

const workSchema = z.strictObject({
  title: line(60).superRefine((v, ctx) => {
    if (v.length === 0) issue(ctx, 'Required.');
  }),
  description: line(120).optional(),
  url: httpUrl(),
  image: assetPath().optional(),
});

// ── chai ─────────────────────────────────────────────────────────────────────

/**
 * Presets, in order: validate items → uniqueness → length → sort.
 *
 * Sorting before the uniqueness check would hide which entry was authored twice.
 * The comparator is load-bearing: a bare `.sort()` is lexicographic, so [10,3]
 * would stay [10,3]. `.transform` only runs when no issue was added, so a failing
 * array is never silently sorted.
 */
const presetsSchema = z
  .array(
    z.custom<number>().superRefine((v, ctx) => {
      if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 99) {
        issue(ctx, `Must be a whole number between 1 and 99, got ${JSON.stringify(v)}.`);
      }
    }),
  )
  .superRefine((arr, ctx) => {
    const seen = new Set<number>();
    for (const n of arr) {
      if (seen.has(n)) {
        issue(ctx, `Duplicate amount: ${n} appears twice. Presets must be distinct.`);
        break;
      }
      seen.add(n);
    }
    if (arr.length < 1) {
      issue(ctx, 'Needs at least 1 amount (e.g. [1, 3, 5]).');
    }
    if (arr.length > 4) {
      issue(ctx, `Has ${arr.length} entries — 4 max (the chips stop fitting at 320px).`);
    }
  })
  .transform((arr) => [...arr].sort((a, b) => a - b))
  .default([1, 3, 5]);

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

const chaiSchema = z.strictObject({
  basePrice: rupeeInt(1, 10_000),
  presets: presetsSchema,
  allowCustomAmount: z.boolean().default(true),
  // A soft UI warning threshold only. It never blocks a donor (P0.3: we warn).
  maxAmountWarning: rupeeInt(1, 10_000_000).default(100_000),
  defaultNote: defaultNoteSchema,
  allowDonorMessage: z.boolean().default(true),
});

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
  .default('#C4622D');

// `.prefault({})`, not `.default({})`: in Zod v4, `.default({})` short-circuits and
// returns the literal `{}` without applying the inner field defaults.
const themeSchema = z
  .strictObject({
    mode: z.enum(['light', 'dark', 'auto']).default('auto'),
    accent: accentSchema,
  })
  .prefault({});

// ── analytics ────────────────────────────────────────────────────────────────

// No `.default()`: absence is the disabled state, and disabled must mean the object
// is literally `undefined` so the noop adapter is chosen and zero bytes ship.
const analyticsSchema = z
  .strictObject({
    provider: z.enum(['posthog'], {
      error: 'Must be "posthog" (the only adapter in v0).',
    }),
    // May legitimately be undefined: it comes from an unset VITE_POSTHOG_KEY.
    apiKey: z.string().optional(),
    host: httpUrl()
      .superRefine((v, ctx) => {
        if (v.startsWith('http://')) {
          issue(ctx, `Must use https://, got "${v}".`);
        }
      })
      .transform((v) => v.replace(/\/+$/, ''))
      .default('https://us.i.posthog.com'),
  })
  .optional();

// ── meta ─────────────────────────────────────────────────────────────────────

const BCP47_RE = /^[a-z]{2,3}(-[A-Z][a-z]{3})?(-([A-Z]{2}|[0-9]{3}))?$/;

const metaSchema = z
  .strictObject({
    title: line(70)
      .superRefine((v, ctx) => {
        if (v.length === 0) {
          issue(ctx, 'Empty — remove the line to use the default "Buy {name} a chai".');
        }
      })
      .optional(),
    description: line(160).optional(),
    ogImage: assetPath().optional(),
    language: z
      .string()
      .transform((v) => v.trim())
      .superRefine((v, ctx) => {
        if (!BCP47_RE.test(v)) {
          issue(ctx, `Must be a BCP-47 tag like "en", "hi", or "en-IN" — got "${v}".`);
        }
      })
      .default('en'),
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
    creator: creatorSchema,
    works: z
      .array(workSchema)
      .max(12, { error: 'More than 12 entries — keep your 12 best.' })
      .default([]),
    chai: chaiSchema,
    theme: themeSchema,
    analytics: analyticsSchema,
    meta: metaSchema,
  })
  .transform((cfg) => ({
    ...cfg,
    meta: { ...cfg.meta, title: cfg.meta.title ?? `Buy ${cfg.creator.name} a chai` },
  }));

// ── types & defineConfig ─────────────────────────────────────────────────────

/** What creators write — defaults optional. */
export type ChaiConfigInput = z.input<typeof chaiConfigSchema>;
/** What components consume — defaults applied, `meta.title` always a string. */
export type ChaiConfig = z.output<typeof chaiConfigSchema>;
export type ChaiCreator = ChaiConfig['creator'];
export type ChaiWork = ChaiConfig['works'][number];
export type ChaiSocial = ChaiCreator['socials'][number];
export type ChaiTheme = ChaiConfig['theme'];
export type ChaiAnalytics = NonNullable<ChaiConfig['analytics']>;

/**
 * Identity function. Gives creators autocomplete and inline TS errors in
 * `chai.config.ts`, and deliberately never parses: parsing at module-eval time
 * would throw a raw ZodError stack before `load.ts` could format it into the
 * readable per-field block creators are meant to see.
 *
 * Two error surfaces by design — TS catches shape and typo mistakes in the editor,
 * Zod catches value mistakes at build. Neither can do the other's job.
 */
export function defineConfig<const T extends ChaiConfigInput>(config: T): T {
  return config;
}
