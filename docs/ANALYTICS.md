# ANALYTICS.md — events, dashboard, and setup

Analytics is **off by default**. When enabled (PostHog adapter, see CONFIG.md), the page emits exactly three events. This doc defines that contract and the ready-made dashboard that visualizes it.

## ⚠️ Read this before reading any chart

**Every number here measures intent, not income.** UPI P2P has no payment callback, so a "pay click" means a donor *started* a payment — the page can never know if it completed. Treat "amount impressions" as interest, like an add-to-cart metric with no checkout data. This is a permanent property of the product (ADR-001/007), not a missing feature.

## Event contract (source of truth: `src/analytics/types.ts`)

| Event | Properties | Fired when |
|---|---|---|
| `page_view` | `source?: string` (PostHog auto-captures device/geo/referrer/`utm_*`) | Page load |
| `amount_selected` | `amount: number`, `preset: boolean` | Donor taps a chip or commits a custom amount (debounced 800ms on typing) |
| `pay_clicked` | `method: 'deeplink' \| 'copy_vpa' \| 'qr_download'`, `amount: number` | Donor takes a payment action. Every value is a real click — there is no `qr_view`, because the QR is always on screen once an amount is payable (ADR-046/047), so a "view" would just be `page_view` under another name |

`source` is present only when the visit arrived with a `?ref=`/`?source=` parameter — the
sanitised hostname of the page that linked here, which is how the template's own branding
links tag clone-driven traffic (ADR-027). It is the same class of data as `$referrer`, never
a donor identifier. Standard `utm_*` parameters need no property of ours: posthog-js reads
them off the URL. Break tile 1 down by `source` to see which deployments send you visitors.

**Never** in any event: donor message content, the creator's VPA (it's in the page anyway, but keep events clean), or any donor identifier beyond PostHog's defaults. Contributions adding properties must update this table + `types.ts` together.

### What the page switches off, and why it matters

The adapter (`src/analytics/posthog.ts`) initialises the SDK with **autocapture, session
recording, heatmaps, dead-click capture, rageclick, exception capture, web vitals, surveys,
web experiments, feature flags and external-script loading all explicitly disabled**, plus a
`before_send` hook that discards any event whose name is not one of the three above.

Session recording is the one to understand: left on, it would replay a donor typing their
message. Autocapture would send the text of whatever they clicked. Neither is a tuning
preference — they are the difference between "optional analytics" and "we watch your
donors", so they are set explicitly rather than left at a default a future SDK release could
flip. Disabling external-script loading means the SDK cannot pull further code from
PostHog's CDN at runtime, so what ships in the bundle is all that ever runs.

Persistence is `localStorage` (rather than the SDK default of localStorage + cookie): the
anonymous id is what makes "unique visitors" and the funnel mean anything, but there is no
reason to attach it to every request as a cookie too. If you need a genuinely
identifier-free page, PostHog has a cookieless mode — it needs enabling in your project
settings *and* in the SDK call, and events are silently dropped if you do only one, so this
project does not turn it on for you. Ask if you want it wired to a config flag.

### Disabled means absent, not idle

With no `analytics` block in `chai.config.yaml` — the default — `dist/` contains no PostHog
code at all, not merely unreached code (ADR-028). You can check your own build:

```bash
pnpm build && grep -rl 'disable_session_recording' dist/   # → no matches
```

CI runs that same grep, and a source-scan test asserts nothing anywhere in `src/` calls
`fetch`, `sendBeacon` or `XMLHttpRequest`.

## The "Chai Analytics" dashboard

Eight tiles, designed around three creator questions: *is anyone visiting? are they interested? where does interest leak?*

| # | Tile | Type | Definition | Honest-metrics note |
|---|---|---|---|---|
| 1 | Visitors | Trend, unique users on `page_view`, daily | Reach | |
| 2 | Page views | Trend, total `page_view`, daily | Volume incl. repeats | |
| 3 | Intent funnel | Funnel: `page_view` → `amount_selected` → `pay_clicked` (7-day window, per user) | The core conversion view | Last step = intent, not payment |
| 4 | Pay clicks by method | Trend (bar), `pay_clicked` broken down by `method` | Tells you if deeplink or copy dominates → informs your CTA placement | High `copy_vpa` share on mobile ≈ deeplinks failing for your donors |
| 5 | Amount interest (₹) | Trend, SUM of `amount` on `pay_clicked`, weekly | "Amount impressions" | **Not revenue.** Compare against your actual UPI statement |
| 6 | Popular amounts | Bar, `amount_selected` broken down by `amount` (top 10) | Tune your `chai.presets` tiers | |
| 7 | Preset vs custom | Pie, `amount_selected` broken down by `preset` | If custom dominates, your presets are wrong | |
| 8 | Device mix | Bar, `page_view` by `$device_type` | Mobile-heavy? Prioritize testing the deeplink/copy flow | |

Tile 3 + 4 together are the debugging view for ADR-006: a funnel that dies between `amount_selected` and `pay_clicked` on mobile usually means the pay zone isn't landing.

## Pick your region once

PostHog runs two clouds, EU and US, and your project lives in exactly one. This project defaults to **EU** everywhere. If you signed up on US cloud, two values change: `analytics.host` in `chai.config.yaml` becomes `https://us.i.posthog.com`, and the dashboard setup below uses `https://us.posthog.com`.

Those are two different hosts and the `.i.` matters. `eu.i.posthog.com` is the **ingestion** host — where your page sends events. `eu.posthog.com` is the **app** host — where the API and your dashboards live.

Get the app host wrong and you get a 401 immediately. Get the ingestion host wrong and **nothing happens**: PostHog answers `200 OK`, your page looks perfectly healthy, the console is clean, and every event is discarded on arrival. Keys are region-siloed and the SDK does no cross-region routing, so there is no symptom to notice and nothing we can detect at build time. It is worth thirty seconds to check which cloud you are on.

## Setup — pick one path

| Path | Needs | Best when |
|---|---|---|
| **D** — GitHub Actions button | A personal API key, stored as a repo secret | You never want a terminal. Click *Run workflow* and you're done — **the creator default** |
| **A** — one-command script | A personal API key | You want it reproducible, from CI or a fresh clone |
| **B** — PostHog MCP | An AI coding agent (Claude Code, Cursor, …) | You already work in an agent and would rather ask for the dashboard in English — and tweak it conversationally afterwards |
| **C** — manual | Nothing | You want to see how each insight is built, or you don't want any key/agent involved |

All four produce the same eight tiles. A, B and D hit the same PostHog API.

### Path D: the GitHub Actions button (no terminal)

Your repo ships a **Set up PostHog dashboard** workflow. Actions tab → pick it → **Run workflow**, check the region, done. The run summary links straight to the finished dashboard.

EU is preselected. If you signed up on US cloud, switch the dropdown — a wrong region here fails loudly with a 401, so you will know.

**One-time:** add your personal API key as a repository **secret** named `POSTHOG_PERSONAL_API_KEY` (Settings → Secrets and variables → Actions → **Secrets**). Create it with **Scoped access** limited to the one project, and only `Dashboard` and `Insight` set to **Write** — those four calls (list/create a dashboard, list/create/update its insights) are the entire blast radius. `Write` covers read, so no separate read scopes are needed. `SETUP.md` walks a creator through the same screen.

It has to be a *secret* — not a variable, which anyone who can see the repo can read, and not a workflow input, since inputs are echoed into the run UI and logs. That is how keys leak. Optionally set a `POSTHOG_PROJECT_ID` repository **variable** so later runs need nothing typed at all.

Same script and same idempotency as Path A: re-running updates the dashboard instead of duplicating it. The job takes `contents: read` and nothing else — it never writes to your repo. Self-hosted PostHog isn't in the region dropdown; use Path A for that.

### Path A: one-command script (terminal / CI)

```bash
POSTHOG_PERSONAL_API_KEY=phx_...  \
POSTHOG_PROJECT_ID=12345          \
POSTHOG_HOST=https://eu.posthog.com \
node scripts/posthog-dashboard.mjs
```

- **Key type matters:** this needs a *personal API key* (PostHog → Settings → Personal API keys) with `dashboard:write` + `insight:write` and nothing else, scoped to the single project — **not** the project key (`phc_...`) used by the page for capturing. Create the key, run the script once, then delete the key if you like; the dashboard persists.
- Project ID: PostHog → Settings → Project → "Project ID", or `GET /api/projects/`.
- Host: `https://eu.posthog.com` (the default) or `https://us.posthog.com` — match where you signed up — or your self-hosted URL. This is the **app** host, which is not the ingestion host your page config uses (`eu.i.posthog.com`, note the `.i.`). Mixing them up is the most common way this script fails, so it checks and tells you.
- **Idempotent:** the script tags the dashboard `buy-me-a-chai`; re-running finds it and updates insights instead of duplicating.
- The script prints the dashboard URL on success. It never touches your page config or capture key.

Security note for the cautious (rightly so): the script is ~200 lines of dependency-free Node in this repo — read it before running. It makes requests only to the host you pass, only to `/api/projects/:id/dashboards*` and `/api/projects/:id/insights*`.

### Path B: PostHog MCP (conversational setup)

If you already use an AI coding agent, PostHog's MCP server lets you create the dashboard by
asking. Useful when you want to adjust tiles afterwards ("break tile 4 down by device too")
without learning the insight builder.

**1. Connect the MCP server** — PostHog's hosted server is at `https://mcp.posthog.com/mcp`.
In Claude Code:

```bash
claude mcp add --transport http posthog https://mcp.posthog.com/mcp
```

Cursor, VS Code, Windsurf, Zed and Claude Desktop all take the same URL in their MCP config.
Authenticate when prompted (OAuth, or a personal API key with `dashboard:write` +
`insight:write` — the same scopes Path A needs). Check PostHog's MCP docs for the current
setup, since this moves faster than this file does.

**2. Point it at the right project.** If you have several, say which one — the server has an
active-project notion and will otherwise use whichever it defaults to. Ask it to list your
projects and pick the one whose capture key you set as `VITE_POSTHOG_KEY` for the page.

**3. Ask for the dashboard.** Paste the tile table from this document into your prompt so the
agent builds the exact contract rather than improvising:

> Create a PostHog dashboard called "Chai Analytics" in project `<your project>`, from the
> tile table in `docs/ANALYTICS.md` of this repo. Use only the events `page_view`,
> `amount_selected` and `pay_clicked`. Do not invent events or properties. Tile 3 is a funnel
> `page_view → amount_selected → pay_clicked` with a 7-day window; tile 5 sums the `amount`
> property on `pay_clicked` and must be labelled as intent, not revenue.

The agent will use `dashboard-create` and `insight-create` (and `read-data-schema` to confirm
your events actually exist) under the hood.

**Caveats, so nothing surprises you:**
- **Send some events first.** The three events only exist in your project once the page has
  fired them. Against an empty project the agent has nothing to verify against and may
  hallucinate property names — deploy, click around, *then* build the dashboard.
- **Not idempotent.** Unlike Path A, asking twice will happily create a second dashboard.
  Check for an existing "Chai Analytics" first, or use Path A if you want a repeatable setup.
- **Write access is real.** The MCP server can create and modify things in your PostHog
  project. Grant it the narrow scopes above rather than a full-access key.
- **Read the result.** Confirm tile 5 is labelled as intent. An agent that quietly names it
  "Revenue" has produced exactly the misreading this whole document exists to prevent.

### Path C: manual (5 minutes, no API key)

PostHog → Dashboards → New dashboard → blank, then add each insight from the table above. Column "Definition" maps 1:1 to PostHog's insight builder (Trends/Funnels, event dropdown, breakdown field). Name the dashboard "Chai Analytics" and pin it.

### Why not a PostHog in-app template?

PostHog's Templates tab ships only templates accepted by the PostHog team, and the dashboard-template API creates templates visible only inside your own project — useless for distribution. The script *is* our template mechanism. (If this project grows, submitting an official template to PostHog's gallery is a good community task — tracked in ROADMAP v2.)

## Verifying events locally

Uncomment the `analytics` block in `chai.config.yaml`, then:

```bash
VITE_POSTHOG_KEY=phc_your_test_key pnpm dev
```

Open the page, click a chip, copy the UPI ID, then PostHog → Activity → live events. You
should see exactly `page_view`, `amount_selected` and `pay_clicked` — nothing else, no
`$autocapture`, no `$pageview`. If you see a fourth event name, `before_send` is not doing
its job and that is a bug worth reporting.

Three things to expect while testing:

- The build prints a warning that it cannot see `VITE_POSTHOG_KEY` — the config check runs
  outside Vite, where `import.meta.env` does not exist. Harmless.
- With analytics enabled the build emits a second `posthog-*.js` chunk. That chunk is the
  point of ADR-028: it exists only in builds that asked for it.
- **Automated browsers see nothing.** posthog-js drops events from clients that report
  `navigator.webdriver` or a headless user agent, so a Playwright/Puppeteer/CDP session
  initialises the SDK, fires no requests, and looks exactly like a broken integration. That
  filter is wanted — it keeps crawlers out of a creator's numbers — so test the event path
  in a normal browser window, and reach for `opt_out_useragent_filter` only as a throwaway
  local experiment.

`src/analytics/contract.test.ts` asserts no out-of-contract `track(` call sites exist.
