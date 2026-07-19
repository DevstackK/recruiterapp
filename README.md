# Recruiter Agent

Agentic recruiting workflow: paste a job description, get it parsed into structured requirements,
automatically post a hiring announcement to your own LinkedIn (via Postiz), receive CVs by email or
public upload form, have them parsed and scored against open jobs, and review matches in a dashboard.
Outreach message drafts to *candidates* are generated for you to send yourself — the only thing ever
posted automatically is your own hiring announcement to your own connected LinkedIn account; nothing
ever scrapes LinkedIn, searches for candidates, or messages anyone automatically.

See `.claude`-adjacent plan doc for full architecture rationale. Build order below tracks the phased
milestones; each phase is independently demoable.

## Features

- **JD parsing** — paste text or upload a PDF; Claude extracts title, seniority, skills, and
  splits requirements into must-haves vs. nice-to-haves.
- **Auto-post to LinkedIn** — the moment a job is parsed, a hiring-announcement post (with the
  must-haves and an apply link) is drafted and published to your own connected LinkedIn account
  via Postiz. Never blocks job creation if it fails.
- **Public apply page** — every job gets a shareable link (`/apply/<slug>`) where candidates
  upload a CV (PDF or DOCX), no login required.
- **Email intake** — candidates can also email their CV directly to a per-job address
  (`you+job-<slug>@gmail.com`); the app polls your Gmail and links replies to the right job
  automatically.
- **CV parsing** — native PDF/DOCX extraction into a structured profile (skills, experience,
  education, contact info).
- **AI matching** — scores each CV against a job's requirements (0–100) with a rationale:
  strengths, concerns, and specific must-have gaps — not just a number.
- **Human-in-the-loop review** — every match sits in a pending-review queue until you approve
  or reject it; nothing downstream happens automatically.
- **Autonomous background loop** — a scheduled job (every 15 min via GitHub Actions, or on
  demand) polls Gmail, auto-scores newly parsed CVs, and raises a notification for high-scoring
  matches (≥80) — all without you clicking anything, up to the review gate.
- **Compliant outreach drafts** — for candidates you find manually (e.g. via LinkedIn search),
  the app drafts a personalized outreach message for you to copy and send yourself. Nothing ever
  scrapes profiles, searches LinkedIn, or messages anyone automatically.
- **Notifications** — parse failures, Gmail connection issues, and high-scoring matches all
  surface in one place instead of failing silently.
- **Usage & cost tracking** — every Claude API call is logged with token counts and an
  estimated cost, broken down by purpose (JD parsing, CV parsing, matching, outreach, LinkedIn
  posts).

## How to use it

1. **Sign in** with the recruiter account created during setup.
2. **Post a job** (`Jobs → New job`): paste the JD text or upload a PDF. Claude parses it into
   structured requirements, and (if Postiz is configured) a hiring announcement is posted to
   LinkedIn automatically. You get a public apply link and, if Gmail is connected, an email
   alias — share either (or both) with candidates.
3. **Candidates apply** via the link or by emailing their CV — no action needed from you; CVs
   are parsed automatically as they come in (`Candidates` shows each one's structured profile,
   or an error + "Retry parse" if extraction failed).
4. **Score candidates**: click **Score** next to an applicant on the job page (or wait — the
   scheduled background loop does this automatically for any parsed CV linked to a job).
5. **Review matches** (`Matches`): each pending match shows a score and rationale. Click
   **Approve** or **Reject** — this is the one gate nothing skips.
6. **Source candidates manually** (optional): if you find someone yourself (e.g. searching
   LinkedIn), go to `Outreach → New draft`, fill in what you know about them, and the app
   drafts a message. Copy it and send it yourself through LinkedIn; update its status
   (sent/replied/declined) as things progress.
7. **Check `Notifications`** periodically (or watch for the red banner) for anything that
   needs attention — a parse failure, a Gmail reconnect, or a new high-scoring match.
8. **Check `Usage`** anytime to see how much Claude API usage this month's activity has cost.

## Stack

Next.js 16 (App Router) + TypeScript, Tailwind + shadcn/ui, Supabase (Postgres/Auth/Storage) via Drizzle
ORM, Anthropic Claude API, Gmail API (personal Gmail via OAuth), Vercel hosting, GitHub Actions cron.

## One-time setup

1. **Anthropic API key** — console.anthropic.com. Put it in `.env.local` as `ANTHROPIC_API_KEY`. Never
   commit it or paste it into chat/docs.
2. **Supabase project** — create a project at supabase.com (or use an existing one — see the
   shared-project note below if so).
   - Project Settings → API: copy the URL and anon key into `NEXT_PUBLIC_SUPABASE_URL` /
     `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Project Settings → Database → Connection string: copy the **Transaction pooler** URI (port
     6543) into `DATABASE_URL` — this is what the running app uses, and it's built for many
     short-lived connections. Copy the **Session pooler** URI (port 5432, same host/user/password)
     into `DIRECT_URL` — `drizzle-kit migrate`/`generate` need session-level features (advisory
     locks) that transaction-mode pgbouncer doesn't support. Both need SSL (`ssl=require` if not
     already default). **Using the Session pooler for the app itself will exhaust its connection
     limit under normal dev-server hot-reloading** (`EMAXCONNSESSION` errors) — keep the split.
   - Create a Storage bucket named `documents` (holds both JD files and CVs).
   - Project Settings → API: also copy the **service_role** key into `SUPABASE_SERVICE_ROLE_KEY`
     (server-only — used for Storage uploads; never expose this to the browser).
   - Auth → create the one recruiter user (email/password).
   - Run `npm run db:migrate` to apply the migration in `drizzle/` (all 10 tables) against your
     database.
   - **⚠️ If this Supabase project is shared with another app**: do NOT run `npm run db:push` here.
     `push` introspects the *entire* public schema and will offer to **drop any table not in this
     app's `schema.ts`**, including another app's tables and data. `db:migrate` is safe in a shared
     project (it only ever runs this app's own tracked `CREATE`/`ALTER` statements); `db:push` is
     only safe in a database dedicated solely to this app.
3. **Google Cloud Console** (for Gmail — Phase 5 is now built, this is required to use it):
   - Create a project, enable the Gmail API.
   - OAuth consent screen: External, Testing, add your own Gmail as a test user, scope
     `https://www.googleapis.com/auth/gmail.readonly`.
   - Create an OAuth 2.0 Client ID (Web application) with an **Authorized redirect URI** that
     exactly matches `GOOGLE_OAUTH_REDIRECT_URI` below (e.g. `https://<app>.vercel.app/api/gmail/callback`,
     or `http://localhost:3000/api/gmail/callback` for local testing).
   - Put Client ID/Secret into `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`, and the
     redirect URI into `GOOGLE_OAUTH_REDIRECT_URI`.
   - Generate `GMAIL_TOKEN_ENCRYPTION_KEY` with `openssl rand -base64 32` — this encrypts the
     stored refresh token at rest; losing/rotating it invalidates the stored connection (just
     reconnect via the Settings page).
   - In the app, go to **Settings → Gmail connection** and click **Connect Gmail**, then approve
     access as your own Gmail account. **Check Gmail now** triggers the same poll manually; the
     GitHub Actions cron (below) automates it every 15 minutes.
   - **Routing replies to the right job**: each job's public apply page instructs candidates to
     email their CV to `you+job-<slug>@gmail.com` (a Gmail "plus address" — mail still lands in
     your normal inbox). The poller reads the `To:` header to link the CV to that job
     automatically; if it doesn't match, link it manually from the candidate's page.
   - Testing-mode OAuth consent screens can require re-consent periodically for sensitive scopes.
     If Gmail checks start failing, the Settings page will show a "Reconnect needed" banner —
     just click Connect again.
4. **Postiz** (self-hosted or cloud) — auto-posts a hiring announcement to LinkedIn the moment a
   job is parsed, using Postiz's Public API to post to your own connected LinkedIn account (this is
   not candidate sourcing/messaging -- it's your own content, posted the way you'd post it yourself).
   - Postiz → Settings → Developers → Public API: reveal and copy the API key into `POSTIZ_API_KEY`.
   - Self-hosted base URL is `https://<your-postiz-domain>/api/public/v1`; put it in `POSTIZ_BASE_URL`.
   - Find the LinkedIn integration id: `curl -H "Authorization: <key>" <base-url>/integrations` and
     match the entry with `"identifier": "linkedin"` (personal profile) or `"linkedin-page"` (company
     page) — use its `id` for `POSTIZ_LINKEDIN_INTEGRATION_ID`.
   - Set `NEXT_PUBLIC_APP_URL` to this app's public base URL so the apply link in the post resolves
     (a `localhost` link isn't clickable from LinkedIn).
   - If posting fails for any reason, job creation still succeeds — a `linkedin_post_failed`
     notification is raised instead of blocking you.
5. **Vercel** — connect the repo, set all env vars from `.env.local.example` (generate
   `CRON_SECRET` with `openssl rand -base64 32`), deploy.
6. **GitHub Actions** — the workflow at `.github/workflows/orchestrate.yml` runs the autonomous
   loop (poll Gmail → auto-score newly parsed CVs → notify on high matches) every 15 minutes. Add
   two repo secrets (Settings → Secrets and variables → Actions):
   - `CRON_SECRET` — same value as the Vercel env var
   - `APP_URL` — your deployed app's base URL (e.g. `https://<app>.vercel.app`, no trailing slash)

   It never auto-approves a match or sends outreach — those always require you, in the dashboard.
   Trigger it manually anytime from the Actions tab (`workflow_dispatch`) instead of waiting 15
   minutes.

Copy `.env.local.example` to `.env.local` and fill in values for local development.

## Development

```bash
npm run dev
```

Open http://localhost:3000.

## Database

```bash
npm run db:generate   # generate a migration from schema.ts changes
npm run db:migrate     # apply pending migrations from drizzle/
npm run db:push        # DANGEROUS in a shared database -- see warning above. Only use in a DB dedicated to this app.
npm run db:studio      # browse the database
```
