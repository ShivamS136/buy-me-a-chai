# SETUP.md — Get your chai page live in 15 minutes

No servers, no signups beyond GitHub, no fees. You'll fork this repo, edit one file, and deploy.

## What you need
- A GitHub account
- Your UPI ID (open your UPI app → profile → "UPI ID", looks like `name@okaxis`)
- 15 minutes and ₹1 (for the self-test — you pay yourself)

You do **not** need to install anything: GitHub builds and hosts the page for you. Only if you
want to run it on your own machine do you need **Node 24+** and **pnpm 11+** (`nvm use` picks up
the repo's `.nvmrc`), then `pnpm install && pnpm dev`.

## Step 1 — Get the code
Click **Use this template → Create a new repository** on [`shivams136/buy-me-a-chai`](https://github.com/shivams136/buy-me-a-chai). Name it anything (`buy-me-a-chai` keeps URLs clean). Public or private both work — Pages on private repos needs GitHub Pro, so public recommended.

## Step 2 — Edit `chai.config.yaml`
Open the file in GitHub's web editor (press `.` in your repo for the browser VS Code). It's a plain YAML file, and your editor will autocomplete field names and show a description as you type each one — that help comes from `chai.schema.json`, which is already wired up. Replace the placeholders:

- `creator.vpa` — **your UPI ID.** Copy-paste it from your UPI app; don't type it. This is where money goes. The build rejects malformed IDs but cannot know if a valid-looking ID is *yours* — that's what Step 5 is for.
- `creator.name`, `tagline`, `bio` — who you are, why chai.
- `works` — link your projects (or delete the list to hide the section).
- `chai.presets` — your one-tap amounts, up to four. Each has a `label` and an `amount` in ₹, and
  the label is what sells it: "Cutting chai · ₹20" gets tapped far more often than a bare number.
  Each tier also takes an optional `emoji` (up to 3, e.g. `☕☕🍟`) shown above the label — pure
  decoration, so screen readers skip it and a chip without one is perfectly fine.
  The shipped ladder (₹20 / ₹50 / ₹100) is a fine starting point — rename it to your own shop.
- Drop your photo at `public/avatar.png` (square, ≥ 256px) or remove the `avatar` line for an initials avatar.

Commit to `main`. Full field reference: [CONFIG.md](./CONFIG.md).

> The build fails on purpose if you haven't replaced the placeholder UPI ID — you can't accidentally publish the example page.

## Step 3 — Deploy

**GitHub Pages (recommended, zero extra accounts):**
1. Repo **Settings → Pages → Source: GitHub Actions**.
2. The included workflow runs on every push to `main`. First run takes ~2 minutes.
3. Your page: `https://<username>.github.io/<repo-name>/`

**Vercel (alternative):** click the Deploy button in the README, import your repo, keep defaults. You get `https://<project>.vercel.app`.

**Custom domain (Pages):** three things, and the third is the one people miss.
1. Put a `CNAME` file containing your domain in **`public/`** (not the repo root) — Vite copies `public/` into the build verbatim.
2. Add the DNS record ([GitHub docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)).
3. Set repository variable **`CHAI_BASE_PATH`** to `/` — Settings → Secrets and variables → Actions → Variables. A custom domain serves from the root, but the workflow otherwise assumes `https://you.github.io/<repo>/` and prefixes every asset with your repo name. Skip this and you get a blank page with 404s on every file.

On **Vercel**, none of that applies: project Settings → Domains, and the base path stays `/`.

## Step 4 — Look at it
Open your URL on your phone *and* a desktop. Check: name, avatar, amounts, and that the UPI ID shown next to the QR is **exactly yours**.

## Step 5 — The ₹1 self-test (do not skip)
A typo'd-but-valid UPI ID sends every future donation to a stranger, unrecoverably. So:

1. Open your live page on a phone (or a friend's).
2. Select ₹1 custom amount? Minimum is ₹1 — perfect.
3. Scan the QR **with a different UPI account than the receiving one** (family member's phone works) and pay ₹1.
4. Confirm the money arrived in *your* account.

Green? You're live. Share the link. ☕

## Keeping up with the template (optional)
The template gets improvements — new payment-app fixes, features, dependency bumps. Most creators never need them: a static page that works doesn't rot. But when you *do* want them, you never touch a terminal.

**Do this once:** new repos do not let Actions open pull requests. Go to **Settings → Actions → General → Workflow permissions**, tick **Allow GitHub Actions to create and approve pull requests**, and save. If you skip it the update still works — it just gives you a link to open the pull request yourself.

1. Your repo → **Actions** tab → **Update from template** (left sidebar) → **Run workflow**.
2. It merges the latest template, **keeps your `chai.config.yaml` and `public/` exactly as they are**, checks the result still builds, and opens a **pull request**.
3. Review the diff, and **Merge** — your page redeploys automatically.

A few things to know:
- It only ever changes template code, never your config or your assets — your UPI ID is safe.
- It always uses the same branch, `template-update`, so update branches never pile up — running it again just updates the same pull request. To delete that branch after you merge, tick **Settings → General → Pull Requests → Automatically delete head branches**.
- If the template changed its own GitHub Actions files, the PR **can't** include those (GitHub blocks automated edits to workflows); the PR lists them so you can copy them across by hand if you want.
- If you've edited component source yourself (say, to remove the footer links), those files get the template's version back. That path is for creators who only edit config; if you're editing code, you'll want to resolve those merges yourself.

## Optional: the template's own two links (`branding`)
Your page carries two small credits to the project that made it — a **Create your support page**
CTA in the masthead, and **Powered by buy-me-a-chai** / **Support {maker}** in the footer. They are
the only ask of a free, commission-free project, so please keep them if you can.

They are **config, not code**. Everything about them — the maker's name, their support URL, the
repo and template URLs — lives in the commented-out `branding` block at the bottom of
`chai.config.yaml`. Uncomment it and edit to point them at yourself (useful if you are re-templating
this for your own community). Left alone, they inherit the template author's values and stay current
when you pull template updates.

```yaml
branding:
  maker:                              # who wrote the template
    name: Your Name
    supportUrl: https://buymeacoffee.com/your-handle
  project:                            # the template repo itself
    name: my-chai-page
    repoUrl: https://github.com/your-handle/my-chai-page
    templateUrl: https://github.com/your-handle/my-chai-page/generate
```

Removing the links entirely is a source edit, in `Masthead.tsx` / `Footer.tsx` — deliberately not a
config flag (ADR-026, ADR-032). The code is public; that choice is yours to make on purpose.

## Adding the link to your stuff
- GitHub profile README / repo READMEs: `[☕ Buy me a chai](https://your-page-url)`
- A badge: `![](https://img.shields.io/badge/☕-buy_me_a_chai-C4622D)` linked to your page
- Blog/website button embeds: coming in v1 (`<chai-widget>`), track the [roadmap](./ROADMAP.md).

## Optional: analytics
Analytics is **off unless you turn it on**. With no `analytics` block, your page has no tracking code in it at all — it makes no requests and stores nothing in the browser.

Want to see how many people visit and which amounts they pick? Make a free [PostHog](https://posthog.com) account (1M events a month, free), then do these three things — all in your browser:

1. **Turn it on.** In `chai.config.yaml`, uncomment the `analytics` block. Your key does *not* go in this file.
2. **Add your key.** Go to Settings → Secrets and variables → Actions → **Variables** and add `VITE_POSTHOG_KEY`. Use the key that starts with `phc_`; it can only send events, so it is safe to be public. Then push any commit, so the next build picks it up.
3. **Make the dashboard.** Go to the Actions tab → **Set up PostHog dashboard** → **Run workflow**. It builds a ready-made dashboard — visitors, funnel, popular amounts, pay-method mix — and gives you the link when it finishes.

> Step 3 also needs your **personal** key (it starts with `phx_`), saved once as a repo **Secret** called `POSTHOG_PERSONAL_API_KEY`. If it is missing, the workflow tells you where to add it. Click around your live page first, or the charts will be empty.

Would rather use a terminal, an AI agent, or build the charts yourself? Those are Paths A, B and C in [ANALYTICS.md](./ANALYTICS.md) — all of them make the same dashboard.

**What the numbers mean.** You see visits, chosen amounts, and pay-button clicks — **not payments**. UPI cannot tell your page whether a payment went through, so a "₹500 pay click" means someone started paying, not that money arrived. That same gap is why nobody, including us, can take a cut.

**What is never collected.** No autocapture, no session recording, no heatmaps, no surveys. Just three events with fixed fields, and anything else is dropped before it leaves the browser ([details](./ANALYTICS.md)). Donor messages never leave their UPI app.

## Money & tax notes (India)
- Payments are person-to-person UPI transfers straight to your account. No middleman, no settlement delay, no fees.
- Gifts from non-relatives totaling **over ₹50,000 in a financial year are taxable as income** (Sec 56(2)(x)). Below that, generally exempt. Keep your own tally; consult a CA if volumes grow.
- Heavy inbound P2P on a personal account can prompt bank KYC questions. If chai becomes serious income, consider a current account / merchant VPA (that path involves PSPs and fees — outside this project's scope by design).

## Troubleshooting
| Symptom | Fix |
|---|---|
| Build failed on push | Open the Actions log — config errors list the exact field. Usually the VPA or a too-long note. |
| "Refusing to deploy: chai.config.yaml still has the example values" | Working as intended — you haven't replaced `creator.vpa` / `creator.name` yet. Do Step 2, commit, push. To preview the page before you have a UPI ID to hand, set `CHAI_ALLOW_PLACEHOLDER=1`. |
| Page is blank on Pages but fine on Vercel | You edited `vite.config.ts` `base` — revert; the workflow sets it automatically from your repo name. |
| Page is blank on a **custom domain** | Missing step 3 of the custom-domain setup: set the `CHAI_BASE_PATH` repository variable to `/`, then re-run the deploy. |
| Deployed, but PostHog shows nothing | The key is a build-time value, so it only applies to builds made *after* you added it — push a commit (or re-run the workflow) once `VITE_POSTHOG_KEY` is set. Check it starts with `phc_`. |
| "Pay with UPI app" does nothing on my phone | Known GPay/PhonePe limitation for browser payments to personal UPI IDs — not a bug in your page. Donors see the Copy-UPI-ID and QR fallbacks automatically. |
| QR scans but amount is editable/absent in some app | Some apps treat P2P QR amounts as suggestions. Donor can type it; the note still carries through. |

Stuck? [Open an issue](https://github.com/shivams136/buy-me-a-chai/issues) with your Actions log (never post secrets).
