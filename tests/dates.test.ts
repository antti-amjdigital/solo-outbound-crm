import { afterEach, describe, expect, it } from "vitest"
import {
  addBusinessDays,
  appToday,
  formatCalendarDate,
  freezeNow,
  parseCalendarDate,
  toCalendarDate,
} from "../src/lib/dates"

afterEach(() => {
  freezeNow(null)
})

describe("toCalendarDate / appToday", () => {
  it("stores the Helsinki civil day as UTC midnight", () => {
    // 2026-03-15 01:30 UTC = 03:30 EET → still 15 Mar in Helsinki
    const instant = new Date("2026-03-15T01:30:00.000Z")
    expect(formatCalendarDate(toCalendarDate(instant))).toBe("2026-03-15")
  })

  it("uses Helsinki date before UTC midnight crosses the day boundary", () => {
    // 2026-08-24 22:00 UTC = 2026-08-25 01:00 EEST → 25 Aug in Helsinki
    freezeNow(new Date("2026-08-24T22:00:00.000Z"))
    expect(formatCalendarDate(appToday())).toBe("2026-08-25")
  })

  it("stays on the previous Helsinki day in the early UTC morning", () => {
    // 2026-08-25 00:30 UTC = 03:30 EEST → still 25 Aug; pick winter for day-shift
    // 2026-01-15 21:30 UTC = 2026-01-15 23:30 EET → 15 Jan
    freezeNow(new Date("2026-01-15T21:30:00.000Z"))
    expect(formatCalendarDate(appToday())).toBe("2026-01-15")
    // 2026-01-15 22:30 UTC = 2026-01-16 00:30 EET → 16 Jan
    freezeNow(new Date("2026-01-15T22:30:00.000Z"))
    expect(formatCalendarDate(appToday())).toBe("2026-01-16")
  })
})

describe("addBusinessDays", () => {
  it("Thursday + 2 business days is Monday", () => {
    const thursday = parseCalendarDate("2026-08-20")
    expect(formatCalendarDate(addBusinessDays(thursday, 2))).toBe("2026-08-24")
  })

  it("Friday + 1 business day is Monday", () => {
    const friday = parseCalendarDate("2026-08-21")
    expect(formatCalendarDate(addBusinessDays(friday, 1))).toBe("2026-08-24")
  })

  it("skips a holiday that falls on a weekday", () => {
    // Wed 19 Aug treated as a holiday → Tue + 1 business day = Thu
    const tuesday = parseCalendarDate("2026-08-18")
    const holidays = new Set(["2026-08-19"])
    expect(formatCalendarDate(addBusinessDays(tuesday, 1, holidays))).toBe("2026-08-20")
  })

  it("n = 0 returns the same calendar date", () => {
    const day = parseCalendarDate("2026-08-22") // Saturday
    expect(formatCalendarDate(addBusinessDays(day, 0))).toBe("2026-08-22")
  })

  it("Monday + 1 is Tuesday", () => {
    expect(formatCalendarDate(addBusinessDays(parseCalendarDate("2026-08-17"), 1))).toBe(
      "2026-08-18",
    )
  })
})
