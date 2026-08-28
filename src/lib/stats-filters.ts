import { TZDate } from "@date-fns/tz"
import {
  APP_TZ,
  appToday,
  formatCalendarDate,
  parseCalendarDate,
} from "@/lib/dates"
import { addCalendarDays } from "@/lib/queue-filters"

export type StatsPeriod = "7d" | "30d" | "90d" | "quarter" | "custom"

export type StatsFilters = {
  period: StatsPeriod
  sequenceId: string | "all"
  from?: string
  to?: string
}

export type InstantRange = {
  /** Inclusive start instant (APP_TZ midnight of first day). */
  start: Date
  /** Exclusive end instant (APP_TZ midnight after last day). */
  end: Date
  /** First calendar day (UTC midnight). */
  fromDay: Date
  /** Last calendar day inclusive (UTC midnight). */
  toDay: Date
  label: string
}

const PERIODS: StatsPeriod[] = ["7d", "30d", "90d", "quarter", "custom"]

export const PERIOD_LABEL: Record<StatsPeriod, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  quarter: "This quarter",
  custom: "Custom",
}

function one(
  raw: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = raw[key]
  return Array.isArray(v) ? v[0] : v
}

export function parseStatsFilters(
  raw: Record<string, string | string[] | undefined>,
): StatsFilters {
  const periodRaw = one(raw, "period") ?? "30d"
  const period = PERIODS.includes(periodRaw as StatsPeriod)
    ? (periodRaw as StatsPeriod)
    : "30d"
  return {
    period,
    sequenceId: one(raw, "sequence") ?? "all",
    from: one(raw, "from"),
    to: one(raw, "to"),
  }
}

function dayStartInstant(calendarDate: Date): Date {
  const y = calendarDate.getUTCFullYear()
  const m = calendarDate.getUTCMonth()
  const d = calendarDate.getUTCDate()
  return new Date(new TZDate(y, m, d, 0, 0, 0, 0, APP_TZ).getTime())
}

function quarterStart(today: Date): Date {
  const q = Math.floor(today.getUTCMonth() / 3) * 3
  return new Date(Date.UTC(today.getUTCFullYear(), q, 1, 0, 0, 0, 0))
}

/** Resolve the selected period to an instant range in APP_TZ. */
export function resolvePeriod(
  filters: StatsFilters,
  today: Date = appToday(),
): InstantRange {
  if (filters.period === "custom" && filters.from && filters.to) {
    const fromDay = parseCalendarDate(filters.from)
    const toDay = parseCalendarDate(filters.to)
    const start = dayStartInstant(fromDay)
    const end = dayStartInstant(addCalendarDays(toDay, 1))
    return {
      start,
      end,
      fromDay,
      toDay,
      label: `${formatCalendarDate(fromDay)} → ${formatCalendarDate(toDay)}`,
    }
  }

  if (filters.period === "quarter") {
    const fromDay = quarterStart(today)
    const toDay = today
    return {
      start: dayStartInstant(fromDay),
      end: dayStartInstant(addCalendarDays(toDay, 1)),
      fromDay,
      toDay,
      label: PERIOD_LABEL.quarter,
    }
  }

  const days =
    filters.period === "7d" ? 7 : filters.period === "90d" ? 90 : 30
  const toDay = today
  const fromDay = addCalendarDays(today, -(days - 1))
  return {
    start: dayStartInstant(fromDay),
    end: dayStartInstant(addCalendarDays(toDay, 1)),
    fromDay,
    toDay,
    label: PERIOD_LABEL[filters.period],
  }
}

/** Previous window of equal length, ending the day before `range.fromDay`. */
export function previousPeriod(range: InstantRange): InstantRange {
  const len =
    Math.round(
      (range.toDay.getTime() - range.fromDay.getTime()) / (24 * 60 * 60 * 1000),
    ) + 1
  const toDay = addCalendarDays(range.fromDay, -1)
  const fromDay = addCalendarDays(toDay, -(len - 1))
  return {
    start: dayStartInstant(fromDay),
    end: dayStartInstant(addCalendarDays(toDay, 1)),
    fromDay,
    toDay,
    label: "Previous period",
  }
}

export function statsHref(
  base: StatsFilters,
  patch: Partial<StatsFilters>,
): string {
  const merged = { ...base, ...patch }
  const sp = new URLSearchParams()
  if (merged.period !== "30d") sp.set("period", merged.period)
  if (merged.sequenceId !== "all") sp.set("sequence", merged.sequenceId)
  if (merged.period === "custom") {
    if (merged.from) sp.set("from", merged.from)
    if (merged.to) sp.set("to", merged.to)
  }
  const qs = sp.toString()
  return qs ? `/stats?${qs}` : "/stats"
}

/** Count Mon–Fri calendar days in [fromDay, toDay] inclusive. */
export function countWeekdays(fromDay: Date, toDay: Date): number {
  let n = 0
  for (let d = fromDay; d.getTime() <= toDay.getTime(); d = addCalendarDays(d, 1)) {
    const dow = d.getUTCDay()
    if (dow !== 0 && dow !== 6) n += 1
  }
  return Math.max(1, n)
}
