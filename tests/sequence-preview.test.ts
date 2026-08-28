import { afterEach, describe, expect, it } from "vitest"
import { StepType } from "@prisma/client"
import {
  addBusinessDays,
  formatCalendarDate,
  freezeNow,
  parseCalendarDate,
} from "../src/lib/dates"
import {
  buildSchedulePreview,
  formatPreviewDate,
} from "../src/lib/sequence-preview"

afterEach(() => {
  freezeNow(null)
})

const STANDARD = [
  { type: StepType.EMAIL, label: "Personal email", delayDays: 0 },
  { type: StepType.CALL, label: "Call attempt 1", delayDays: 1 },
  { type: StepType.CALL, label: "Call attempt 2", delayDays: 2 },
  { type: StepType.CALL, label: "Call attempt 3", delayDays: 2 },
  { type: StepType.EMAIL_REPLY, label: "Reply to email chain", delayDays: 1 },
]

describe("buildSchedulePreview", () => {
  it("matches engine dates for Standard Outbound enrolled Tuesday", () => {
    // Spec walkthrough is Monday; wireframe uses Tue 4 Aug 2026
    const enrolled = parseCalendarDate("2026-08-04") // Tue
    const preview = buildSchedulePreview(STANDARD, enrolled)
    const stepDates = preview.rows
      .filter((r) => r.kind === "step")
      .map((r) => formatCalendarDate(r.date))

    // Same chain the engine would produce if each task is done on its due day
    let cursor = enrolled
    const engineDates: string[] = []
    for (const step of STANDARD) {
      cursor = addBusinessDays(cursor, step.delayDays)
      engineDates.push(formatCalendarDate(cursor))
    }

    expect(stepDates).toEqual(engineDates)
    expect(stepDates).toEqual([
      "2026-08-04", // Tue email
      "2026-08-05", // Wed call 1
      "2026-08-07", // Fri call 2
      "2026-08-11", // Tue call 3 (weekend skipped)
      "2026-08-12", // Wed reply
    ])
    expect(preview.dials).toBe(3)
    expect(preview.businessDays).toBe(6)
    expect(preview.calendarDays).toBe(8)
  })

  it("inserts a weekend marker between Fri and Tue", () => {
    const enrolled = parseCalendarDate("2026-08-04")
    const preview = buildSchedulePreview(STANDARD, enrolled)
    const weekend = preview.rows.find((r) => r.kind === "weekend")
    expect(weekend?.kind).toBe("weekend")
    if (weekend?.kind === "weekend") {
      expect(formatCalendarDate(weekend.from)).toBe("2026-08-08")
      expect(formatCalendarDate(weekend.to)).toBe("2026-08-09")
    }
  })

  it("formats preview dates without local TZ drift", () => {
    expect(formatPreviewDate(parseCalendarDate("2026-08-04"))).toBe("Tue 4 Aug")
  })
})
