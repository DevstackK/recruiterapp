# Recruiter Agent

Agentic recruiting workflow: paste a job description, get it parsed into structured requirements,
receive CVs by email or public upload form, have them parsed and scored against open jobs, and review
matches in a dashboard. Outreach message drafts are generated for you to send yourself — nothing is ever
sent automatically to LinkedIn or any other platform.

See `.claude`-adjacent plan doc for full architecture rationale. Build order below tracks the phased
milestones; each phase is independently demoable.

## Stack

Next.js 16 (App Router) + TypeScript, Tailwind + shadcn/ui, Supabase (Postgres/Auth/Storage) via Drizzle
ORM, Anthropic Claude API, Gmail API (personal Gmail via OAuth), Vercel hosting, GitHub Actions cron.

## One-time setup

1. **Anthropic API key** — console.anthropic.com. Put it in `.env.local` as `ANTHROPIC_API_KEY`. Never
   commit it or paste it into chat/docs.
2. **Supabase project** — create a project at supabase.com.
   - Project Settings → API: copy the URL and anon key into `NEXT_PUBLIC_SUPABASE_URL` /
     `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Project Settings → Database → Connection string (use the pooler/"Transaction" URI) into
     `DATABASE_URL`.
   - Create a Storage bucket named `documents` (holds both JD files and CVs).
   - Project Settings → API: also copy the **service_role** key into `SUPABASE_SERVICE_ROLE_KEY`
     (server-only — used for Storage uploads; never expose this to the browser).
   - Auth → create the one recruiter user (email/password).
   - Run `npm run db:push` to create tables from `src/lib/db/schema.ts`.
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
4. **Vercel** — connect the repo, set all env vars from `.env.local.example` (generate
   `CRON_SECRET` with `openssl rand -base64 32`), deploy.
5. **GitHub Actions** — the workflow at `.github/workflows/orchestrate.yml` runs the autonomous
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
npm run db:push        # push schema directly (fine for solo/early development)
npm run db:studio      # browse the database
```
