# SETUP.md — Get your chai page live in 15 minutes

No servers, no signups beyond GitHub, no fees. You'll fork this repo, edit one file, and deploy.

## What you need
- A GitHub account
- Your UPI ID (open your UPI app → profile → "UPI ID", looks like `name@okaxis`)
- 15 minutes and ₹1 (for the self-test — you pay yourself)

## Step 1 — Get the code
Click **Use this template → Create a new repository** on [`shivams136/buy-me-a-chai`](https://github.com/shivams136/buy-me-a-chai). Name it anything (`buy-me-a-chai` keeps URLs clean). Public or private both work — Pages on private repos needs GitHub Pro, so public recommended.

## Step 2 — Edit `chai.config.ts`
Open the file in GitHub's web editor (press `.` in your repo for the browser VS Code). Replace the placeholders:

- `creator.vpa` — **your UPI ID.** Copy-paste it from your UPI app; don't type it. This is where money goes. The build rejects malformed IDs but cannot know if a valid-looking ID is *yours* — that's what Step 5 is for.
- `creator.name`, `tagline`, `bio` — who you are, why chai.
- `works` — link your projects (or delete the array to hide the section).
- `chai.basePrice` — price of one chai in ₹ (₹50 is a good default).
- Drop your photo at `public/avatar.png` (square, ≥ 256px) or remove the `avatar` line for an initials avatar.

Commit to `main`. Full field reference: [CONFIG.md](./CONFIG.md).

> The build fails on purpose if you haven't replaced the placeholder UPI ID — you can't accidentally publish the example page.

## Step 3 — Deploy

**GitHub Pages (recommended, zero extra accounts):**
1. Repo **Settings → Pages → Source: GitHub Actions**.
2. The included workflow runs on every push to `main`. First run takes ~2 minutes.
3. Your page: `https://<username>.github.io/<repo-name>/`

**Vercel (alternative):** click the Deploy button in the README, import your repo, keep defaults. You get `https://<project>.vercel.app`.

**Custom domain:** Pages → add a `CNAME` file + DNS `CNAME` record ([GitHub docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)); Vercel → project Settings → Domains.

## Step 4 — Look at it
Open your URL on your phone *and* a desktop. Check: name, avatar, amounts, and that the UPI ID shown next to the QR is **exactly yours**.

## Step 5 — The ₹1 self-test (do not skip)
A typo'd-but-valid UPI ID sends every future donation to a stranger, unrecoverably. So:

1. Open your live page on a phone (or a friend's).
2. Select ₹1 custom amount? Minimum is ₹1 — perfect.
3. Scan the QR **with a different UPI account than the receiving one** (family member's phone works) and pay ₹1.
4. Confirm the money arrived in *your* account.

Green? You're live. Share the link. ☕

## Adding the link to your stuff
- GitHub profile README / repo READMEs: `[☕ Buy me a chai](https://your-page-url)`
- A badge: `![](https://img.shields.io/badge/☕-buy_me_a_chai-C4622D)` linked to your page
- Blog/website button embeds: coming in v1 (`<chai-widget>`), track the [roadmap](./ROADMAP.md).

## Optional: analytics
Want page views and amount-selection counts? Create a free [PostHog](https://posthog.com) account (1M events/month free), then:
1. Add the `analytics` block in `chai.config.ts` (see CONFIG.md).
2. Add your key: repo **Settings → Secrets and variables → Actions → Variables** → `VITE_POSTHOG_KEY` (Pages), or Vercel env var.
3. **Get the ready-made dashboard** — one command creates the full "Chai Analytics ☕" dashboard (visitors, intent funnel, popular amounts, pay-method breakdown) in your PostHog project:
   ```bash
   POSTHOG_PERSONAL_API_KEY=phx_... POSTHOG_PROJECT_ID=12345 node scripts/posthog-dashboard.mjs
   ```
   Details, the manual alternative, and what every chart honestly means: [ANALYTICS.md](./ANALYTICS.md).

Heads-up on what analytics *means* here: you'll see views, chosen amounts, and pay-button clicks — **not completed payments**. UPI P2P has no confirmation callback; a "₹500 pay click" is interest, not income. That missing callback is also exactly why nobody (including us) can charge you a commission.

## Money & tax notes (India)
- Payments are person-to-person UPI transfers straight to your account. No middleman, no settlement delay, no fees.
- Gifts from non-relatives totaling **over ₹50,000 in a financial year are taxable as income** (Sec 56(2)(x)). Below that, generally exempt. Keep your own tally; consult a CA if volumes grow.
- Heavy inbound P2P on a personal account can prompt bank KYC questions. If chai becomes serious income, consider a current account / merchant VPA (that path involves PSPs and fees — outside this project's scope by design).

## Troubleshooting
| Symptom | Fix |
|---|---|
| Build failed on push | Open the Actions log — config errors list the exact field. Usually the VPA or a too-long note. |
| Page is blank on Pages but fine on Vercel | You edited `vite.config.ts` `base` — revert; the workflow sets it automatically. |
| "Pay with UPI app" does nothing on my phone | Known GPay/PhonePe limitation for browser payments to personal UPI IDs — not a bug in your page. Donors see the Copy-UPI-ID and QR fallbacks automatically. |
| QR scans but amount is editable/absent in some app | Some apps treat P2P QR amounts as suggestions. Donor can type it; the note still carries through. |

Stuck? [Open an issue](https://github.com/shivams136/buy-me-a-chai/issues) with your Actions log (never post secrets).
