import { CallOutcome } from "@prisma/client"
import { toCalendarDate } from "@/lib/dates"
import { addCalendarDays, mondayOf } from "@/lib/queue-filters"
import {
  isConnectedIsh,
  isDial,
  type HeatCell,
  type WeekPoint,
} from "@/lib/stats"

type DialRow = {
  outcome: CallOutcome | null
  occurredAt: Date
}

export function buildWeekly(
  rows: DialRow[],
  weeks: number,
  endDay: Date,
): WeekPoint[] {
  const startMon = addCalendarDays(mondayOf(endDay), -(weeks - 1) * 7)
  const points: WeekPoint[] = Array.from({ length: weeks }, (_, i) => ({
    label: `W${i + 1}`,
    dials: 0,
    connects: 0,
    meetings: 0,
  }))
  const weekMs = 7 * 24 * 60 * 60 * 1000
  for (const row of rows) {
    if (!isDial(row)) continue
    const day = toCalendarDate(row.occurredAt)
    const idx = Math.round((mondayOf(day).getTime() - startMon.getTime()) / weekMs)
    if (idx < 0 || idx >= weeks) continue
    points[idx].dials += 1
    if (isConnectedIsh(row.outcome!)) points[idx].connects += 1
    if (row.outcome === CallOutcome.MEETING_BOOKED) points[idx].meetings += 1
  }
  return points
}

export function buildHeatmap(
  rows: DialRow[],
  weeks: number,
  endDay: Date,
): HeatCell[] {
  const startMon = addCalendarDays(mondayOf(endDay), -(weeks - 1) * 7)
  const cells: HeatCell[] = []
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 5; d++) cells.push({ weekIndex: w, weekday: d, dials: 0 })
  }
  const weekMs = 7 * 24 * 60 * 60 * 1000
  for (const row of rows) {
    if (!isDial(row)) continue
    const day = toCalendarDate(row.occurredAt)
    const dow = day.getUTCDay()
    if (dow === 0 || dow === 6) continue
    const w = Math.round((mondayOf(day).getTime() - startMon.getTime()) / weekMs)
    if (w < 0 || w >= weeks) continue
    cells[w * 5 + (dow - 1)].dials += 1
  }
  return cells
}
