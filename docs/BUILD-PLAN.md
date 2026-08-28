# Build Plan — Solo Outbound CRM

Target: working software in ~5 focused days, deployed on Vercel, built in Cursor with a deliberate split between Opus and Auto.

---

## 1. Do you need a separate backend?

**No. Not even slightly.** Next.js App Router with Server Actions is the entire backend.

The instinct to split frontend and backend comes from three needs, and you have none of them:

| Reason people split | Do you have it? |
|---|---|
| Multiple clients (web + mobile + partner API) | No — one browser, one user |
| Background jobs / queues / cron | **No — see below** |
| A team that needs to deploy the two independently | No |
| Heavy compute that would block the web tier | No — your heaviest query aggregates a few thousand rows |
| Webhooks from third parties | No — and by decision, never (§9) |

The "no cron" point is the one worth dwelling on, because it's not obvious and it's the single biggest simplification in this project.

A normal sequence tool needs a scheduler: it materialises every future step up front, so something has to wake up nightly and decide what's due. **Your design doesn't.** Because only the next task is ever created, "what's due today" is a `WHERE due_date <= today AND status = 'open'` query, evaluated when you load the page. Overdue is the same query. There is no job, no queue, no worker, no Inngest, no Vercel Cron, nothing to monitor at 3am.

That means the whole app is: render pages, run queries, mutate on user action. A single Next.js deployment is the correct shape.

### How heavy should this be?

Genuinely small. Budget roughly:

- **~2,500 lines** of application code, excluding shadcn's generated components
- **8 routes**: `/` (today), `/prospects`, `/prospects/[id]`, `/sequences`, `/sequences/[id]`, `/stats`, `/import`, `/login`
- **1 file that matters** — `lib/sequence-engine.ts`, maybe 250 lines
- **Zero API routes.** Server Actions for every mutation, React Server Components for every read

If you find yourself installing Redux, tRPC, React Query, or a state management library, stop — you have server components and `revalidatePath`. If you find yourself writing an `/api` folder, ask what it's for; the answer is almost always "nothing".

**The one place to spend effort** is the sequence engine and its tests. Everything else is CRUD and tables. Getting that ratio wrong — polishing the prospect table while the engine has an off-by-one in business-day math — is the main way this project goes sideways.

---

## 2. Final stack

| Layer | Choice | Note |
|---|---|---|
| Framework | **Next.js 15, App Router, TypeScript** | Server Actions remove the API layer entirely |
| UI | **shadcn/ui + Tailwind** | You own the component source; no version-upgrade roulette |
| DB | **Postgres on Neon** | Vercel's native integration; free tier is far beyond your needs |
| ORM | **Prisma** | The schema file doubles as documentation Cursor reads |
| Auth | **Auth.js v5, single-email allowlist** | ~30 lines. Don't hand-roll session cookies for real prospect data |
| Charts | **Recharts** for bars/lines, **hand-rolled SVG** for funnel/gauge/heatmap | Recharts is bad at those three; the wireframe already has the SVG |
| Tests | **Vitest** | Only for the engine and date utils. Don't test the UI |
| Dates | **date-fns** + a hand-written `addBusinessDays` | See §7 |
| Host | **Vercel** | Free tier; Hobby is fine for one user |

### Why not SQLite

You'd normally reach for SQLite on a solo project and you'd be right — except Vercel's filesystem is ephemeral, so the database would vanish on every deploy. Don't use SQLite locally and Postgres in production either; that's how you get a migration that passes locally and fails in prod. **Use Neon for both**, with a separate dev branch. Neon branches are instant and free, so local dev talks to a real Postgres with production's exact schema.

### Auth: 15 minutes, not a project

Single user, but this database will hold real names, phone numbers and notes about people. A password in an env var checked in middleware is fine functionally and easy to get subtly wrong (timing attacks, cookie signing, session expiry). Auth.js with a GitHub or Google provider and a hardcoded email allowlist is less code than the naive version:

```ts
// auth.ts
callbacks: {
  signIn: ({ user }) => user.email === process.env.ALLOWED_EMAIL,
}
```

Everything behind `middleware.ts`. Done in one sitting, never touched again.

---

## 3. Repo layout

Keep files small and single-purpose — this is a **token strategy**, not just tidiness. Cursor reads whole files into context; a 900-line page component costs you real money every time an agent touches it.

```
crm/
├── docs/
│   ├── SPEC.md               ← the build spec
│   └── wireframes.html       ← the mockups; reference these instead of describing UI
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── (app)/
│   │   │   ├── layout.tsx            ← rail + shell
│   │   │   ├── page.tsx              ← Today
│   │   │   ├── prospects/page.tsx
│   │   │   ├── prospects/[id]/page.tsx
│   │   │   ├── sequences/[id]/page.tsx
│   │   │   └── stats/page.tsx
│   │   └── login/page.tsx
│   ├── components/
│   │   ├── ui/                       ← shadcn, generated
│   │   ├── today/                    ← queue-row, outcome-popover, snooze-menu
│   │   ├── prospect/
│   │   ├── sequence/
│   │   └── stats/                    ← one file per chart
│   ├── lib/
│   │   ├── sequence-engine.ts        ← 🔒 PROTECTED
│   │   ├── dates.ts                  ← 🔒 PROTECTED
│   │   ├── stats.ts                  ← 🔒 PROTECTED
│   │   ├── db.ts
│   │   └── types.ts
│   └── actions/                      ← server actions, one file per domain
│       ├── tasks.ts
│       ├── prospects.ts
│       └── sequences.ts
└── tests/
    ├── engine.test.ts
    └── dates.test.ts
```

**Rule of thumb: no file over 250 lines.** If a page grows past that, extract a component. You'll pay for the violation in tokens on every subsequent edit.

---

## 4. Model allocation — where the tokens go

The principle: **Opus for anything where being wrong is silent, Auto for anything where being wrong is visible.**

A misaligned button is obvious the moment you look at the screen — a cheap model plus your eyes fixes it in seconds. A business-day calculation that's off by one on Fridays produces a database full of subtly wrong dates that you won't notice for three weeks. That asymmetry, not difficulty, is what should decide the model.

### Use Opus for

| Task | Why |
|---|---|
| **Prisma schema, all in one pass** | Every later decision inherits from it. Cheap to do once, expensive to migrate |
| **`sequence-engine.ts` + its tests** | The one place a bug corrupts data instead of throwing. Write tests first |
| **`dates.ts`** — business days, DST, calendar-date storage | Silent-wrongness incarnate |
| **`stats.ts`** — the aggregate SQL | A wrong denominator is invisible and you'll trust the number |
| **Auth + middleware** | Security code you won't review carefully because it "works" |
| **The unsaved-changes diff** in the sequence editor | State-tracking bugs here mislead you about what you're saving |
| **Any bug you can't reproduce** | This is what deep reasoning is actually for |

Roughly **6–8 substantial Opus conversations** for the whole project.

### Use Auto for

Everything else, and that's most of it: translating wireframe sections into components, shadcn scaffolding, table columns, filter dropdowns, form wiring, the CSV import parser, loading and empty states, copy, spacing, colours, responsive fixes, chart components once the data shape is fixed.

### The biggest single token saving

**`docs/wireframes.html` turns UI work from design into translation.**

Instead of:

> "Build a prospects table with filters, bulk selection, status pills and pagination"

— which makes the model invent structure, then you reject it, then it invents different structure — do:

> "Open `docs/wireframes.html`, find the section with `id="s-list"`. Rebuild it as `src/app/(app)/prospects/page.tsx` using shadcn Table, Checkbox, Badge and DropdownMenu. Match the markup's structure and class intent. Data comes from `getProspects()` in `src/lib/queries.ts` — write that too."

Second prompt, cheap model, right first time. Do this for all six screens.

---

## 5. Cursor setup — do this before writing any code

### `.cursor/rules/core.mdc`

Cheap models don't hold architectural intent across sessions. Rules files do. This one file prevents most of the damage:

```md
---
alwaysApply: true
---

# Architecture invariants

- Only `src/lib/sequence-engine.ts` may create, update or delete `Task` rows.
  Never write task mutations in a page, component, or action. Actions call the engine.
- `Activity` rows are append-only. Never update or delete one.
- All dates that represent a calendar day (`Task.dueDate`) use the helpers in
  `src/lib/dates.ts`. Never call `new Date()` arithmetic directly.
- Mutations are Server Actions in `src/actions/`. Do not create files under `src/app/api/`.
- Reads happen in Server Components. Do not add React Query, tRPC or a client store.
- Keep files under 250 lines. Extract a component instead of growing a page.

# Protected files — do not modify without being asked explicitly
- prisma/schema.prisma
- src/lib/sequence-engine.ts
- src/lib/dates.ts
- src/lib/stats.ts

# Style
- shadcn/ui components only. Do not hand-roll a dropdown, dialog or popover.
- Tailwind utility classes. No CSS modules, no styled-components.
```

### Working habits that save tokens

- **Start a new chat per phase.** A long conversation re-sends its history every turn; by message thirty you're paying for twenty-nine irrelevant ones.
- **Reference narrowly.** `@src/lib/sequence-engine.ts` beats `@src/lib`, which beats "look at the codebase".
- **Let the model run tests itself.** Give it `pnpm test` and let it iterate against real failures. Far cheaper than you pasting stack traces into Opus.
- **Use Ask mode for questions, Agent mode for edits.** Agent mode reads files aggressively; asking "how does X work" in Agent mode is a waste.
- **Commit at every phase boundary.** Free rollback when a cheap model wanders.

---

## 6. The build, phase by phase

Each phase ends with something you can run. Don't build phase 6 before you've made real calls through phase 3 — you'll spec the wrong stats.

---

### Phase 0 · Skeleton and a live deployment — ½ day · **Auto**

Get a deployed URL before writing features. Deploying at the end is how you discover Prisma doesn't run on the edge runtime with a day's work already stacked on top.

```bash
pnpm create next-app@latest crm --typescript --tailwind --app --src-dir
cd crm && pnpm dlx shadcn@latest init
pnpm add @prisma/client && pnpm add -D prisma vitest tsx
pnpm add next-auth@beta date-fns recharts
pnpm dlx prisma init
```

1. Create a Neon project through the Vercel integration; take `DATABASE_URL` (pooled) and `DIRECT_URL`.
2. Push to GitHub, import to Vercel, confirm the placeholder page is live.
3. Add Auth.js with the single-email allowlist and `middleware.ts` over `(app)`.
4. Add the shadcn components you'll need now: `button table badge dialog dropdown-menu popover input textarea select checkbox tabs calendar sonner`.

**Done when:** you can log in at your Vercel URL and nobody else can.

---

### Phase 1 · Schema and seed — ½ day · **🧠 OPUS**

One conversation. Give it `docs/SPEC.md §2` and ask for the complete `schema.prisma` plus a seed script.

> Read `@docs/SPEC.md`. Implement section 2 as a complete `prisma/schema.prisma` for Postgres, including the indexes described. Then write `prisma/seed.ts` that creates the "Standard Outbound" sequence from §4 and 40 realistic Finnish B2B prospects across mixed states: some new, some mid-sequence, some booked, some dead, some with call history. Add `postinstall` and `seed` scripts to package.json.

Then `prisma migrate dev`, `prisma db seed`, and open Prisma Studio to eyeball it.

**Done when:** Studio shows sensible data and the enums match the spec exactly.

**Do not let a cheap model near this file afterwards.** Schema drift is the most expensive kind.

---

### Phase 2 · The sequence engine — 1 day · **🧠 OPUS** ← the hard part

Two conversations, tests first.

**Conversation A — tests.** Give it §3 and §4 of the spec and ask for `tests/engine.test.ts` and `tests/dates.test.ts` covering:

- the full happy path from §4, asserting the exact date of every generated task
- `CALLBACK_REQUESTED` does not advance `currentStepOrder`
- `MEETING_BOOKED` cancels all open tasks and finishes the enrollment
- `NOT_INTERESTED` / `WRONG_NUMBER` mark the prospect dead
- completing the last step finishes the enrollment but leaves the prospect `ACTIVE`
- `addBusinessDays(Thursday, 2)` is Monday; Friday + 1 is Monday; a holiday is skipped
- one open task per enrollment, always — assert this after every operation

**Conversation B — implementation.** `dates.ts` then `sequence-engine.ts`, iterating until green. Let the agent run `pnpm test` itself.

**Done when:** every test passes and you have read the engine top to bottom yourself. This is the only file in the project you should personally understand line by line.

---

### Phase 3 · Today queue — 1 day · **Auto**, one Opus assist

The wireframe does the design work; this is translation.

> Open `docs/wireframes.html` and find `id="s-today"`. Build this as `src/app/(app)/page.tsx` using shadcn Table, Badge, Popover and DropdownMenu. The outcome popover is `id="s-today"`'s `.pop` block. Type chips and time tabs are URL search params (`?type=call&range=today`) so the state is shareable and survives refresh. Reads go through a new `getTodayQueue()` in `src/lib/queries.ts`. Logging an outcome calls `completeTask` from `@src/lib/sequence-engine.ts` via a Server Action in `src/actions/tasks.ts` — do not write task mutations anywhere else.

**One Opus assist:** optimistic updates. When you log an outcome the row must clear instantly, not after a round trip, and must roll back on failure. `useOptimistic` with Server Actions has sharp edges and this is worth getting right — you'll feel it sixty times a day.

**Done when:** you can work a real queue end to end. **Start using it for actual calls now.** Everything after this is improvement; this is the product.

---

### Phase 4 · Prospects and prospect detail — 1 day · **Auto**

Two prompts, both translation (`id="s-list"` and `id="s-prospect"`).

Details worth calling out in the prompt so you don't get them wrong:

- filters and sort in URL params, server-side, with `Suspense` and skeletons
- the history type filter is a param too
- **CSV import**: `papaparse`, column mapping UI, dedupe on email-or-phone, a preview showing "38 new, 4 duplicates, 2 missing phone" before committing. Import is where you'll spend your first hour with the app, so it deserves a real screen rather than a file input.
- bulk enroll must expose "spread over N days", or 200 prospects land in one afternoon

**Done when:** you can import a real list and enroll it.

---

### Phase 5 · Sequence editor — 1 day · **Auto** + **🧠 OPUS** for two pieces

Translate `id="s-sequence"` with Auto: step rows, drag-reorder (`dnd-kit`), template editor, column headers, the sticky save bar.

**Opus for the schedule preview.** It must produce identical dates to the engine — if the preview says Tuesday and the engine writes Monday, you'll trust the preview and be wrong. It must call the same `addBusinessDays` from `dates.ts`, not reimplement it. Worth an explicit test asserting preview output matches engine output for the same sequence.

**Opus for the unsaved-changes diff.** Tracking dirty state across reorder, add, delete and field edits, and rendering it as "Call attempt 2 wait 1 → 2 days", is fiddlier than it looks and quietly wrong if rushed.

**Done when:** you can add a step, see the preview update, save, and watch a new task appear on Today with the right date.

---

### Phase 6 · Stats — 1 day · **🧠 OPUS** for queries, **Auto** for charts

**Opus first, data only.** Give it §6 of the spec and ask for `src/lib/stats.ts` — typed functions returning plain objects, raw SQL via `prisma.$queryRaw` where it's clearer than the query builder, every metric with a comment stating its exact definition. **Ask for a test asserting connect rate against a hand-built fixture.** A wrong denominator here is invisible and you'll make decisions on it.

**Then Auto for the visuals.** Recharts for the grouped bar chart and sparklines; copy the funnel, gauge and heatmap SVG straight out of `wireframes.html` — it's already written and Recharts does those badly.

**Done when:** the numbers reconcile. Cross-check one metric by hand against Prisma Studio.

---

### Phase 7 · Speed and safety — ½ day · **Auto**, except backups

- Keyboard shortcuts on Today (`react-hotkeys-hook`): `j`/`k`, `1`–`8`, `n`, `s`, `/`
- Click-to-call `tel:` links
- `sonner` toasts with **undo** on outcome logging — the cheapest possible insurance against a fat-fingered `7`
- Empty states, loading skeletons, a sane 404
- **Backups (do this properly):** a GitHub Action running `pg_dump` nightly to a private repo or object storage. Neon's free tier keeps 24 hours of history, which is not a backup. Within a month this database is irreplaceable — it's the only record of every conversation you've had.

---

## 7. Two things that will bite you on Vercel

**Prisma needs the Node runtime.** Any route touching the database needs `export const runtime = 'nodejs'` — it is not the default everywhere. Set it once in the `(app)` layout. And use Neon's **pooled** URL for `DATABASE_URL` with the **direct** URL as `DIRECT_URL` in the datasource block, or migrations will fail against the pooler.

**Timezones.** Vercel functions run in UTC; you're in Helsinki. If you compute "today" server-side with `new Date()`, then between 00:00 and 03:00 Finnish time your queue will show the wrong day. Pin a single `APP_TZ = 'Europe/Helsinki'` in `dates.ts` and route every "what day is it" question through one function. This is worth a test.

---

## 8. Effort and token summary

| Phase | Days | Model | Why |
|---|---|---|---|
| 0 · Skeleton + deploy | ½ | Auto | Boilerplate |
| 1 · Schema + seed | ½ | **Opus** | Everything inherits from it |
| 2 · Engine + tests | 1 | **Opus** | Silent-failure zone |
| 3 · Today queue | 1 | Auto (+1 Opus) | Translation; optimistic updates are subtle |
| 4 · Prospects + import | 1 | Auto | Translation |
| 5 · Sequence editor | 1 | Auto + **Opus** ×2 | Preview must match the engine exactly |
| 6 · Stats | 1 | **Opus** → Auto | Wrong denominators are invisible |
| 7 · Polish + backups | ½ | Auto | Visible-failure zone |

**≈ 6½ days.** Opus concentrated in phases 1, 2, 6 and two surgical assists — call it 8 conversations. Everything else runs on Auto against the wireframes.

If you only get three days: phases 0, 1, 2, 3. That's a usable CRM. Prospects can be added by hand and stats can wait — but a broken engine can't.

---

## 9. After it's running

**No integrations. Ever, unless you change your mind for a reason you don't have yet.**

This is worth stating as a decision rather than an omission, because it removes the largest source of ongoing maintenance in a CRM. No Gmail sync, no calendar sync, no email A/B testing. Concretely, that means:

- **No OAuth.** No token refresh, no consent screens, no Google verification review, no scope creep, no 3am "reauthorise your account" emails.
- **No webhooks or polling.** Nothing arrives from outside, so there's still nothing to schedule or monitor — the "no cron" property from §1 holds permanently rather than just until the first integration.
- **No sync reconciliation.** The hardest class of bug in CRM software is "the CRM thinks X, the mailbox thinks Y". You never get to have it.
- **The `EMAIL_REPLY_RECEIVED` activity and the "They replied" button stay**, because they're manual. You press a button; nothing reads your inbox.

The cost is real and small: you copy a template into Gmail yourself, and you press a button when someone replies. That's a few seconds per prospect against a permanent tax you now never pay.

### What you'll actually miss, in the order you'll miss it

Use the app for two weeks before adding any of these.

1. **A do-not-call / suppression list.** The first genuine gap. Someone says "never contact me again", goes `DEAD`, and then reappears three months later in a fresh CSV. A suppression table checked at import time, matching on email and normalised phone, is an hour of work and protects both your reputation and your GDPR position.
2. **Import dedupe against existing prospects.** Related but distinct — right now import dedupes within the file. It should also refuse to re-add someone already in the database, and tell you so in the preview.
3. **Multiple sequences by segment.** The data model already handles this; only the UI assumes one. Once you're running different messaging for, say, logistics versus manufacturing, you'll want to compare their funnels side by side.
4. **A responsive Today view.** Not a mobile app — just the queue readable and loggable on a phone, so a call you make from the car still gets recorded. Tables are the hard part; a card layout under `md:` is a half day.
5. **Saved filter views on Prospects.** "New this week, not yet enrolled" is a query you'll type twenty times before you get tired of it.

Things you will not miss, despite Pipedrive insisting otherwise: deal values, forecasting, custom fields, multiple pipelines, activity feeds, lead scoring, or a native mobile app.
