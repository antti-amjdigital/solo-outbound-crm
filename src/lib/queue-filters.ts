import { StepType } from "@prisma/client"
import { TZDate } from "@date-fns/tz"
import { APP_TZ, appToday, parseCalendarDate } from "@/lib/dates"

const DAY_MS = 24 * 60 * 60 * 1000

export type QueueTypeFilter = "all" | "call" | "email" | "reply" | "linkedin" | "manual"
export type QueueRangeFilter =
  | "overdue"
  | "today"
  | "tomorrow"
  | "week"
  | "next"
  | "custom"

export type TodayQueueFilters = {
  type: QueueTypeFilter
  range: QueueRangeFilter
  from?: string
  to?: string
}

export const TYPE_MAP: Record<Exclude<QueueTypeFilter, "all">, StepType> = {
  call: StepType.CALL,
  email: StepType.EMAIL,
  reply: StepType.EMAIL_REPLY,
  linkedin: StepType.LINKEDIN,
  manual: StepType.MANUAL,
}

export function addCalendarDays(date: Date, n: number): Date {
  return new Date(date.getTime() + n * DAY_MS)
}

/** Instant bounds for a calendar date in APP_TZ. */
export function appDayBounds(calendarDate: Date): { start: Date; end: Date } {
  const y = calendarDate.getUTCFullYear()
  const m = calendarDate.getUTCMonth()
  const d = calendarDate.getUTCDate()
  const start = new TZDate(y, m, d, 0, 0, 0, 0, APP_TZ)
  const end = new TZDate(y, m, d + 1, 0, 0, 0, 0, APP_TZ)
  return { start: new Date(start.getTime()), end: new Date(end.getTime()) }
}

export function mondayOf(day: Date): Date {
  const dow = day.getUTCDay()
  const back = dow === 0 ? 6 : dow - 1
  return addCalendarDays(day, -back)
}

export function nextMonday(from: Date = appToday()): Date {
  const mon = mondayOf(from)
  return mon.getTime() <= from.getTime() ? addCalendarDays(mon, 7) : mon
}

export function dueRange(
  range: QueueRangeFilter,
  today: Date,
  from?: string,
  to?: string,
): { gte?: Date; lte?: Date } | "overdue" {
  if (range === "overdue") return "overdue"
  if (range === "today") return { lte: today }
  if (range === "tomorrow") {
    const t = addCalendarDays(today, 1)
    return { gte: t, lte: t }
  }
  if (range === "week") {
    const mon = mondayOf(today)
    return { gte: mon, lte: addCalendarDays(mon, 6) }
  }
  if (range === "next") {
    const mon = addCalendarDays(mondayOf(today), 7)
    return { gte: mon, lte: addCalendarDays(mon, 6) }
  }
  if (range === "custom" && from && to) {
    return { gte: parseCalendarDate(from), lte: parseCalendarDate(to) }
  }
  return { lte: today }
}

export function parseQueueFilters(
  raw: Record<string, string | string[] | undefined>,
): TodayQueueFilters {
  const one = (k: string) => {
    const v = raw[k]
    return Array.isArray(v) ? v[0] : v
  }
  const typeRaw = one("type") ?? "all"
  const rangeRaw = one("range") ?? "today"
  const types = ["all", "call", "email", "reply", "linkedin", "manual"] as const
  const ranges = ["overdue", "today", "tomorrow", "week", "next", "custom"] as const
  return {
    type: types.includes(typeRaw as QueueTypeFilter)
      ? (typeRaw as QueueTypeFilter)
      : "all",
    range: ranges.includes(rangeRaw as QueueRangeFilter)
      ? (rangeRaw as QueueRangeFilter)
      : "today",
    from: one("from"),
    to: one("to"),
  }
}

export function overdueDays(dueDate: Date, today: Date = appToday()): number {
  return Math.max(0, Math.round((today.getTime() - dueDate.getTime()) / DAY_MS))
}

export function hrefWithParams(
  base: Record<string, string | undefined>,
  patch: Record<string, string | undefined>,
): string {
  const merged = { ...base, ...patch }
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(merged)) {
    if (v && v.length > 0) sp.set(k, v)
  }
  const qs = sp.toString()
  return qs ? `/?${qs}` : "/"
}
