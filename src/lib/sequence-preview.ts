import { StepType } from "@prisma/client"
import { addBusinessDays, formatCalendarDate, toCalendarDate } from "./dates"

export type PreviewStepInput = {
  type: StepType
  label: string
  delayDays: number
}

export type PreviewRow =
  | {
      kind: "step"
      date: Date
      type: StepType
      label: string
      delayDays: number
    }
  | {
      kind: "weekend"
      from: Date
      to: Date
    }

export type SchedulePreview = {
  rows: PreviewRow[]
  calendarDays: number
  businessDays: number
  dials: number
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

/** Format a calendar-date (UTC midnight) for the schedule preview. */
export function formatPreviewDate(date: Date): string {
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`
}

function dayAfter(date: Date): Date {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000)
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000))
}

function weekendSpanBetween(prev: Date, next: Date): { from: Date; to: Date } | null {
  let from: Date | null = null
  let to: Date | null = null
  for (let d = dayAfter(prev); d.getTime() < next.getTime(); d = dayAfter(d)) {
    const dow = d.getUTCDay()
    if (dow === 0 || dow === 6) {
      if (!from) from = d
      to = d
    }
  }
  return from && to ? { from, to } : null
}

/**
 * Live schedule if enrolled on `enrolledOn` and each step is completed on its due day.
 * Uses the same `addBusinessDays` as the engine — never reimplement delay math here.
 */
export function buildSchedulePreview(
  steps: PreviewStepInput[],
  enrolledOn: Date,
  holidays: ReadonlySet<string> = new Set(),
): SchedulePreview {
  const start = toCalendarDate(enrolledOn)
  const rows: PreviewRow[] = []
  let cursor = start
  let businessDays = 0
  let dials = 0
  let firstDue: Date | null = null
  let lastDue: Date | null = null

  for (const step of steps) {
    const due = addBusinessDays(cursor, step.delayDays, holidays)
    businessDays += step.delayDays
    if (step.type === StepType.CALL) dials += 1

    if (lastDue) {
      const weekend = weekendSpanBetween(lastDue, due)
      if (weekend) rows.push({ kind: "weekend", ...weekend })
    }

    rows.push({
      kind: "step",
      date: due,
      type: step.type,
      label: step.label,
      delayDays: step.delayDays,
    })

    if (!firstDue) firstDue = due
    lastDue = due
    cursor = due
  }

  const calendarDays =
    firstDue && lastDue ? Math.max(0, daysBetween(firstDue, lastDue)) : 0

  return { rows, calendarDays, businessDays, dials }
}

/** Today plus the next Monday / Friday (always forward) for preview chips. */
export function previewAnchorDates(from: Date): {
  today: Date
  monday: Date
  friday: Date
} {
  const today = toCalendarDate(from)
  const dow = today.getUTCDay() // 0 Sun … 6 Sat

  let mondayOffset = (1 - dow + 7) % 7
  if (mondayOffset === 0) mondayOffset = 7

  let fridayOffset = (5 - dow + 7) % 7
  if (fridayOffset === 0) fridayOffset = 7

  return {
    today,
    monday: toCalendarDate(
      new Date(today.getTime() + mondayOffset * 24 * 60 * 60 * 1000),
    ),
    friday: toCalendarDate(
      new Date(today.getTime() + fridayOffset * 24 * 60 * 60 * 1000),
    ),
  }
}

export function formatWeekendLabel(from: Date, to: Date): string {
  if (formatCalendarDate(from) === formatCalendarDate(to)) {
    return `weekend skipped · ${from.getUTCDate()} ${MONTHS[from.getUTCMonth()]}`
  }
  return `weekend skipped · ${from.getUTCDate()}–${to.getUTCDate()} ${MONTHS[to.getUTCMonth()]}`
}
