# ANALYTICS.md — events, dashboard, and setup

Analytics is **off by default**. When enabled (PostHog adapter, see CONFIG.md), the page emits exactly three events. This doc defines that contract and the ready-made dashboard that visualizes it.

## ⚠️ Read this before reading any chart

**Every number here measures intent, not income.** UPI P2P has no payment callback, so a "pay click" means a donor *started* a payment — the page can never know if it completed. Treat "amount impressions" as interest, like an add-to-cart metric with no checkout data. This is a permanent property of the product (ADR-001/007), not a missing feature.

## Event contract (source of truth: `src/analytics/types.ts`)

| Event | Properties | Fired when |
|---|---|---|
| `page_view` | — (PostHog auto-captures device/geo/referrer) | Page load |
| `amount_selected` | `amount: number`, `preset: boolean` | Donor taps a chip or commits a custom amount (debounced 800ms on typing) |
| `pay_clicked` | `method: 'deeplink' \| 'copy_vpa' \| 'qr_view' \| 'qr_download'`, `amount: number` | Donor takes a payment action. `qr_view` fires once per session when the QR becomes visible on mobile (desktop QR is always visible ⇒ no `qr_view` on desktop) |

**Never** in any event: donor message content, the creator's VPA (it's in the page anyway, but keep events clean), or any donor identifier beyond PostHog's defaults. Contributions adding properties must update this table + `types.ts` together.

## The "Chai Analytics" dashboard

Eight tiles, designed around three creator questions: *is anyone visiting? are they interested? where does interest leak?*

| # | Tile | Type | Definition | Honest-metrics note |
|---|---|---|---|---|
| 1 | Visitors | Trend, unique users on `page_view`, daily | Reach | |
| 2 | Page views | Trend, total `page_view`, daily | Volume incl. repeats | |
| 3 | Intent funnel | Funnel: `page_view` → `amount_selected` → `pay_clicked` (7-day window, per user) | The core conversion view | Last step = intent, not payment |
| 4 | Pay clicks by method | Trend (bar), `pay_clicked` broken down by `method` | Tells you if deeplink or copy dominates → informs your CTA placement | High `copy_vpa` share on mobile ≈ deeplinks failing for your donors |
| 5 | Amount interest (₹) | Trend, SUM of `amount` on `pay_clicked`, weekly | "Amount impressions" | **Not revenue.** Compare against your actual UPI statement |
| 6 | Popular amounts | Bar, `amount_selected` broken down by `amount` (top 10) | Tune your `basePrice`/presets | |
| 7 | Preset vs custom | Pie, `amount_selected` broken down by `preset` | If custom dominates, your presets are wrong | |
| 8 | Device mix | Bar, `page_view` by `$device_type` | Mobile-heavy? Prioritize testing the deeplink/copy flow | |

Tile 3 + 4 together are the debugging view for ADR-006: a funnel that dies between `amount_selected` and `pay_clicked` on mobile usually means the pay zone isn't landing.

## Setup — pick one path

| Path | Needs | Best when |
|---|---|---|
| **A** — one-command script | A personal API key | You want it done in one command, reproducibly, in CI or a fresh clone |
| **B** — PostHog MCP | An AI coding agent (Claude Code, Cursor, …) | You already work in an agent and would rather ask for the dashboard in English — and tweak it conversationally afterwards |
| **C** — manual | Nothing | You want to see how each insight is built, or you don't want any key/agent involved |

All three produce the same eight tiles. A and B both hit the same PostHog API.

### Path A: one-command script (recommended)

```bash
POSTHOG_PERSONAL_API_KEY=phx_...  \
POSTHOG_PROJECT_ID=12345          \
POSTHOG_HOST=https://us.posthog.com \
node scripts/posthog-dashboard.mjs
```

- **Key type matters:** this needs a *personal API key* (PostHog → Settings → Personal API keys) with `dashboard:write` + `insight:write` scopes — **not** the project key (`phc_...`) used by the page for capturing. Create the key, run the script once, then delete the key if you like; the dashboard persists.
- Project ID: PostHog → Settings → Project → "Project ID", or `GET /api/projects/`.
- Host: `https://us.posthog.com` or `https://eu.posthog.com` (match where you signed up), or your self-hosted URL. Note the *app* host for the API may differ from the ingestion host in your page config (`us.i.posthog.com`) — the script validates and hints.
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
projects and pick the one whose capture key is in your `chai.config.ts`.

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

`pnpm dev`, enable analytics with a test project key, open the page, click around, then PostHog → Activity → live events. You should see the three event names and nothing else. The CI grep-test asserts no other `track(` call sites exist.
