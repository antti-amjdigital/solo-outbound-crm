import { ActivityType, CallOutcome } from "@prisma/client"
import { db } from "@/lib/db"
import type { InstantRange } from "@/lib/stats-filters"

export type ActivityRow = {
  type: ActivityType
  outcome: CallOutcome | null
  prospectId: string
  stepOrder: number | null
  sequenceId: string | null
  occurredAt: Date
}

type Window = { start: number; end: number }

/** Merge overlapping / touching [start, end) windows so each is fetched once. */
function mergeWindows(ranges: readonly InstantRange[]): Window[] {
  const sorted = ranges
    .map((r) => ({ start: r.start.getTime(), end: r.end.getTime() }))
    .sort((a, b) => a.start - b.start)
  const merged: Window[] = []
  for (const w of sorted) {
    const last = merged[merged.length - 1]
    if (last && w.start <= last.end) {
      last.end = Math.max(last.end, w.end)
    } else {
      merged.push({ ...w })
    }
  }
  return merged
}

function inRange(row: ActivityRow, r: InstantRange): boolean {
  const t = row.occurredAt.getTime()
  return t >= r.start.getTime() && t < r.end.getTime()
}

/**
 * Load activities for several instant ranges at once. The KPI period, the
 * comparison period and the 13-week chart window usually overlap, so this
 * collapses three queries into one (or two when a custom period is far back)
 * and partitions the rows in memory. Semantics per range are unchanged:
 * `occurredAt >= start AND occurredAt < end`.
 */
export async function loadActivityWindows<const K extends string>(
  ranges: Record<K, InstantRange>,
  sequenceId: string | "all",
): Promise<Record<K, ActivityRow[]>> {
  const keys = Object.keys(ranges) as K[]
  const windows = mergeWindows(keys.map((k) => ranges[k]))

  const batches = await Promise.all(
    windows.map((w) =>
      db.activity.findMany({
        where: {
          occurredAt: { gte: new Date(w.start), lt: new Date(w.end) },
          ...(sequenceId !== "all" ? { sequenceId } : {}),
        },
        select: {
          type: true,
          outcome: true,
          prospectId: true,
          stepOrder: true,
          sequenceId: true,
          occurredAt: true,
        },
      }),
    ),
  )
  const rows = batches.flat()

  const out = {} as Record<K, ActivityRow[]>
  for (const k of keys) out[k] = rows.filter((r) => inRange(r, ranges[k]))
  return out
}

export type SequenceSummary = {
  id: string
  name: string
  /** All-time enrollments — the funnel denominator. */
  enrolled: number
  /** Most recent enrollment start, or 0 if never used. */
  lastEnrolledAt: number
  steps: { order: number; label: string }[]
}

/**
 * Every sequence with its step list and enrollment summary in one parallel
 * batch (three flat queries, no nested relation round trips), ordered by most
 * recent enrollment then name.
 */
export async function loadSequenceSummaries(): Promise<SequenceSummary[]> {
  const [sequences, steps, enrollmentAgg] = await Promise.all([
    db.sequence.findMany({ select: { id: true, name: true } }),
    db.sequenceStep.findMany({
      select: { sequenceId: true, order: true, label: true },
      orderBy: { order: "asc" },
    }),
    db.enrollment.groupBy({
      by: ["sequenceId"],
      _count: { _all: true },
      _max: { startedAt: true },
    }),
  ])

  const agg = new Map(
    enrollmentAgg.map((e) => [
      e.sequenceId,
      {
        enrolled: e._count._all,
        lastEnrolledAt: e._max.startedAt?.getTime() ?? 0,
      },
    ]),
  )
  const stepsBySeq = new Map<string, SequenceSummary["steps"]>()
  for (const s of steps) {
    const list = stepsBySeq.get(s.sequenceId) ?? []
    list.push({ order: s.order, label: s.label })
    stepsBySeq.set(s.sequenceId, list)
  }

  return sequences
    .map((s) => ({
      id: s.id,
      name: s.name,
      enrolled: agg.get(s.id)?.enrolled ?? 0,
      lastEnrolledAt: agg.get(s.id)?.lastEnrolledAt ?? 0,
      steps: stepsBySeq.get(s.id) ?? [],
    }))
    .sort((a, b) => {
      if (b.lastEnrolledAt !== a.lastEnrolledAt) {
        return b.lastEnrolledAt - a.lastEnrolledAt
      }
      return a.name.localeCompare(b.name)
    })
}
