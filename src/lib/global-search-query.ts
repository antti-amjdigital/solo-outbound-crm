import { EnrollState, TaskStatus } from "@prisma/client"
import { appToday, formatCalendarDate } from "@/lib/dates"
import { db } from "@/lib/db"
import { overdueDays } from "@/lib/queue-filters"
import {
  buildProspectSearchWhere,
  foldForSearch,
  normalizePhone,
  prospectDisplayName,
  shouldSearch,
  textContains,
} from "@/lib/search"

export type GlobalSearchProspectHit = {
  id: string
  firstName: string
  lastName: string | null
  title: string | null
  company: string | null
  email: string | null
  phone: string | null
  taskTag: string | null
  taskTagOverdue: boolean
}

export type GlobalSearchNoteHit = {
  id: string
  source: "pinned" | "activity"
  prospectId: string
  prospectName: string
  snippet: string
}

export type GlobalSearchResult = {
  prospects: GlobalSearchProspectHit[]
  notes: GlobalSearchNoteHit[]
  totals: { prospects: number; notes: number }
}

const PROSPECT_LIMIT = 6
const NOTE_LIMIT = 2
const SNIPPET_LEN = 120

function taskContextTag(dueDate: Date, today = appToday()): {
  label: string
  overdue: boolean
} {
  const days = overdueDays(dueDate, today)
  if (days > 0) return { label: `Overdue ${days}d`, overdue: true }
  if (formatCalendarDate(dueDate) === formatCalendarDate(today)) {
    return { label: "Today", overdue: false }
  }
  const diff = Math.round((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
  if (diff === 1) return { label: "Tomorrow", overdue: false }
  return { label: "Scheduled", overdue: false }
}

async function phoneMatchIds(digits: string): Promise<string[]> {
  if (digits.length < 3) return []
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Prospect"
    WHERE phone IS NOT NULL
      AND regexp_replace(phone, '[^0-9+]', '', 'g') LIKE ${"%" + digits + "%"}
  `
  return rows.map((r) => r.id)
}

async function diacriticMatchIds(q: string): Promise<string[]> {
  const folded = foldForSearch(q)
  if (!folded) return []
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Prospect"
    WHERE strpos(
      lower(
        translate(
          coalesce("firstName", '') || ' ' ||
          coalesce("lastName", '') || ' ' ||
          coalesce("company", '') || ' ' ||
          coalesce("email", '') || ' ' ||
          coalesce("phone", ''),
          'äåöüÄÅÖÜ',
          'aaoouAAOUU'
        )
      ),
      ${folded}
    ) > 0
  `
  return rows.map((r) => r.id)
}

function makeSnippet(body: string, q: string): string {
  const trimmed = body.trim()
  if (trimmed.length <= SNIPPET_LEN) return trimmed
  const match = foldForSearch(trimmed).indexOf(foldForSearch(q))
  if (match === -1) return `${trimmed.slice(0, SNIPPET_LEN)}…`
  const start = Math.max(0, match - 30)
  const slice = trimmed.slice(start, start + SNIPPET_LEN)
  const prefix = start > 0 ? "…" : ""
  const suffix = start + SNIPPET_LEN < trimmed.length ? "…" : ""
  return `${prefix}${slice}${suffix}`
}

function prospectMatchesFields(
  p: {
    firstName: string
    lastName: string | null
    company: string | null
    email: string | null
    phone: string | null
  },
  q: string,
  digits: string,
): boolean {
  const fields = [
    p.firstName,
    p.lastName,
    p.company,
    p.email,
    p.phone,
  ].filter(Boolean) as string[]
  if (fields.some((f) => textContains(f, q))) return true
  if (textContains(prospectDisplayName(p), q)) return true
  if (textContains(fields.join(" "), q)) return true
  const tokens = q.trim().split(/\s+/).filter(Boolean)
  if (tokens.length > 1 && tokens.every((token) => fields.some((f) => textContains(f, token)))) {
    return true
  }
  if (digits.length >= 3 && p.phone && normalizePhone(p.phone).includes(digits)) {
    return true
  }
  return false
}

export async function globalSearchQuery(q: string): Promise<GlobalSearchResult> {
  const trimmed = q.trim()
  if (!shouldSearch(trimmed)) {
    return { prospects: [], notes: [], totals: { prospects: 0, notes: 0 } }
  }

  const digits = normalizePhone(trimmed)
  const today = appToday()

  const [textProspects, phoneIds, diacriticIds, pinnedNotes, activityNotes] =
    await Promise.all([
      db.prospect.findMany({
        where: buildProspectSearchWhere(trimmed),
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
          company: true,
          email: true,
          phone: true,
          tasks: {
            where: {
              status: TaskStatus.OPEN,
              OR: [
                { enrollmentId: null },
                { enrollment: { state: EnrollState.RUNNING } },
              ],
            },
            orderBy: { dueDate: "asc" },
            take: 1,
            select: { dueDate: true },
          },
        },
        take: PROSPECT_LIMIT * 3,
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      }),
      phoneMatchIds(digits),
      diacriticMatchIds(trimmed),
      db.note.findMany({
        where: { body: { contains: trimmed, mode: "insensitive" } },
        select: {
          id: true,
          body: true,
          prospect: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: NOTE_LIMIT * 2,
      }),
      db.activity.findMany({
        where: {
          note: { not: null, contains: trimmed, mode: "insensitive" },
        },
        select: {
          id: true,
          note: true,
          prospect: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { occurredAt: "desc" },
        take: NOTE_LIMIT * 2,
      }),
    ])

  const extraIds = [...new Set([...phoneIds, ...diacriticIds])].filter(
    (id) => !textProspects.some((p) => p.id === id),
  )

  const extraProspects =
    extraIds.length > 0
      ? await db.prospect.findMany({
          where: { id: { in: extraIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            company: true,
            email: true,
            phone: true,
            tasks: {
              where: {
                status: TaskStatus.OPEN,
                OR: [
                  { enrollmentId: null },
                  { enrollment: { state: EnrollState.RUNNING } },
                ],
              },
              orderBy: { dueDate: "asc" },
              take: 1,
              select: { dueDate: true },
            },
          },
        })
      : []

  const mergedProspects = [...textProspects, ...extraProspects]
    .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
    .filter((p) => prospectMatchesFields(p, trimmed, digits))
    .slice(0, PROSPECT_LIMIT)

  const prospectHits: GlobalSearchProspectHit[] = mergedProspects.map((p) => {
    const task = p.tasks[0]
    const tag = task ? taskContextTag(task.dueDate, today) : null
    return {
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      title: p.title,
      company: p.company,
      email: p.email,
      phone: p.phone,
      taskTag: tag?.label ?? null,
      taskTagOverdue: tag?.overdue ?? false,
    }
  })

  const noteHits: GlobalSearchNoteHit[] = []
  const seenNoteKeys = new Set<string>()

  for (const n of pinnedNotes) {
    const body = n.body.trim()
    if (!textContains(body, trimmed)) continue
    const key = `${n.prospect.id}:${foldForSearch(body.slice(0, 40))}`
    if (seenNoteKeys.has(key)) continue
    seenNoteKeys.add(key)
    noteHits.push({
      id: n.id,
      source: "pinned",
      prospectId: n.prospect.id,
      prospectName: prospectDisplayName(n.prospect),
      snippet: makeSnippet(body, trimmed),
    })
    if (noteHits.length >= NOTE_LIMIT) break
  }

  if (noteHits.length < NOTE_LIMIT) {
    for (const a of activityNotes) {
      const body = a.note?.trim() ?? ""
      if (!body || !textContains(body, trimmed)) continue
      const key = `${a.prospect.id}:${foldForSearch(body.slice(0, 40))}`
      if (seenNoteKeys.has(key)) continue
      seenNoteKeys.add(key)
      noteHits.push({
        id: a.id,
        source: "activity",
        prospectId: a.prospect.id,
        prospectName: prospectDisplayName(a.prospect),
        snippet: makeSnippet(body, trimmed),
      })
      if (noteHits.length >= NOTE_LIMIT) break
    }
  }

  const [prospectTotal, noteTotalPinned, noteTotalActivity] = await Promise.all([
    db.prospect.count({ where: buildProspectSearchWhere(trimmed) }),
    db.note.count({
      where: { body: { contains: trimmed, mode: "insensitive" } },
    }),
    db.activity.count({
      where: { note: { not: null, contains: trimmed, mode: "insensitive" } },
    }),
  ])

  return {
    prospects: prospectHits,
    notes: noteHits,
    totals: {
      prospects: Math.max(prospectTotal, prospectHits.length),
      notes: noteTotalPinned + noteTotalActivity,
    },
  }
}
