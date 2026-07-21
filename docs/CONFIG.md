# CONFIG.md — `chai.config.yaml` schema

This file is the **public API** of buy-me-a-chai. Creators edit only this (plus assets in `public/`). Breaking changes to this schema require a major version bump and a migration note in the changelog.

The config is **YAML, not code** (ADR-030). Your editor reads `chai.schema.json` — via the `# yaml-language-server: $schema=./chai.schema.json` line at the top of the file — and gives you autocomplete, inline field docs on hover, and a red underline on a mistyped key, in VS Code *and* in GitHub's web editor. The values are validated with Zod at **build time** by the `chai-config` Vite plugin and handed to the page as a plain object, so neither Zod nor a YAML parser ships in the browser bundle. `chai.schema.json` is generated from the Zod schema (`pnpm gen:schema`); CI fails if it drifts.

## Full annotated example

```yaml
# yaml-language-server: $schema=./chai.schema.json

creator:
  name: Shivam Sharma                 # required, 1–50 chars — also the UPI pn param
  vpa: shivam@okaxis                  # required — build fails on invalid format
  tagline: Building open-source tools ☕   # optional, ≤ 120 chars
  avatar: /avatar.png                 # optional, path under public/; initials disc if absent
  bio: >-                             # optional, ≤ 500 chars, markdown subset: bold, italics, links
    Senior dev from Gurugram. I build **MERN** things and write about system design.
  socials:                            # optional, max 6; brand icon inferred from the
    - label: GitHub                   # domain (simple-icons), globe if unmapped
      url: https://github.com/shivams136
    - label: X
      url: https://x.com/…

works:                                # optional, max 12; section hidden if empty
  - title: Tashn                      # required, ≤ 60
    description: Workplace foosball tracker   # optional, ≤ 500, line breaks kept
    url: https://tashn.app            # required
    image: /works/tashn.png           # optional

chai:                                 # the whole block is optional — every field defaults
  presets:                            # optional, 1–4 named tiers, sorted by amount
    - label: Cutting chai             # required, ≤ 24 chars — what the chip says
      amount: 20                      # required, integer ₹, 1–100000
      emoji: ☕                        # optional decoration, ≤ 3 glyphs; omit for text only
    - label: Chai for me and you
      amount: 50
      emoji: ☕☕
    - label: 2 chai + chips
      amount: 100
      emoji: ☕☕🍟
  allowCustomAmount: true             # default true
  maxAmountWarning: 100000            # soft warn threshold, default 100000
  defaultNote: Thanks for the great work ☕   # ≤ 60 chars — used when a donor leaves the message empty
  allowDonorMessage: true             # default true

theme:
  mode: auto                          # light | dark | auto (default). light/dark PIN the
                                      # palette; auto follows the OS
  accent: '#C4622D'                   # hex / rgb() / oklch(); the ONLY palette knob (ADR-025).
                                      # Recolours the CTA, borders, focus rings + accent text —
                                      # never the canvas. Auto-darkened for buttons, lifted for
                                      # dark mode (ADR-021). Contrast-checked at build (warn).
# The background, card surface and ink are brand-locked — the same warm off-white (light) /
# dark brew (dark) on every fork — so the project stays recognisable. Only accent + mode are yours.

meta:
  title: Buy Shivam a chai            # optional, defaults to `Buy {name} a chai`
  description: Support my open-source work — 0% commission, direct UPI.
  ogImage: /og.png                    # optional; use an absolute https:// URL for reliable
                                      # social cards (crawlers need one)
  language: en                        # reserved for future i18n

# analytics:                          # optional — omit entirely to disable (the default).
#   provider: posthog                 # The API key is NOT written here: it is injected at build
#   host: https://us.i.posthog.com    # from the VITE_POSTHOG_KEY environment variable (ADR-030).

# branding:                           # optional — the template's own two links. Defaults to the
#   maker:                            # template author's, and updates to theirs on a template pull.
#     name: Your Name                 # Override to make them yours; no code change needed. (ADR-032)
#     supportUrl: https://buymeacoffee.com/your-handle
#   project:
#     name: my-chai-page
#     repoUrl: https://github.com/your-handle/my-chai-page
#     templateUrl: https://github.com/your-handle/my-chai-page/generate
```

## Validation rules (enforced by Zod at build)

| Field | Rule | On violation |
|---|---|---|
| `creator.vpa` | `/^[a-zA-Z0-9.\-_]{2,49}@[a-zA-Z][a-zA-Z0-9]{2,49}$/`, no spaces | **Build fails** with: `Invalid UPI ID "x". Expected format like name@bank. Double-check in your UPI app → profile.` |
| `creator.name` | 1–50 chars, no URL | Build fails |
| `chai.presets` | 1–4 tiers, each `label` (1–24 chars) + `amount` (int ₹, 1–100000) + optional `emoji` (≤ 3 grapheme clusters, decorative — `aria-hidden`); amounts unique, sorted ascending automatically | Build fails |
| `chai.defaultNote` | ≤ 60 code points after trim (same unit the URI builder truncates on) | Build fails (message shows char count) |
| `theme.accent` | hex (3/4/6/8), `rgb()`/`rgba()`, or a modern colour function (`oklch()`, `lab()`, …) which is accepted but not contrast-checked. Named colours (`teal`) are **not** supported — use a hex value | Build fails |
| accent contrast vs surface | ≥ 3:1 (WCAG 1.4.11 non-text — the accent is a fill, not body text) | **Warn only** |
| `theme.mode` | `light` \| `dark` \| `auto` (default). `light`/`dark` pin the palette via `data-theme`; the accent is derived into contrast-safe `-strong`/`-soft` tokens per surface (ADR-021) | Build fails on any other value |
| core palette (bg / surface / ink) | Brand-locked — not configurable. Only `theme.accent` recolours the page, and never the canvas (ADR-025) | n/a (no such key) |
| `analytics.apiKey` | Never written in the config — injected at build from `VITE_POSTHOG_KEY` (ADR-030). Empty/unset while a provider is set | Warn + analytics silently disabled (fork-safety) |
| `analytics` block absent (the default) | — | No adapter, no requests, and **no PostHog code in the build at all** — the chunk is tree-shaken out (ADR-028) |
| `branding` | Optional; every field defaults to the maker's value (ADR-032). Overriding rebrands that link. Unknown sub-keys rejected | Build fails on a bad URL or unknown key |
| Unknown top-level keys | `.strict()` (spelled `z.strictObject` in Zod v4) | Build fails, with a did-you-mean suggestion (catches typos like `cretor`) |
| largest `chai.presets[].amount` | > `maxAmountWarning` | Warn only |
| Amount passed to the URI builder | whole rupees, ₹1 – ₹1,00,00,000 | Rejected by `buildUpiUri` (ADR-011). The ₹1 crore ceiling is a numeric-integrity guard, not policy: above it `toFixed(2)` goes exponential |

Error output format: one line per issue, path-first, actionable — e.g.
```
✖ chai.config.yaml invalid:
  creator.vpa            → Invalid UPI ID "shivam okaxis" (contains space)
  chai.presets[0].amount → Expected integer ≥ 1, got 0.
```
Messages never repeat the field path — the path column carries it. Issues are sorted
deterministically (unknown top-level keys first, since a typo'd key explains everything
below it), deduplicated, and the arrow column is aligned to the longest path up to 30 chars.

Warnings use the same shape with a `⚠ chai.config.yaml warnings:` header and never fail the build.

### Where validation runs

| Surface | What it does |
|---|---|
| Your editor | `chai.schema.json` (via the `$schema` comment) gives autocomplete, hover docs, and typo underlines — no TypeScript, so it works in the browser editor too |
| `pnpm build` | The `chai-config-validator` Vite plugin parses the YAML in `buildStart` and fails the build |
| `pnpm check:config` | Dedicated CI step whose output is *only* the config error — no bundler stack around it |
| `pnpm dev` | The `chai-config` plugin's `load` hook throws on an invalid config; the formatted block renders in Vite's error overlay |
| `pnpm build:deploy` | Additionally refuses to deploy an unedited placeholder config (ADR-013) |

The JSON Schema and Zod are two error surfaces by design: the schema can't express "matches
the VPA regex" (that's Zod, at build), and Zod can't autocomplete (that's the schema, in your
editor). See ADR-016, ADR-030.

## Design rationale

- **YAML, validated at build (ADR-030):** the creator and the template stop sharing a code file, so a template update is conflict-free by construction; and validating in the Vite plugin keeps Zod and the YAML parser out of the browser bundle. The `$schema` comment gives editor help without TypeScript — better than `defineConfig` for a non-developer editing in the browser.
- **`.strict()` everywhere:** creators are the users; a silent typo = broken page they can't debug.
- **The analytics key is injected, never written:** it comes from the `VITE_POSTHOG_KEY` environment variable at build (public by nature, but env-driven so forks don't inherit the canonical key). There is no key line in the config to get wrong.
- **Presence of the `analytics` block is a build-time signal, not just a runtime one:** it is read straight off the raw YAML to decide whether the PostHog chunk is emitted at all. That is why commenting the block out is meaningfully different from leaving it in place with no key — the first ships nothing, the second ships a chunk that never runs (ADR-028).
- **`branding` defaults to the maker's (ADR-032):** so a fork inherits the template credit, and a maker changing their support URL propagates to forks on the next update. Overriding is a config edit; removing the links is a source edit, deliberately.
- **`meta.language` reserved:** schema stability > YAGNI here; adding it later would be a breaking change for i18n adopters.

## Versioning

Schema follows the package semver. v0.x may break with changelog notes; from v1.0, breaking schema changes = major bump + codemod-style migration notes in `docs/MIGRATIONS.md`.
