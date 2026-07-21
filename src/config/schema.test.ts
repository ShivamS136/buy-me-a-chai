import { describe, expect, it } from 'vitest';
import { readChaiConfigRaw } from '../../scripts/read-config.mts';
import { formatIssues, levenshtein, parseConfig, toConfigIssues } from './load.ts';
import { type ChaiConfigInput, chaiConfigSchema } from './schema.ts';

/**
 * The creator's YAML, read straight off disk — the exact input a fresh fork ships.
 * Loaded through the same `read-config.mts` the build uses, so this test and the
 * build agree on what "the shipped config" is.
 */
const shippedConfig = readChaiConfigRaw();

/**
 * A minimal config that parses — every other case is a mutation of this. `creator`
 * is the only required block: everything else, `chai` included, defaults (ADR-035).
 */
const base = {
  creator: { name: 'Shivam Sharma', vpa: 'shivam@okaxis' },
} satisfies ChaiConfigInput;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test helper builds invalid shapes on purpose
const parse = (raw: unknown) => chaiConfigSchema.safeParse(raw);

const messagesFor = (raw: unknown): string[] => {
  const result = parse(raw);
  if (result.success) throw new Error('expected a validation failure');
  return toConfigIssues(result.error.issues).map((i) => i.message);
};

const pathsFor = (raw: unknown): string[] => {
  const result = parse(raw);
  if (result.success) throw new Error('expected a validation failure');
  return toConfigIssues(result.error.issues).map((i) => i.path);
};

const okOrThrow = (raw: unknown) => {
  const result = parse(raw);
  if (!result.success) {
    throw new Error(
      `expected success, got: ${toConfigIssues(result.error.issues)
        .map((i) => `${i.path}: ${i.message}`)
        .join(' | ')}`,
    );
  }
  return result.data;
};

// ── the shipped example ──────────────────────────────────────────────────────

describe('the shipped chai.config.yaml', () => {
  it('parses successfully — a fork must start from a valid config', () => {
    expect(() => parseConfig(shippedConfig)).not.toThrow();
  });
});

/**
 * Canonical repo only (ADR-037). Everything below describes the *template's own
 * example values* — presets, branding, the placeholder VPA — which a creator is
 * supposed to replace. A creator's repo runs this suite too (`update-template.yml`
 * gates its PR on `pnpm verify`), so asserting them unconditionally failed for every
 * creator who onboarded. CI sets `CHAI_CANONICAL=1` only on the template repo.
 */
describe.skipIf(process.env.CHAI_CANONICAL !== '1')('the template example', () => {
  it('applies every documented default', () => {
    const { config } = parseConfig(shippedConfig);
    expect(config.chai.presets).toEqual([
      { label: 'Cutting chai', amount: 20, emoji: '☕' },
      { label: 'Chai for me and you', amount: 50, emoji: '☕☕' },
      { label: '2 chai + chips', amount: 100, emoji: '☕☕🍟' },
    ]);
    expect(config.chai.allowCustomAmount).toBe(true);
    expect(config.chai.maxAmountWarning).toBe(100_000);
    expect(config.chai.allowDonorMessage).toBe(true);
    expect(config.theme.mode).toBe('auto');
    expect(config.theme.accent).toBe('#C4622D');
    expect(config.meta.language).toBe('en');
    expect(config.analytics).toBeUndefined();
    // Branding defaults to the maker's own values (ADR-032), so a fork that never
    // touches it still credits the template.
    expect(config.branding.maker.name).toBe('Shivam Sharma');
    expect(config.branding.maker.supportUrl).toBe('https://shivams136.github.io/my-chai');
    expect(config.branding.project.name).toBe('buy-me-a-chai');
    expect(config.branding.project.repoUrl).toBe('https://github.com/shivams136/buy-me-a-chai');
    expect(config.branding.project.templateUrl).toBe(
      'https://github.com/shivams136/buy-me-a-chai/generate',
    );
  });

  it('derives meta.title from the creator name', () => {
    const { config } = parseConfig(shippedConfig);
    expect(config.meta.title).toBe('Buy Your Name a chai');
  });

  it('ships a placeholder VPA that is valid in format', () => {
    const { config } = parseConfig(shippedConfig);
    // The deploy guard — not the schema — is what stops this reaching production.
    expect(config.creator.vpa).toBe('yourname@bank');
  });
});

// ── defaults on an omitted nested object ─────────────────────────────────────

describe('nested object defaults', () => {
  it('fills theme entirely when omitted', () => {
    // Locks `.prefault({})`: Zod v4's `.default({})` returns a bare {} here.
    expect(okOrThrow(base).theme).toEqual({ mode: 'auto', accent: '#C4622D' });
  });

  it('fills meta entirely when omitted', () => {
    const config = okOrThrow(base);
    expect(config.meta.language).toBe('en');
    expect(config.meta.title).toBe('Buy Shivam Sharma a chai');
  });

  it('fills the chai block, presets and all, when it is omitted entirely', () => {
    expect(okOrThrow(base).chai.presets.map((p) => p.amount)).toEqual([20, 50, 100]);
    expect(okOrThrow(base).chai.allowCustomAmount).toBe(true);
  });

  it('defaults socials and works to empty arrays, never undefined', () => {
    const config = okOrThrow(base);
    expect(config.creator.socials).toEqual([]);
    expect(config.works).toEqual([]);
  });
});

// ── creator.vpa ──────────────────────────────────────────────────────────────

describe('creator.vpa', () => {
  const withVpa = (vpa: string) => ({ ...base, creator: { ...base.creator, vpa } });

  const valid = ['shivam@okaxis', 'a.b-c_1@ybl', 'SHIVAM@OkAxis', '9876543210@paytm'];
  it.each(valid)('accepts %s', (vpa) => {
    expect(okOrThrow(withVpa(vpa)).creator.vpa).toBe(vpa);
  });

  it('preserves case exactly — never normalises', () => {
    expect(okOrThrow(withVpa('SHIVAM@OkAxis')).creator.vpa).toBe('SHIVAM@OkAxis');
  });

  const invalid: ReadonlyArray<readonly [string, string]> = [
    ['shivam okaxis', 'contains space'],
    ['shivam@okaxis ', 'contains space'],
    [' shivam@okaxis', 'contains space'],
    ['shivamokaxis', 'missing @'],
    ['shivam@@okaxis', 'more than one @'],
    ['s@okaxis', 'too short'],
    ['shivam@1bank', 'must start with a letter'],
    ['shivam@ok', 'bank handle is too short'],
    ['shivam@', 'bank handle must start with a letter'],
    ['@okaxis', 'part before @ is too short'],
    ['shivam@ok-axis', 'Expected format like name@bank'],
  ];

  it.each(invalid)('rejects %s', (vpa, fragment) => {
    expect(messagesFor(withVpa(vpa)).join(' ')).toContain(fragment);
  });

  it('a trailing space fails the build rather than being silently trimmed', () => {
    // ADR-008: a "helpfully" healed VPA is how money reaches a stranger.
    expect(parse(withVpa('shivam@okaxis ')).success).toBe(false);
  });
});

// ── creator.name ─────────────────────────────────────────────────────────────

describe('creator.name', () => {
  const withName = (name: string) => ({ ...base, creator: { ...base.creator, name } });

  const realNames = ['Shivam Sharma', 'Dr. Anand Kumar', 'A.B. Nair', 'Ram.Kumar', 'S. K. Roy'];
  it.each(realNames)('accepts the real name %s', (name) => {
    expect(okOrThrow(withName(name)).creator.name).toBe(name);
  });

  const urls = [
    'https://shivam.dev',
    'shivam.dev',
    'www.shivam.in',
    'buymeachai.in/shivam',
    'upi://pay',
  ];
  it.each(urls)('rejects the URL-like value %s', (name) => {
    expect(messagesFor(withName(name)).join(' ')).toContain('Looks like a URL');
  });

  it('rejects an empty name', () => {
    expect(messagesFor(withName('   ')).join(' ')).toContain('Required');
  });

  it('reports the actual character count when too long', () => {
    expect(messagesFor(withName('A'.repeat(63))).join(' ')).toContain(
      'Too long: 63 characters — 50 max. Trim 13.',
    );
  });

  it('rejects a line break', () => {
    expect(messagesFor(withName('Shivam\nSharma')).join(' ')).toContain('line break');
  });

  it('trims before measuring', () => {
    expect(okOrThrow(withName(`  ${'A'.repeat(50)}  `)).creator.name).toBe('A'.repeat(50));
  });
});

// ── chai ─────────────────────────────────────────────────────────────────────

describe('chai.presets', () => {
  const withPresets = (presets: unknown) => ({ ...base, chai: { presets } });
  const tier = (label: string, amount: number) => ({ label, amount });

  it('keeps the label and amount the creator wrote', () => {
    expect(okOrThrow(withPresets([tier('Cutting chai', 20)])).chai.presets).toEqual([
      { label: 'Cutting chai', amount: 20 },
    ]);
  });

  it('sorts by amount, ascending', () => {
    const presets = okOrThrow(
      withPresets([tier('Big', 100), tier('Small', 20), tier('Middle', 50)]),
    ).chai.presets;
    expect(presets.map((p) => p.label)).toEqual(['Small', 'Middle', 'Big']);
  });

  it('sorts numerically, not lexicographically', () => {
    // A bare .sort() on the amounts would leave [100, 20] untouched.
    const presets = okOrThrow(withPresets([tier('Big', 100), tier('Small', 20)])).chai.presets;
    expect(presets.map((p) => p.amount)).toEqual([20, 100]);
  });

  it('trims the label, so trailing spaces never cost a creator characters', () => {
    expect(okOrThrow(withPresets([tier('  Cutting chai  ', 20)])).chai.presets[0]?.label).toBe(
      'Cutting chai',
    );
  });

  const bad: ReadonlyArray<readonly [string, unknown, string]> = [
    ['duplicate amounts', [tier('A', 50), tier('B', 50)], 'Duplicate amount: ₹50'],
    [
      'too many entries',
      [tier('A', 10), tier('B', 20), tier('C', 30), tier('D', 40), tier('E', 50)],
      'Has 5 entries — 4 max',
    ],
    ['an empty array', [], 'Needs at least 1 preset'],
    ['a bare number', [20], 'Invalid input'],
    ['an empty label', [tier('', 20)], 'Required — a chip with no label'],
    ['a label of only spaces', [tier('   ', 20)], 'Required — a chip with no label'],
    ['an over-long label', [tier('C'.repeat(25), 20)], 'Too long: 25 characters — 24 max'],
    ['a multi-line label', [tier('Cutting\nchai', 20)], 'keep it on one line'],
    ['a missing amount', [{ label: 'Cutting chai' }], 'Expected a number of rupees'],
    ['a zero amount', [tier('Free', 0)], 'Expected integer ≥ 1, got 0'],
    ['a negative amount', [tier('Owed', -5)], 'Expected integer ≥ 1, got -5'],
    ['an amount above the ceiling', [tier('Huge', 200_000)], 'Expected integer ≤ 100000'],
    ['a fractional amount', [tier('Paise', 49.5)], 'whole number of rupees, got 49.5'],
    ['a stringly amount', [tier('Twenty', '20' as unknown as number)], 'Expected a number'],
    ['NaN', [tier('NaN', Number.NaN)], 'Expected a number of rupees'],
    ['Infinity', [tier('Inf', Number.POSITIVE_INFINITY)], 'finite number of rupees'],
    ['a null amount', [tier('Null', null as unknown as number)], 'Expected a number of rupees'],
    ['an unknown key', [{ label: 'Cutting chai', amount: 20, icon: '☕' }], 'Unknown key'],
    ['an empty emoji', [{ ...tier('Cutting chai', 20), emoji: '  ' }], 'Empty — remove the line'],
    [
      'a multi-line emoji',
      [{ ...tier('Cutting chai', 20), emoji: '☕\n☕' }],
      'line break or control character',
    ],
    [
      'more than three glyphs',
      [{ ...tier('Whole shop', 20), emoji: '☕☕☕🍟' }],
      'Too many glyphs: 4 — 3 max',
    ],
  ];

  it.each(bad)('rejects %s', (_label, value, fragment) => {
    expect(messagesFor(withPresets(value)).join(' ')).toContain(fragment);
  });

  it('keeps an emoji, and counts it by grapheme so a ZWJ sequence is one glyph', () => {
    // "👨‍👩‍👧" is five code points but one visible glyph — a code-point cap would
    // reject a chip the creator sees as a single icon.
    const presets = okOrThrow(withPresets([{ ...tier('Family pack', 20), emoji: '☕👨‍👩‍👧🍟' }]))
      .chai.presets;
    expect(presets[0]?.emoji).toBe('☕👨‍👩‍👧🍟');
  });

  it('leaves emoji undefined when the creator omits it', () => {
    expect(okOrThrow(withPresets([tier('Plain', 20)])).chai.presets[0]?.emoji).toBeUndefined();
  });

  it('does not sort an array that failed validation', () => {
    expect(parse(withPresets([tier('A', 50), tier('B', 50)])).success).toBe(false);
  });
});

describe('chai.defaultNote', () => {
  const withNote = (defaultNote: unknown) => ({ ...base, chai: { defaultNote } });

  it('defaults to an empty string, which means tn is omitted', () => {
    expect(okOrThrow(base).chai.defaultNote).toBe('');
  });

  it('accepts exactly 60 characters', () => {
    expect(okOrThrow(withNote('a'.repeat(60))).chai.defaultNote).toBe('a'.repeat(60));
  });

  it('measures after trimming', () => {
    expect(okOrThrow(withNote(`  ${'a'.repeat(60)}  `)).chai.defaultNote).toBe('a'.repeat(60));
  });

  it('rejects 61 characters and reports the overshoot', () => {
    expect(messagesFor(withNote('a'.repeat(61))).join(' ')).toContain(
      'Too long: 61 characters after trimming — UPI notes are capped at 60. Trim 1.',
    );
  });

  it('rejects a line break', () => {
    expect(messagesFor(withNote('a\nb')).join(' ')).toContain('single line');
  });
});

describe('chai booleans', () => {
  it('rejects a non-boolean allowCustomAmount', () => {
    expect(parse({ ...base, chai: { allowCustomAmount: 'yes' } }).success).toBe(false);
  });

  it('rejects a non-boolean allowDonorMessage', () => {
    expect(parse({ ...base, chai: { allowDonorMessage: 1 } }).success).toBe(false);
  });

  it('accepts explicit false', () => {
    const config = okOrThrow({
      ...base,
      chai: { allowCustomAmount: false, allowDonorMessage: false },
    });
    expect(config.chai.allowCustomAmount).toBe(false);
    expect(config.chai.allowDonorMessage).toBe(false);
  });

  it('validates maxAmountWarning as rupees', () => {
    expect(messagesFor({ ...base, chai: { maxAmountWarning: 0 } }).join(' ')).toContain(
      'Expected integer ≥ 1',
    );
  });
});

// ── theme ────────────────────────────────────────────────────────────────────

describe('theme', () => {
  it('accepts every mode', () => {
    for (const mode of ['light', 'dark', 'auto'] as const) {
      expect(okOrThrow({ ...base, theme: { mode } }).theme.mode).toBe(mode);
    }
  });

  it('rejects an unknown mode', () => {
    expect(parse({ ...base, theme: { mode: 'sytem' } }).success).toBe(false);
  });

  const accepted = ['#C4622D', '#fff', 'rgb(196 98 45)', 'oklch(0.7 0.15 40)'];
  it.each(accepted)('accepts the accent %s', (accent) => {
    expect(okOrThrow({ ...base, theme: { accent } }).theme.accent).toBe(accent);
  });

  const rejected: ReadonlyArray<readonly [string, string]> = [
    ['var(--x)', 'cascade'],
    ['transparent', 'invisible'],
    ['#12345', 'hex digits'],
    ['nonsense', 'Named CSS colours'],
  ];
  it.each(rejected)('rejects the accent %s', (accent, fragment) => {
    expect(messagesFor({ ...base, theme: { accent } }).join(' ')).toContain(fragment);
  });

  it('reports a bad accent under the theme.accent path', () => {
    expect(pathsFor({ ...base, theme: { accent: 'nonsense' } })).toContain('theme.accent');
  });
});

// ── analytics ────────────────────────────────────────────────────────────────

describe('analytics', () => {
  it('is undefined when omitted — the disabled default', () => {
    expect(okOrThrow(base).analytics).toBeUndefined();
  });

  it('keeps a real key and applies the default host', () => {
    const { config, warnings } = parseConfig({
      ...base,
      analytics: { provider: 'posthog', apiKey: 'phc_abc123' },
    });
    expect(config.analytics?.apiKey).toBe('phc_abc123');
    expect(config.analytics?.host).toBe('https://us.i.posthog.com');
    // The base config's default accent warns on contrast; nothing should warn
    // about analytics itself when the key is real.
    expect(warnings.filter((w) => w.path.startsWith('analytics'))).toEqual([]);
  });

  it('disables analytics entirely when the key is undefined', () => {
    // Fork safety: no key means the noop adapter and provably zero network calls.
    const { config, warnings } = parseConfig({
      ...base,
      analytics: { provider: 'posthog', apiKey: undefined },
    });
    expect(config.analytics).toBeUndefined();
    expect(warnings.map((w) => w.path)).toContain('analytics');
  });

  it('disables analytics when the key is an empty string', () => {
    const { config } = parseConfig({ ...base, analytics: { provider: 'posthog', apiKey: '   ' } });
    expect(config.analytics).toBeUndefined();
  });

  it('warns about a key that is not a PostHog project key', () => {
    const { warnings } = parseConfig({
      ...base,
      analytics: { provider: 'posthog', apiKey: 'sk_wrong' },
    });
    expect(warnings.map((w) => w.message).join(' ')).toContain('phc_');
  });

  it('rejects an unknown provider', () => {
    expect(parse({ ...base, analytics: { provider: 'mixpanel' } }).success).toBe(false);
  });

  it('rejects a plain-http host', () => {
    expect(
      messagesFor({
        ...base,
        analytics: { provider: 'posthog', host: 'http://ph.example.com' },
      }).join(' '),
    ).toContain('https://');
  });

  it('strips a trailing slash from the host', () => {
    const { config } = parseConfig({
      ...base,
      analytics: { provider: 'posthog', apiKey: 'phc_x', host: 'https://eu.i.posthog.com/' },
    });
    expect(config.analytics?.host).toBe('https://eu.i.posthog.com');
  });
});

// ── meta ─────────────────────────────────────────────────────────────────────

describe('meta', () => {
  it('keeps an explicit title', () => {
    expect(okOrThrow({ ...base, meta: { title: 'Chai for Shivam' } }).meta.title).toBe(
      'Chai for Shivam',
    );
  });

  it('rejects an empty title with advice to remove the line', () => {
    expect(messagesFor({ ...base, meta: { title: '  ' } }).join(' ')).toContain('remove the line');
  });

  it('rejects an over-long title and description', () => {
    expect(messagesFor({ ...base, meta: { title: 'a'.repeat(71) } }).join(' ')).toContain('70 max');
    expect(messagesFor({ ...base, meta: { description: 'a'.repeat(161) } }).join(' ')).toContain(
      '160 max',
    );
  });

  const languages: ReadonlyArray<readonly [string, boolean]> = [
    ['en', true],
    ['hi', true],
    ['en-IN', true],
    ['English', false],
    ['e', false],
  ];
  it.each(languages)('language %s valid=%s', (language, valid) => {
    expect(parse({ ...base, meta: { language } }).success).toBe(valid);
  });

  it('validates ogImage as an asset path', () => {
    expect(messagesFor({ ...base, meta: { ogImage: 'og.png' } }).join(' ')).toContain(
      'Must start with "/"',
    );
  });
});

// ── works & socials ──────────────────────────────────────────────────────────

describe('works', () => {
  const work = { title: 'Tashn', url: 'https://tashn.app' };

  it('accepts a valid entry', () => {
    expect(okOrThrow({ ...base, works: [work] }).works).toHaveLength(1);
  });

  it('accepts a local image path under public/', () => {
    expect(
      okOrThrow({ ...base, works: [{ ...work, image: '/works/tashn.png' }] }).works[0]?.image,
    ).toBe('/works/tashn.png');
  });

  it('rejects more than 12 entries', () => {
    expect(
      messagesFor({ ...base, works: Array.from({ length: 13 }, () => work) }).join(' '),
    ).toContain('12 best');
  });

  const bad: ReadonlyArray<readonly [string, unknown, string]> = [
    ['an empty title', { ...work, title: '  ' }, 'Required.'],
    ['an over-long title', { ...work, title: 'a'.repeat(61) }, '60 max'],
    ['an over-long description', { ...work, description: 'a'.repeat(501) }, '500 max'],
    ['a URL without a scheme', { ...work, url: 'tashn.app' }, 'Include https://'],
    ['a non-http URL', { ...work, url: 'ftp://tashn.app' }, 'http(s) URL'],
    ['a relative image', { ...work, image: 'shot.png' }, 'Must start with "/"'],
    ['a data: URI image', { ...work, image: 'data:image/png;base64,xxx' }, 'data: URI'],
    ['an empty image', { ...work, image: '  ' }, 'Empty'],
    ['an image path with a space', { ...work, image: '/my shot.png' }, 'Contains a space'],
  ];

  it.each(bad)('rejects %s', (_label, value, fragment) => {
    expect(messagesFor({ ...base, works: [value] }).join(' ')).toContain(fragment);
  });

  // `block()`, not `line()` (ADR-036): a projects list is long-form, so a line break
  // is content to preserve rather than a typo to reject.
  it('allows line breaks in a description', () => {
    const { config } = parseConfig({
      ...base,
      works: [{ ...work, description: 'First line.\nSecond line.' }],
    });
    expect(config.works[0]?.description).toBe('First line.\nSecond line.');
  });

  it('allows a remote image (it only warns)', () => {
    const { warnings } = parseConfig({
      ...base,
      works: [{ ...work, image: 'https://cdn.example.com/a.png' }],
    });
    expect(warnings.map((w) => w.message).join(' ')).toContain('CSP');
  });

  it('reports the failing index in the path', () => {
    expect(pathsFor({ ...base, works: [work, { ...work, title: '' }] })).toContain(
      'works[1].title',
    );
  });
});

describe('creator.socials', () => {
  const social = { label: 'GitHub', url: 'https://github.com/x' };

  it('rejects more than 6', () => {
    expect(
      messagesFor({
        ...base,
        creator: { ...base.creator, socials: Array.from({ length: 7 }, () => social) },
      }).join(' '),
    ).toContain('best 6');
  });

  it('rejects an empty label', () => {
    expect(
      messagesFor({
        ...base,
        creator: { ...base.creator, socials: [{ ...social, label: ' ' }] },
      }).join(' '),
    ).toContain('Required');
  });

  it('rejects an over-long label', () => {
    expect(
      messagesFor({
        ...base,
        creator: { ...base.creator, socials: [{ ...social, label: 'a'.repeat(25) }] },
      }).join(' '),
    ).toContain('24 max');
  });

  it('warns about a duplicate link rather than failing', () => {
    const { warnings } = parseConfig({
      ...base,
      creator: {
        ...base.creator,
        socials: [social, { label: 'GH', url: 'https://github.com/x/' }],
      },
    });
    expect(warnings.map((w) => w.message).join(' ')).toContain('Duplicate link');
  });
});

// ── creator optional fields ──────────────────────────────────────────────────

describe('creator optional fields', () => {
  const withCreator = (extra: Record<string, unknown>) => ({
    ...base,
    creator: { ...base.creator, ...extra },
  });

  it('rejects an over-long tagline', () => {
    expect(messagesFor(withCreator({ tagline: 'a'.repeat(121) })).join(' ')).toContain('120 max');
  });

  it('rejects an over-long bio', () => {
    expect(messagesFor(withCreator({ bio: 'a'.repeat(501) })).join(' ')).toContain('500 max');
  });

  it('allows newlines in the bio', () => {
    expect(okOrThrow(withCreator({ bio: 'line one\n\nline two' })).creator.bio).toBe(
      'line one\n\nline two',
    );
  });

  it('rejects a control character in the bio', () => {
    expect(messagesFor(withCreator({ bio: 'a b' })).join(' ')).toContain('control character');
  });

  it('rejects a script tag in the bio', () => {
    expect(messagesFor(withCreator({ bio: '<script>alert(1)</script>' })).join(' ')).toContain(
      'script tag',
    );
  });

  it('rejects a javascript: URL in the bio', () => {
    expect(messagesFor(withCreator({ bio: '[click](javascript:alert(1))' })).join(' ')).toContain(
      'script tag',
    );
  });

  it('accepts a remote avatar but warns about the CSP', () => {
    const { warnings } = parseConfig(withCreator({ avatar: 'https://cdn.example.com/a.png' }));
    expect(warnings.map((w) => w.path)).toContain('creator.avatar');
  });
});

// ── strictness ───────────────────────────────────────────────────────────────

describe('.strict() at every level', () => {
  const cases: ReadonlyArray<readonly [string, unknown]> = [
    ['root', { ...base, cretor: {} }],
    ['creator', { ...base, creator: { ...base.creator, nickname: 'x' } }],
    ['chai', { ...base, chai: { tip: 1 } }],
    ['theme', { ...base, theme: { colour: 'red' } }],
    ['meta', { ...base, meta: { titel: 'x' } }],
    ['analytics', { ...base, analytics: { provider: 'posthog', secret: 'x' } }],
    ['works[0]', { ...base, works: [{ title: 'T', url: 'https://x.com', extra: 1 }] }],
    [
      'socials[0]',
      {
        ...base,
        creator: { ...base.creator, socials: [{ label: 'X', url: 'https://x.com', icon: 'x' }] },
      },
    ],
  ];

  it.each(cases)('rejects an unknown key in %s', (_label, raw) => {
    expect(parse(raw).success).toBe(false);
  });

  it('suggests the intended key for a near-miss typo', () => {
    expect(messagesFor({ ...base, cretor: {} }).join(' ')).toContain('Did you mean "creator"?');
  });

  it('omits a suggestion when nothing is close', () => {
    const messages = messagesFor({ ...base, wombat: 1 }).join(' ');
    expect(messages).toContain('Unknown key "wombat"');
    expect(messages).not.toContain('Did you mean');
  });

  it('reports one line per unknown key', () => {
    expect(pathsFor({ ...base, aaa: 1, bbb: 2 })).toEqual(expect.arrayContaining(['aaa', 'bbb']));
  });
});

// ── error formatting ─────────────────────────────────────────────────────────

describe('formatIssues', () => {
  it('reproduces the CONFIG.md block', () => {
    const formatted = formatIssues(
      [
        { path: 'creator.vpa', message: 'Invalid UPI ID "shivam okaxis" (contains space)' },
        { path: 'chai.basePrice', message: 'Expected integer ≥ 1, got 0' },
      ],
      'error',
    );
    expect(formatted).toBe(
      '✖ chai.config.yaml invalid:\n' +
        '  creator.vpa    → Invalid UPI ID "shivam okaxis" (contains space)\n' +
        '  chai.basePrice → Expected integer ≥ 1, got 0\n',
    );
  });

  it('uses a warning header for warnings', () => {
    expect(formatIssues([{ path: 'theme.accent', message: 'low contrast' }], 'warning')).toContain(
      '⚠ chai.config.yaml warnings:',
    );
  });

  it('handles an empty issue list', () => {
    expect(formatIssues([], 'error')).toBe('✖ chai.config.yaml invalid:\n');
  });

  it('indents continuation lines to the arrow column', () => {
    const formatted = formatIssues([{ path: 'a', message: 'first\nsecond' }], 'error');
    expect(formatted).toContain('\n      second');
  });

  it('does not let one long path push every arrow off-screen', () => {
    const formatted = formatIssues(
      [
        { path: 'a'.repeat(45), message: 'long' },
        { path: 'b', message: 'short' },
      ],
      'error',
    );
    // The pad caps at 30, so the short path is not padded to 45.
    expect(formatted).toContain(`  b${' '.repeat(29)} → short`);
  });

  it('sorts unknown top-level keys first, then by config order', () => {
    const issues = toConfigIssues(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (
        parse({ ...base, zzz: 1, chai: { basePrice: 0 }, theme: { accent: 'nope' } }) as {
          error: { issues: never[] };
        }
      ).error.issues,
    );
    expect(issues[0]?.path).toBe('zzz');
    expect(issues.map((i) => i.path)).toEqual(['zzz', 'chai.basePrice', 'theme.accent']);
  });

  it('deduplicates identical issues', () => {
    expect(
      toConfigIssues([
        { code: 'custom', path: ['a'], message: 'same' },
        { code: 'custom', path: ['a'], message: 'same' },
      ] as never),
    ).toHaveLength(1);
  });

  it('renders an empty path as (root)', () => {
    expect(toConfigIssues([{ code: 'custom', path: [], message: 'bad' }] as never)[0]?.path).toBe(
      '(root)',
    );
  });
});

describe('levenshtein', () => {
  it.each([
    ['creator', 'creator', 0],
    ['cretor', 'creator', 1],
    ['', 'abc', 3],
    ['abc', '', 3],
    ['kitten', 'sitting', 3],
  ])('distance(%s, %s) = %i', (a, b, expected) => {
    expect(levenshtein(a, b)).toBe(expected);
  });
});

// ── parseConfig behaviour ────────────────────────────────────────────────────

describe('parseConfig', () => {
  it('throws a ChaiConfigError carrying structured issues', () => {
    try {
      parseConfig({ ...base, creator: { ...base.creator, vpa: 'nope' } });
      throw new Error('expected a throw');
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      expect(error.name).toBe('ChaiConfigError');
      expect(error.message).toContain('✖ chai.config.yaml invalid:');
    }
  });

  it('never throws for warnings — a warned config still builds', () => {
    // A genuinely washed-out accent: 1.2:1 against the white surface.
    const { warnings } = parseConfig({ ...base, theme: { accent: '#FFE4C4', mode: 'light' } });
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('warns when the largest preset exceeds maxAmountWarning', () => {
    const { warnings } = parseConfig({
      ...base,
      chai: { presets: [{ label: 'Whole tea shop', amount: 5000 }], maxAmountWarning: 1000 },
    });
    expect(warnings.map((w) => w.message).join(' ')).toContain('above maxAmountWarning');
  });

  it('warns about risky characters in the default note', () => {
    const { warnings } = parseConfig({
      ...base,
      chai: { defaultNote: 'Chai & samosa' },
    });
    expect(warnings.map((w) => w.message).join(' ')).toContain('mangle notes');
  });

  it('warns when no note can ever be attached', () => {
    const { warnings } = parseConfig({
      ...base,
      chai: { defaultNote: '', allowDonorMessage: false },
    });
    expect(warnings.map((w) => w.message).join(' ')).toContain('No note will ever be attached');
  });

  it('warns that a modern colour space skipped the contrast check', () => {
    const { warnings } = parseConfig({ ...base, theme: { accent: 'oklch(0.7 0.15 40)' } });
    expect(warnings.map((w) => w.message).join(' ')).toContain('Contrast check skipped');
  });

  it('warns for a non-English language', () => {
    const { warnings } = parseConfig({ ...base, meta: { language: 'hi' } });
    expect(warnings.map((w) => w.path)).toContain('meta.language');
  });

  it('does not warn about the shipped default accent', () => {
    // Regression: the rule used to demand 4.5:1 against BOTH the light (#FFFFFF) and
    // dark (#241B14) surfaces. No RGB colour on earth satisfies both — the luminance
    // bands do not overlap — so every config, including this project's own default,
    // warned on every build. A warning channel that always fires is one creators
    // learn to ignore, which then hides the analytics and note warnings that matter.
    const { warnings } = parseConfig(shippedConfig);
    expect(warnings.filter((w) => w.path === 'theme.accent')).toEqual([]);
  });

  it('still warns about a genuinely unreadable accent', () => {
    const { warnings } = parseConfig({ ...base, theme: { accent: '#FFE4C4', mode: 'light' } });
    expect(warnings.map((w) => w.message).join(' ')).toContain('below the 3:1 minimum');
  });

  it('counts defaultNote in code points, the same unit the URI builder uses', () => {
    // 60 Devanagari code points is 60 characters to a donor and to sanitizeNote.
    const sixtyDevanagari = 'च'.repeat(60);
    expect(
      okOrThrow({ ...base, chai: { defaultNote: sixtyDevanagari } }).chai.defaultNote,
    ).toHaveLength(60);
    expect(parse({ ...base, chai: { defaultNote: 'च'.repeat(61) } }).success).toBe(false);
  });

  it('tells the truth about analytics when it cannot see the environment', () => {
    // A shape-only check (`scripts/check-config.mts`) validates the YAML without
    // injecting the key, so it cannot know whether the real build environment holds
    // one. Claiming "no network calls will be made" from there would be a false
    // privacy statement — hence the deliberately non-committal warning.
    const { warnings } = parseConfig(
      { ...base, analytics: { provider: 'posthog', apiKey: undefined } },
      { envSubstituted: false },
    );
    const message = warnings.find((w) => w.path === 'analytics')?.message ?? '';
    expect(message).toContain('cannot see VITE_POSTHOG_KEY');
    expect(message).not.toContain('no network calls');
  });

  it('produces no warnings for a clean config', () => {
    const { warnings } = parseConfig({
      ...base,
      theme: { accent: '#000000', mode: 'light' },
      chai: { defaultNote: 'Chai for your work' },
    });
    expect(warnings).toEqual([]);
  });
});

// ── branding (ADR-032) ───────────────────────────────────────────────────────

describe('branding', () => {
  it('defaults every field to the maker’s own values when omitted', () => {
    const { branding } = okOrThrow(base);
    expect(branding).toEqual({
      maker: {
        name: 'Shivam Sharma',
        supportUrl: 'https://shivams136.github.io/my-chai',
      },
      project: {
        name: 'buy-me-a-chai',
        repoUrl: 'https://github.com/shivams136/buy-me-a-chai',
        templateUrl: 'https://github.com/shivams136/buy-me-a-chai/generate',
      },
    });
  });

  it('lets a fork override a single field while inheriting the rest', () => {
    const { branding } = okOrThrow({
      ...base,
      branding: { maker: { name: 'Asha', supportUrl: 'https://ko-fi.com/asha' } },
    });
    expect(branding.maker.name).toBe('Asha');
    expect(branding.maker.supportUrl).toBe('https://ko-fi.com/asha');
    // project.* still inherits the maker's defaults.
    expect(branding.project.name).toBe('buy-me-a-chai');
  });

  it('rejects a non-URL support link', () => {
    expect(pathsFor({ ...base, branding: { maker: { supportUrl: 'not a url' } } })).toContain(
      'branding.maker.supportUrl',
    );
  });

  it('rejects an unknown branding key', () => {
    expect(pathsFor({ ...base, branding: { makr: {} } })).toContain('branding.makr');
  });
});
