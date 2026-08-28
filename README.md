# Solo Outbound CRM

Single-user CRM for cold outbound (personal email → phone calls → email reply).
Deployed on Vercel. One architectural rule: **a sequence is a template, not a
schedule** — only the next task is ever materialised (see `docs/SPEC.md` §0).

## Stack

Next.js App Router · Prisma · Neon Postgres · Auth.js (Google) · shadcn/ui · Tailwind v4

## Local setup

```bash
pnpm install
cp .env.example .env
# fill in the env vars listed below
pnpm prisma generate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with the Google
account whose email matches `ALLOWED_EMAIL`.

### Seed

```bash
pnpm prisma migrate dev
pnpm seed
```

This creates the `Standard Outbound` sequence and 40 realistic Finnish B2B
prospects in mixed states for local development.

### Tests

```bash
pnpm test
```

Vitest covers the sequence engine and date helpers only. Do not test UI.

### Build

```bash
pnpm build
```

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon pooled Postgres connection string |
| `DIRECT_URL` | Neon direct (non-pooled) URL for migrations |
| `AUTH_SECRET` | Auth.js secret (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` | Google OAuth app client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth app client secret |
| `ALLOWED_EMAIL` | The single email allowed to sign in |
| `AUTH_TRUST_HOST` | Set to `true` for local / non-Vercel hosts |

Google OAuth callback URL: `http://localhost:3000/api/auth/callback/google`

## Backups

Neon free-tier point-in-time recovery is only ~24 hours. A nightly
`pg_dump` runs via `.github/workflows/backup.yml`.

Repo secrets to set:

| Secret | Required | Purpose |
|---|---|---|
| `BACKUP_DATABASE_URL` | Yes | Neon **direct** (non-pooled) connection string |
| `BACKUP_REPO` | No | Private mirror repo (`owner/name`) |
| `BACKUP_GITHUB_TOKEN` | No | PAT with `contents:write` on that repo |

Artifacts are kept for 90 days. Restore with:

```bash
pg_restore --clean --if-exists --no-owner --dbname="$DIRECT_URL" crm-YYYYMMDD.dump
```

Run manually anytime from the Actions tab → **Nightly database backup** → **Run workflow**.

## Protected files

Do not edit these unless a prompt explicitly asks:

| File | Why |
|---|---|
| `prisma/schema.prisma` | Schema is the contract; wrong edits cascade everywhere |
| `src/lib/sequence-engine.ts` | Only code that may mutate `Task` rows |
| `src/lib/dates.ts` | Calendar-day / business-day math — silent bugs |
| `src/lib/stats.ts` | Aggregate SQL — wrong denominators look correct |

## Docs

- `docs/SPEC.md` — data model, sequence engine, metrics
- `docs/BUILD-PLAN.md` — architecture and phase plan
- `docs/wireframes.html` — visual spec (six screens)
