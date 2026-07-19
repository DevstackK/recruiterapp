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
   - Create a Storage bucket named `cvs`.
   - Auth → create the one recruiter user (email/password).
   - Run `npm run db:push` to create tables from `src/lib/db/schema.ts`.
3. **Google Cloud Console** (for Gmail, needed starting Phase 5):
   - Create a project, enable the Gmail API.
   - OAuth consent screen: External, Testing, add your own Gmail as a test user, scope
     `gmail.readonly` (add `gmail.send` later if wanted).
   - Create an OAuth 2.0 Client ID (Web application) with a redirect URI pointing at your deployed
     app (e.g. `https://<app>.vercel.app/api/gmail/callback`).
   - Put Client ID/Secret into `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`.
4. **Vercel** — connect the repo, set all env vars from `.env.local.example`, deploy.
5. **GitHub Actions** — add a `CRON_SECRET` repo secret matching the Vercel env var (needed starting
   Phase 6).

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
