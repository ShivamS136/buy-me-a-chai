# CONFIG.md — `chai.config.ts` schema

This file is the **public API** of buy-me-a-chai. Creators edit only this (plus assets in `public/`). Breaking changes to this schema require a major version bump and a migration note in the changelog.

## Full annotated example

```ts
import { defineConfig } from './src/config/schema';

export default defineConfig({
  creator: {
    name: 'Shivam Sharma',                    // required, 1–50 chars — also UPI pn param
    vpa: 'shivam@okaxis',                     // required — build fails on invalid format
    tagline: 'Building open-source tools ☕', // optional, ≤ 80 chars
    avatar: '/avatar.png',                    // optional, path under public/; initials disc if absent
    bio: 'Senior dev from Gurugram. I build **MERN** things and write about system design.',
    // optional, ≤ 500 chars, markdown subset: bold, italics, links
    socials: [                                // optional, max 6; icon inferred from domain
      { label: 'GitHub', url: 'https://github.com/shivams136' },
      { label: 'X', url: 'https://x.com/…' },
    ],
  },

  works: [                                    // optional, max 12; section hidden if empty
    {
      title: 'Tashn',                         // required, ≤ 60
      description: 'Workplace foosball tracker', // optional, ≤ 120
      url: 'https://tashn.app',               // required
      image: '/works/tashn.png',              // optional
    },
  ],

  chai: {
    basePrice: 50,                            // required, integer ₹, 1–10000
    presets: [1, 3, 5],                       // optional, 1–4 integers 1–99, default [1,3,5]
    allowCustomAmount: true,                  // default true
    maxAmountWarning: 100000,                 // soft warn threshold, default 100000
    defaultNote: 'Thanks for the great work ☕', // ≤ 60 chars — used when donor leaves message empty
    allowDonorMessage: true,                  // default true
  },

  theme: {
    mode: 'auto',                             // 'light' | 'dark' | 'auto' (default)
    accent: '#C4622D',                        // any valid CSS color; contrast-checked at build (warn)
  },

  analytics: {                                // optional — omit entirely to disable (default)
    provider: 'posthog',
    apiKey: import.meta.env.VITE_POSTHOG_KEY, // env-driven so forks don't inherit keys
    host: 'https://us.i.posthog.com',         // optional, default US cloud
  },

  meta: {
    title: 'Buy Shivam a chai',               // optional, defaults to `Buy {name} a chai`
    description: 'Support my open-source work — 0% commission, direct UPI.',
    ogImage: '/og.png',                       // optional
    language: 'en',                           // reserved for future i18n
  },
});
```

## Validation rules (enforced by Zod at build)

| Field | Rule | On violation |
|---|---|---|
| `creator.vpa` | `/^[a-zA-Z0-9.\-_]{2,49}@[a-zA-Z][a-zA-Z0-9]{2,49}$/`, no spaces | **Build fails** with: `Invalid UPI ID "x". Expected format like name@bank. Double-check in your UPI app → profile.` |
| `creator.name` | 1–50 chars, no URL | Build fails |
| `chai.basePrice` | int, 1–10000 | Build fails |
| `chai.presets` | 1–4 unique ints, 1–99, ascending auto-sort | Build fails |
| `chai.defaultNote` | ≤ 60 chars after trim | Build fails (message shows char count) |
| `theme.accent` | parseable CSS color | Build fails |
| accent contrast vs surface | ≥ 4.5:1 | **Warn only** |
| `analytics.apiKey` empty while provider set | — | Warn + analytics silently disabled (fork-safety) |
| Unknown top-level keys | `.strict()` | Build fails (catches typos like `cretor`) |

Error output format: one line per issue, path-first, actionable — e.g.
```
✖ chai.config.ts invalid:
  creator.vpa       → Invalid UPI ID "shivam okaxis" (contains space)
  chai.basePrice    → Expected integer ≥ 1, got 0
```

## Design rationale

- **TS file, not env vars / JSON:** nested content (works, socials) is miserable in env vars; `.ts` gives autocomplete via `defineConfig`, comments, and `import.meta.env` interop where env vars *do* belong (analytics keys).
- **`.strict()` everywhere:** creators are the users; a silent typo = broken page they can't debug.
- **Env only for secrets-shaped values:** even though PostHog keys are public, the pattern prevents forks shipping the canonical repo's key and teaches good hygiene.
- **`meta.language` reserved:** schema stability > YAGNI here; adding it later would be a breaking change for i18n adopters.

## Versioning

Schema follows the package semver. v0.x may break with changelog notes; from v1.0, breaking schema changes = major bump + codemod-style migration notes in `docs/MIGRATIONS.md`.
