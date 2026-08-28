# Solo Outbound CRM — Build Spec

A single-user, web-based CRM for personal-email + cold-call outbound. Pipedrive's useful 10%, none of the rest.

**Design constraints:** one user, <100 calls/day, no email sending (track-only), task-queue-first UI.

---

## 0. The one idea that makes this app simple

Everything hinges on this: **a sequence is a template, not a schedule.**

The naive build materializes all 5 tasks the moment you enroll a prospect. Then editing the sequence means rewriting thousands of future tasks, skipping a step means cascading date shifts, and rescheduling one call orphans the rest. That's where homegrown CRMs die.

Instead: **only ever materialize the next task.** One open task per enrollment, always. When you complete it, the engine reads the sequence template, computes the next step, and creates exactly one new task. Nothing else exists in the future.

Consequences that fall out for free:

- **Editing a sequence is trivial.** Edits affect the next step generated. No migration, no backfill, no versioning system.
- **Rescheduling is trivial.** Change one row's `due_date`. Nothing downstream to shift.
- **The Today queue is one query.** `SELECT * FROM tasks WHERE status='open' AND due_date <= today`.
- **Skipping/branching is trivial.** The engine decides the next step from the outcome you logged.

Build this rule in from day one. Retrofitting it later is a rewrite.

---

## 1. Recommended stack

| Layer | Pick | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | Cursor writes it well; server actions mean no separate API layer |
| DB | SQLite via Prisma (dev) → Postgres (prod, if ever) | Prisma schema is identical; SQLite file is trivially backed up |
| ORM | Prisma | Schema file doubles as the spec Cursor reads |
| UI | Tailwind + shadcn/ui | Ships accessible dialogs/tables so you're not building a modal from scratch |
| Dates | date-fns + `@date-fns/tz` | See §7 — dates are the #1 bug source here |
| Auth | None, or a single hardcoded password in middleware | One user. Don't build auth. |
| Host | Local + Tailscale, or Vercel + Neon | Local is fine and free |

**Deliberately excluded:** email sending, calendar sync, deal values/forecasting, custom fields, multi-pipeline, teams, permissions, activity feeds, integrations. Every one of these is why Pipedrive feels bloated.

---

## 2. Data model

```prisma
// ---------- Prospects ----------
model Prospect {
  id        String   @id @default(cuid())
  firstName String
  lastName  String?
  company   String?
  title     String?
  email     String?
  phone     String?
  linkedin  String?
  source    String?  // "list-scrape", "referral", "inbound"
  timezone  String?  // for "don't call at 7am their time"

  status    ProspectStatus @default(NEW)
  // Terminal reason, only set when status is DEAD
  deadReason String?  // "not_interested" | "no_answer_exhausted" | "wrong_number" | "unqualified" | "bad_timing"

  notes       Note[]
  activities  Activity[]
  enrollments Enrollment[]
  tasks       Task[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([status])
}

enum ProspectStatus {
  NEW           // imported, not yet enrolled
  ACTIVE        // in a sequence, working it
  MEETING_BOOKED
  WON
  DEAD
  PAUSED        // manually snoozed, e.g. "call back in Q4"
}

// ---------- Sequence templates ----------
model Sequence {
  id       String  @id @default(cuid())
  name     String
  isActive Boolean @default(true)
  steps       SequenceStep[]
  enrollments Enrollment[]
}

model SequenceStep {
  id         String   @id @default(cuid())
  sequenceId String
  sequence   Sequence @relation(fields: [sequenceId], references: [id], onDelete: Cascade)

  order      Int      // 1, 2, 3... contiguous, reordered on drag
  type       StepType
  label      String   // "Personal email", "Call attempt 1", "Reply to email chain"
  delayDays  Int      // business days AFTER the previous step completes
  template   String?  // email/script boilerplate you copy-paste

  @@unique([sequenceId, order])
}

enum StepType {
  EMAIL        // send a fresh personal email
  CALL
  EMAIL_REPLY  // reply into the existing thread
  LINKEDIN
  MANUAL       // catch-all: "send video", "mail a letter"
}

// ---------- Enrollment: prospect ↔ sequence, holds the cursor ----------
model Enrollment {
  id         String @id @default(cuid())
  prospectId String
  sequenceId String
  prospect   Prospect @relation(fields: [prospectId], references: [id], onDelete: Cascade)
  sequence   Sequence @relation(fields: [sequenceId], references: [id])

  currentStepOrder Int      @default(0)  // last COMPLETED step; 0 = not started
  state            EnrollState @default(RUNNING)

  startedAt  DateTime @default(now())
  finishedAt DateTime?
  exitReason String?  // "completed" | "meeting_booked" | "dead" | "manual_stop"

  tasks Task[]
  @@index([state])
}

enum EnrollState { RUNNING PAUSED FINISHED }

// ---------- Task: the ONLY thing on your Today screen ----------
model Task {
  id           String  @id @default(cuid())
  prospectId   String
  enrollmentId String?  // null = ad-hoc task you created by hand
  prospect     Prospect   @relation(fields: [prospectId], references: [id], onDelete: Cascade)
  enrollment   Enrollment? @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)

  type       StepType
  label      String
  stepOrder  Int?     // which template step this came from — needed for funnel stats
  dueDate    DateTime // DATE ONLY, midnight local. See §7.
  status     TaskStatus @default(OPEN)

  completedAt DateTime?
  activityId  String?  @unique  // the Activity this task produced

  createdAt DateTime @default(now())
  @@index([status, dueDate])
}

enum TaskStatus { OPEN DONE SKIPPED CANCELLED }
// CANCELLED = killed by the engine (prospect went dead / booked)
// SKIPPED   = you consciously passed on it. Kept separate so stats aren't polluted.

// ---------- Activity: the immutable log. Every stat is computed from this. ----------
model Activity {
  id         String   @id @default(cuid())
  prospectId String
  prospect   Prospect @relation(fields: [prospectId], references: [id], onDelete: Cascade)

  type       ActivityType
  outcome    CallOutcome?   // required when type = CALL
  stepOrder  Int?           // denormalized from the task, so funnel stats survive sequence edits
  sequenceId String?        // ditto
  note       String?
  durationSec Int?          // optional, call length
  occurredAt DateTime @default(now())

  @@index([type, occurredAt])
}

enum ActivityType { EMAIL_SENT EMAIL_REPLY_SENT CALL EMAIL_REPLY_RECEIVED MEETING_BOOKED NOTE STATUS_CHANGE }

enum CallOutcome {
  NO_ANSWER          // rang out, no voicemail left
  VOICEMAIL          // left a message
  GATEKEEPER         // reached someone, not the target
  CONNECTED          // ← spoke to the actual target. This is the numerator of connect rate.
  CALLBACK_REQUESTED // connected, but "call me Thursday"
  MEETING_BOOKED     // connected AND booked
  NOT_INTERESTED     // connected, hard no
  WRONG_NUMBER       // bad data
}

model Note {
  id         String   @id @default(cuid())
  prospectId String
  prospect   Prospect @relation(fields: [prospectId], references: [id], onDelete: Cascade)
  body       String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

### Two modelling choices worth defending

**`Task` and `Activity` are separate.** A task is *intent* ("call this person Thursday"). An activity is *fact* ("I dialled at 14:02 and got voicemail"). Merging them seems tempting and breaks immediately: one task can produce two dials, and you need activities that never had a task (inbound reply, ad-hoc call). Stats read only from `Activity`. Tasks are disposable; activities are permanent.

**`Activity.stepOrder` and `sequenceId` are denormalized copies.** Because you'll edit sequences, a step's meaning drifts over time. Copying the values at log time means last quarter's funnel stats don't silently change when you reorder steps today.

---

## 3. The sequence engine

One function. Put it in `lib/sequence-engine.ts` and let nothing else create tasks.

```ts
completeTask(taskId, {
  outcome?: CallOutcome,
  note?: string,
  nextDueDate?: Date,   // your manual override
  durationSec?: number,
})
```

**Steps, in order:**

1. Write an `Activity` (copying `stepOrder` + `sequenceId` off the task).
2. Mark the task `DONE`, link `activityId`.
3. Apply the outcome rules (§3.1) — they may short-circuit and end the enrollment.
4. Otherwise, find the next step: `SequenceStep where sequenceId = X and order > currentStepOrder, order by order asc, limit 1`.
5. No next step → `Enrollment.state = FINISHED`, `exitReason = "completed"`, prospect stays `ACTIVE` for you to triage. **Do not auto-kill.** A finished sequence isn't a dead prospect.
6. Next step exists → bump `currentStepOrder`, create one `Task` with `dueDate = nextDueDate ?? addBusinessDays(today, step.delayDays)`.

### 3.1 Outcome → engine behaviour

| Outcome | What the engine does |
|---|---|
| `NO_ANSWER`, `VOICEMAIL`, `GATEKEEPER` | Advance normally to the next step |
| `CONNECTED` | Advance normally, but **surface a prompt**: "Booked? Callback? Dead?" — a plain connect that just continues is rare |
| `CALLBACK_REQUESTED` | **Do not advance.** Create a new task, same `stepOrder`, `dueDate` = the date you picked. Keeps the sequence position intact. |
| `MEETING_BOOKED` | Prospect → `MEETING_BOOKED`; enrollment → `FINISHED` (`exitReason="meeting_booked"`); **cancel all open tasks** for that prospect |
| `NOT_INTERESTED` | Prospect → `DEAD` (`deadReason="not_interested"`); cancel open tasks |
| `WRONG_NUMBER` | Prospect → `DEAD` (`deadReason="wrong_number"`); cancel open tasks |

The `CALLBACK_REQUESTED` rule is the one that's easy to get wrong. A callback is a *reschedule of the current step*, not progress through the sequence. If you advance the cursor, someone who asked you to call Thursday gets an email-reply task instead of the call they asked for.

### 3.1b The inbound reply

Not in your original list, but it's the most common way a sequence gets interrupted: they email you back. Since the app doesn't read your inbox, you need a **"They replied"** button on the prospect page. It logs `EMAIL_REPLY_RECEIVED` and pauses the enrollment (`PAUSED`, tasks stay open but drop out of the queue). Without this you'll keep cold-calling someone who's mid-conversation with you. One button, five minutes of work, saves real embarrassment.

Resume or stop the enrollment manually from the same page.

### 3.2 Editing a sequence with prospects live in it

Because only the next task is materialized, the rules are short:

- **Add / remove / reorder / retime steps:** applies to every future step generated. Already-open tasks are untouched.
- **Deleting the step someone is sitting on:** the cursor is a number, so the engine just finds the next `order >` it. Harmless.
- **Reordering to an order the cursor already passed:** that prospect skips it. Acceptable — and worth a one-line warning in the editor: *"N prospects are mid-sequence; changes apply to their next step onward."*

Non-contiguous `order` values are fine. Reassign them as `1..n` on save to keep the UI sane.

---

## 4. Your sequence, encoded

```
Sequence: "Standard Outbound"
 1  EMAIL        "Personal email"          delayDays 0
 2  CALL         "Call attempt 1"          delayDays 1
 3  CALL         "Call attempt 2"          delayDays 2
 4  CALL         "Call attempt 3"          delayDays 2
 5  EMAIL_REPLY  "Reply to email chain"    delayDays 1
```

Walkthrough, enrolled Monday:

| Day | Task | You log | Engine |
|---|---|---|---|
| Mon | Personal email | done | creates Call 1, due Tue |
| Tue | Call attempt 1 | `NO_ANSWER` | creates Call 2, due Thu |
| Thu | Call attempt 2 | `GATEKEEPER` | creates Call 3, due Mon |
| Mon | Call attempt 3 | `NO_ANSWER` | creates Reply-to-chain, due Tue |
| Tue | Reply to chain | done | no step 6 → enrollment FINISHED, prospect stays ACTIVE |

Alternate branch: on Tue you log `CALLBACK_REQUESTED` + date `Fri`. Engine creates *another* Call attempt 1 due Friday. Cursor stays at 2. You still have all three attempts left.

**Note on your spec:** "call again 3 times" is ambiguous between 3 total and 4 total. Above assumes 3 total dials. Add a step if you meant 4 — the point is it's a 10-second edit in the UI, not a code change.

---

## 5. Screens

### 5.1 Today — the home screen, the only one that matters

Single list, overdue first, then today's, grouped by task type (all calls together — batching dials beats context-switching).

Each row: `Name · Company · Task label · Step 2/5 · Phone · [Log] [Snooze ▾] [Open]`

Design rules:

- **Everything logs from this row.** Opening the prospect page to log a call kills your rhythm at 60 calls/day.
- **Overdue never hides.** No auto-rollover that quietly buries a task.
- **Snooze ▾** = +1 day / +3 days / next Monday / pick a date. This is your "schedule the call for whatever day I want" requirement, one click deep.
- **Header counters:** `12 calls · 3 emails · 2 overdue`. Watching it hit zero is the whole motivational loop.
- **Empty state** links to un-enrolled `NEW` prospects, so a clear queue prompts you to load more.

**Keyboard shortcuts** — the single highest-leverage thing you can build. At 60 calls/day, mouse-driven logging costs you an hour a week:

```
j / k      move down / up
Enter      open log dialog for selected row
1..8       log outcome directly (1=no answer, 2=voicemail, 3=gatekeeper,
           4=connected, 5=callback, 6=booked, 7=not interested, 8=wrong number)
n          add note to selected
s          snooze selected
/          search prospects
```

Pressing `2` on a highlighted row should log a voicemail and advance the highlight, with no dialog at all. Note-taking stays optional.

### 5.2 Log Call dialog

Outcome as 8 big buttons (not a dropdown — one click, not two). Notes textarea below. Conditional extras:

- `CALLBACK_REQUESTED` → date picker, defaults to +2 business days, required
- `MEETING_BOOKED` → meeting date/time + notes
- Optional duration field, only if you actually want talk-time stats

One "Save & next" button that saves and moves to the next queue row.

### 5.3 Prospect detail

- Header: name, company, title, phone (click-to-call `tel:`), email, status pill, sequence progress `Step 3 of 5`
- **Timeline**: all activities + notes, reverse-chronological, one line each with outcome icon. This is your call history.
- **Notes**: pinned free-text panel above the timeline (the durable "he's the decision maker, budget renews in March" stuff), separate from the per-call notes in the timeline. Both exist because they serve different purposes — don't collapse them.
- Actions: log ad-hoc call, add note, change status, change/restart sequence, pause, mark dead with reason

### 5.4 Sequence editor

Drag-to-reorder list of steps. Each row: type dropdown, label, delay-days number, optional template textarea. Add/delete step. Live preview: *"Enrolled today → email today, call Aug 5, call Aug 7, call Aug 11, reply Aug 12."* Warning banner showing how many prospects are mid-sequence.

### 5.5 Prospects list

Table with filters (status, sequence, source, has-open-task). Bulk select → enroll in sequence, change status, delete. CSV import with column mapping and dedupe on email-or-phone. You need import on day one — hand-entering prospects is not a workflow.

### 5.6 Stats

See §6.

---

## 6. Metrics

Every metric reads from `Activity`. Global date filter (7d / 30d / 90d / quarter / custom), plus optional filter by sequence.

### 6.1 Activity volume

| Metric | Definition |
|---|---|
| Dials | `count(Activity where type=CALL)` — every dial, including wrong numbers |
| Emails sent | `count(type IN (EMAIL_SENT, EMAIL_REPLY_SENT))` |
| Prospects touched | `count(distinct prospectId)` over all activities |
| New enrollments | `count(Enrollment where startedAt in range)` |

### 6.2 The rates you asked for

```
Connect rate     = CONNECTED_ISH / dials
Meeting rate     = MEETING_BOOKED / CONNECTED_ISH     ← "of my connects, how many book"
Dials per meeting= dials / MEETING_BOOKED             ← the number that tells you how many calls a meeting costs
Prospect→meeting = prospects with a MEETING_BOOKED activity / prospects enrolled
```

Where `CONNECTED_ISH = count(outcome IN (CONNECTED, CALLBACK_REQUESTED, MEETING_BOOKED, NOT_INTERESTED))`.

**This definition is the thing to get right.** A "connect" means you spoke to the target human. A hard no *is* a connect — you reached them and pitched. If you count only `CONNECTED`, your connect rate falls every time you do well (bookings and rejections leave the bucket), which makes the metric actively misleading. `GATEKEEPER` and `VOICEMAIL` are **not** connects; they're reaching *someone*, not *them*.

Put the formula in a tooltip on the dashboard. Six months from now you will not remember what you counted.

### 6.3 Step funnel — where the sequence leaks

For a chosen sequence, per step: `reached / completed / outcome breakdown / booked-here`.

```
Step 1  Personal email     100 reached  ·  100 done  ·  4 replies
Step 2  Call attempt 1      96 reached  ·   94 done  ·  11 connects  ·  3 booked
Step 3  Call attempt 2      80 reached  ·   76 done  ·   9 connects  ·  2 booked
Step 4  Call attempt 3      68 reached  ·   61 done  ·   7 connects  ·  2 booked
Step 5  Reply to chain      52 reached  ·   48 done  ·   2 replies   ·  1 booked
```

"Reached" = `count(distinct prospectId in Activity where stepOrder >= n)`. This is the report that earns its keep: it tells you whether attempt 3 is worth making. If step 4 books almost nothing, delete it and reclaim the time. If it books as well as step 2, add a step 6.

### 6.4 Outcome distribution

Simple bar chart of call outcomes over the period. A `NO_ANSWER` share above ~80% usually means a data quality problem (bad direct dials), not a skill problem — worth being able to see at a glance.

### 6.5 Daily activity

Bar chart of dials + emails per day, last 30 days. Catches the "I stopped prospecting for eight days" pattern that's otherwise invisible.

### 6.6 Deliberately skipped

Revenue forecasting, weighted pipeline value, win rate by source, talk-time analytics. Add later if you miss them. You won't miss most of them.

---

## 7. The two bugs you will hit

**Dates.** `dueDate` is a *calendar date*, not an instant. Store it as midnight UTC of the intended local day and never let a timezone conversion touch it, or use a `DATE` column. Ignoring this gives you tasks due "yesterday" every time you cross a DST boundary or travel. Pick one convention on day one and write it in a comment above the field. `occurredAt` on Activity is the opposite — a real instant, store UTC, render local.

**Business days.** `delayDays: 2` on a Thursday must mean Monday, not Saturday. Write `addBusinessDays(date, n)` once, use it everywhere, and make it skip weekends. Optionally a `holidays` table. Without this a fifth of your calls land on days you don't work and pile up as fake overdue.

Other things worth deciding early:

- **Deleting a prospect** cascades their activities and destroys history. Prefer soft delete, or `DEAD` status.
- **Double-enrollment**: block a prospect being in two RUNNING enrollments. Enforce with a partial unique index or a check in the enroll action.
- **Bulk enroll of 200 prospects** creates 200 tasks all due today. Offer a "spread over N days" option on the bulk enroll dialog.

---

## 8. Build order

Each phase ends with something you can actually use. Don't build phase 5 before you've made real calls through phase 3 — you'll spec the wrong stats.

**Phase 1 — Foundation (½ day)**
Next.js + Prisma + Tailwind + shadcn. Full schema from §2, migrate, seed with your sequence and ~10 fake prospects. Prospect list + prospect detail (read-only). Manual add form.

**Phase 2 — Sequence engine (1 day) ← the hard part**
`lib/sequence-engine.ts` with `enrollProspect`, `completeTask`, `skipTask`, `rescheduleTask`, `stopEnrollment`. `addBusinessDays` util. **Write unit tests for this** — walk the §4 table plus the callback branch plus the booked branch. It's the only part of the app where a bug silently corrupts data instead of throwing.

**Phase 3 — Today queue (1 day)**
The queue, the log dialog, snooze, note-adding. At the end of this phase the app is usable for real work. Start using it.

**Phase 4 — Management (1 day)**
Sequence editor with drag-reorder and live preview. CSV import with mapping + dedupe. Bulk enroll. Prospect filters and search.

**Phase 5 — Stats (1 day)**
All of §6. Raw SQL aggregates are fine and clearer than Prisma groupBy here. Recharts for charts. Tooltips with formulas.

**Phase 6 — Speed (½ day)**
Keyboard shortcuts. Optimistic UI on logging (the row should clear instantly, not after a round-trip). Click-to-call `tel:` links. Then a nightly `sqlite3 .backup` cron — you'll have irreplaceable data in here within a month.

---

## 9. Cursor notes

- **Paste this spec into the repo** as `SPEC.md` and reference it with `@SPEC.md` in prompts. Re-reference it every few prompts; Cursor drifts.
- **Build the Prisma schema first and treat it as law.** Most agent-written-CRM failures start with the model quietly gaining a field that duplicates another.
- **Do phase 2 in its own conversation**, with the engine rules from §3 pasted in verbatim. Ask for tests first, then the implementation.
- **Guard the invariant explicitly**: tell Cursor "only `sequence-engine.ts` may create or mutate Task rows." Otherwise you'll find task-creation logic sprinkled through three route handlers by week two.
- When something feels wrong in the UI, describe the *workflow* problem ("logging a call takes three clicks and I do it 60 times a day"), not the fix. You get better solutions.
