import { TZDate } from "@date-fns/tz"

/** All "what day is it?" questions go through Europe/Helsinki. */
export const APP_TZ = "Europe/Helsinki"

let frozenNow: Date | null = null

/** Test-only: freeze "now" for deterministic business-day math. Pass null to clear. */
export function freezeNow(now: Date | null): void {
  frozenNow = now
}

function currentInstant(): Date {
  return frozenNow ?? new Date()
}

/** Calendar date as UTC midnight for the civil day in APP_TZ. */
export function toCalendarDate(instant: Date): Date {
  const zoned = new TZDate(instant, APP_TZ)
  return new Date(
    Date.UTC(zoned.getFullYear(), zoned.getMonth(), zoned.getDate(), 0, 0, 0, 0),
  )
}

/** Today's calendar date in APP_TZ, stored as UTC midnight. */
export function appToday(): Date {
  return toCalendarDate(currentInstant())
}

/** YYYY-MM-DD for a calendar-date value (UTC midnight of that day). */
export function formatCalendarDate(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, "0")
  const d = String(date.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function parseCalendarDate(isoDay: string): Date {
  const [y, m, d] = isoDay.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0))
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay()
  return day === 0 || day === 6
}

function isHoliday(date: Date, holidays: ReadonlySet<string>): boolean {
  return holidays.has(formatCalendarDate(date))
}

function isBusinessDay(date: Date, holidays: ReadonlySet<string>): boolean {
  return !isWeekend(date) && !isHoliday(date, holidays)
}

/**
 * Add `n` business days to a calendar date, skipping weekends and holidays.
 * `n = 0` returns the same calendar date (even if it falls on a weekend).
 */
export function addBusinessDays(
  date: Date,
  n: number,
  holidays: ReadonlySet<string> = new Set(),
): Date {
  const start = toCalendarDate(date)
  if (n === 0) return start

  const step = n > 0 ? 1 : -1
  let remaining = Math.abs(n)
  let cursor = start

  while (remaining > 0) {
    cursor = new Date(cursor.getTime() + step * 24 * 60 * 60 * 1000)
    if (isBusinessDay(cursor, holidays)) remaining -= 1
  }

  return cursor
}
