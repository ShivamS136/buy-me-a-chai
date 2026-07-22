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
- **The shared-link picture** is already set up — `public/og.png` is what WhatsApp, X, LinkedIn and Slack show when someone shares your page. To use your own, replace that file with a 1200×630 image. Nothing to change in the config, and your version is kept when you pull template updates. The words beside it always say *your* name.

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

Then send the link to yourself on WhatsApp. You should see a picture, your name, and a line about chai. If you get a bare link with no picture, see the troubleshooting table.

## Step 5 — The ₹1 self-test (do not skip)
A typo'd-but-valid UPI ID sends every future donation to a stranger, unrecoverably. So:

1. Open your live page on a phone (or a friend's).
2. Select ₹1 custom amount? Minimum is ₹1 — perfect.
3. Scan the QR **with a different UPI account than the receiving one** (family member's phone works) and pay ₹1.
4. Confirm the money arrived in *your* account.

Green? You're live. Share the link. ☕

## Keeping up with the template (optional)
The template gets improvements — new payment-app fixes, features, dependency bumps. Most creators never need them: a static page that works doesn't rot. But when you *do* want them, you never touch a terminal.

**Do this once:** new repos do not let Actions open pull requests. Go to **Settings → Actions → General → Workflow permissions**, tick **Allow GitHub Actions to create and approve pull requests**, and save. If you skip it the update still works — the run just finishes with a link for you to open the pull request yourself, and it is easy to miss.

1. Your repo → **Actions** tab → **Update from template** (left sidebar) → **Run workflow**.
2. It merges the latest template, **keeps your `chai.config.yaml` and `public/` exactly as they are**, checks the result still builds, and opens a **pull request**.
3. Review the diff, and **Merge** — your page redeploys automatically.

A green tick on the run means the update is *ready*, not that it is live: the update sits on a branch until you merge the pull request. Every run tells you what is left to do in its summary — open **Actions** → the run, and read the box at the top.

**Don't want to review anything?** Tick **Apply straight to main** on the Run workflow form. The update still has to build and pass tests first, but if it does, it goes onto your live page without a pull request and redeploys on its own. Tick it per run — there's no setting that makes it permanent, on purpose. Two things to know before you use it: you won't see the diff, so if you've edited any source file yourself you won't be told it was replaced by the template's version; and if anything blocks the direct push, the run quietly falls back to opening a pull request.

A few things to know:
- It only ever changes template code, never your config or your assets — your UPI ID is safe.
- It always uses the same branch, `template-update`, so update branches never pile up — running it again just updates the same pull request. To delete that branch after you merge, tick **Settings → General → Pull Requests → Automatically delete head branches**.
- If the template changed its own GitHub Actions files, the update **can't** include those — GitHub never lets automation write `.github/workflows/`, no matter what you tick. It gives you two links per file instead: the template's version to copy, and the right editor in your repo to paste it into. To stop doing that by hand, see **`TEMPLATE_PAT`** below.
- If you've edited component source yourself (say, to remove the footer links), those files get the template's version back. That path is for creators who only edit config; if you're editing code, you'll want to resolve those merges yourself.

### Optional: let updates carry workflow files too (`TEMPLATE_PAT`)
Only worth doing if the copy-by-hand step above annoys you. It trades a one-time setup for a token that will eventually expire.

1. [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new) → **Fine-grained token**.
2. **Repository access:** *Only select repositories* → pick your page's repo, and nothing else.
3. **Permissions:** `Contents` → Read and write, `Pull requests` → Read and write, `Workflows` → Read and write. That last one is the whole point; without it the update run stops and tells you so.
4. Set an expiry you'll actually notice, then create the token and copy it.
5. Your repo → **Settings → Secrets and variables → Actions → Secrets → New repository secret**, named exactly `TEMPLATE_PAT`.

From then on updates include workflow files like any other file. The run checks the token before it touches anything: if it has expired or been revoked, you get a warning and the update carries on without it — back to copy-by-hand, never a silent skip. Delete the secret whenever you want to go back.

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

1. **Turn it on.** In `chai.config.yaml`, uncomment the `analytics` block. Your key does *not* go in this file. The `host` line says EU — if you signed up on PostHog's US cloud, change it to `https://us.i.posthog.com`. Get this wrong and PostHog accepts every event and quietly bins it, with nothing to see anywhere.
2. **Add your key.** Go to Settings → Secrets and variables → Actions → **Variables** and add `VITE_POSTHOG_KEY`. Use the key that starts with `phc_`; it can only send events, so it is safe to be public. Then push any commit, so the next build picks it up.
3. **Make the dashboard.** Go to the Actions tab → **Set up PostHog dashboard** → **Run workflow**. Check the region is the one you signed up on (EU is preselected), and run it. It builds a ready-made dashboard — visitors, funnel, popular amounts, pay-method mix — and gives you the link when it finishes.

> Step 3 also needs your **personal** key (it starts with `phx_`), saved once as a repo **Secret** called `POSTHOG_PERSONAL_API_KEY`. If it is missing, the workflow tells you where to add it. Click around your live page first, or the charts will be empty.

Would rather use a terminal, an AI agent, or build the charts yourself? Those are Paths A, B and C in [ANALYTICS.md](./ANALYTICS.md) — all of them make the same dashboard.

**What the numbers mean.** You see visits, chosen amounts, and pay-button clicks — **not payments**. UPI cannot tell your page whether a payment went through, so a "₹500 pay click" means someone started paying, not that money arrived. That same gap is why nobody, including us, can take a cut.

**What is never collected.** No autocapture, no session recording, no heatmaps, no surveys. Just three events with fixed fields, and anything else is dropped before it leaves the browser ([details](./ANALYTICS.md)). Donor messages never leave their UPI app.

## Every secret and variable, in one place
**A working page needs none of these.** Everything that makes the page *yours* lives in `chai.config.yaml`. This list exists so you can look up a name you saw in a workflow or a log without hunting.

They all live in one screen: your repo → **Settings** → **Secrets and variables** → **Actions**, which has two tabs.

- **Variables** are plain text. Anyone who can see your repo's settings can read them back. Fine for things that end up public anyway.
- **Secrets** are write-only: once saved, nobody — including you — can read the value again, and GitHub masks it in logs. Use this tab whenever a value would let someone act *as you*.

If you're ever unsure which tab, use **Secrets**. The cost of over-protecting a value is zero.

| Name | Tab | You need it when | What it does |
|---|---|---|---|
| `VITE_POSTHOG_KEY` | Variables *(or Secrets)* | You turned on analytics | Your PostHog **project** key, the one starting `phc_`. It gets baked into the page, so it is public by design and cannot do anything but send events. Read at **build** time: set it, then push a commit, or the running site won't have it. Either tab works — the workflow checks Variables first. |
| `POSTHOG_PERSONAL_API_KEY` | **Secrets** | You use the "Set up PostHog dashboard" button | Your **personal** key, starting `phx_`. This one can read and change your whole PostHog account, so it is a secret and never anything else. Used only by that button, never by your page. |
| `POSTHOG_PROJECT_ID` | Variables | Optional, same button | Saves you typing the project number on every run. You can type it into the form instead. |
| `CHAI_BASE_PATH` | Variables | You use a custom domain | Set it to `/`. Without it the build prefixes every file with your repo name and a custom domain serves a blank page. |
| `CHAI_ALLOW_PLACEHOLDER` | Variables | You want to preview before you have a UPI ID | `1` turns the "you haven't filled in your details" deploy block into a warning. The page then carries a visible demo banner, because a page with the example UPI ID must never look real. Remove it before going live. |
| `TEMPLATE_PAT` | **Secrets** | Optional, for updates | Lets template updates include workflow files. See the section above for exactly which permissions to give it. |

**Set for you — don't create these yourself:** `SITE_URL` (the deploy reads your real site address from GitHub Pages, and it's what makes shared links show a picture — on Vercel or Netlify you *do* set it by hand, to your site's address), `BASE_PATH` (derived from your repo name), `GITHUB_TOKEN` (GitHub's own, per-run and short-lived), and `CHAI_CANONICAL` (only ever set in the template's own repo).

**Running locally?** The same names work as ordinary environment variables in front of a command — `VITE_POSTHOG_KEY=phc_… pnpm dev`. Nothing is required for `pnpm dev` to work.

Two habits worth keeping: never paste any of these into `chai.config.yaml`, an issue, or a pull request — that file is public and stays public; and nothing here is ever your UPI PIN, bank password or OTP. This project has no way to take a payment, so it never has a reason to ask for one.

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
| Deployed, but PostHog shows nothing | Three causes, in order. **1.** The key is a build-time value, so it only applies to builds made *after* you added it — push a commit (or re-run the workflow) once `VITE_POSTHOG_KEY` is set. **2.** Check it starts with `phc_`. **3.** Check `analytics.host` matches your region (EU vs US). A key sent to the wrong region gets a `200 OK` and is then discarded — the page looks fine and the dashboard stays empty forever, so this one never announces itself. |
| Shared link shows no picture | The picture needs a full `https://…` address, which the build only knows on GitHub Pages (it reads it from Pages itself) or when you set a `SITE_URL` environment variable — on Vercel, add `SITE_URL` with your site's address in project settings. Also check `meta.ogImage` is still in your `chai.config.yaml`: if your repo predates this feature, add `ogImage: /og.png` under `meta`. WhatsApp and Facebook cache previews for days, so test with a fresh link (add `?1` to the end) rather than re-sending the old one. |
| "Pay with UPI app" does nothing on my phone | Known GPay/PhonePe limitation for browser payments to personal UPI IDs — not a bug in your page. Donors see the Copy-UPI-ID and QR fallbacks automatically. |
| QR scans but amount is editable/absent in some app | Some apps treat P2P QR amounts as suggestions. Donor can type it; the note still carries through. |

Stuck? [Open an issue](https://github.com/shivams136/buy-me-a-chai/issues) with your Actions log (never post secrets).
