import { ActivityType, CallOutcome } from "@prisma/client"
import { db } from "@/lib/db"
import { appToday, formatCalendarDate } from "@/lib/dates"
import { addCalendarDays, mondayOf } from "@/lib/queue-filters"
import {
  buildFunnel,
  computeCallRates,
  computePickupBuckets,
  isDial,
  prospectMeetingRate,
  rankSteps,
  sparkSeries,
  type CallRates,
  type FunnelStep,
  type HeatCell,
  type PickupBuckets,
  type SparkPoint,
  type StepRank,
  type WeekPoint,
} from "@/lib/stats"
import {
  countWeekdays,
  parseStatsFilters,
  previousPeriod,
  resolvePeriod,
  type InstantRange,
  type StatsFilters,
} from "@/lib/stats-filters"
import { buildHeatmap, buildWeekly } from "@/lib/stats-series"

type ActivityRow = {
  type: ActivityType
  outcome: CallOutcome | null
  prospectId: string
  stepOrder: number | null
  sequenceId: string | null
  occurredAt: Date
}

export type StatsDashboard = {
  filters: StatsFilters
  range: InstantRange
  sequenceName: string | null
  sequences: { id: string; name: string }[]
  enrolledForFunnel: number
  current: CallRates
  previous: CallRates
  emailsSent: number
  prospectsTouched: number
  newEnrollments: number
  prospectToMeeting: number | null
  pickup: PickupBuckets
  weekly: WeekPoint[]
  funnel: FunnelStep[]
  meetingsByStep: { order: number; label: string; booked: number }[]
  heatmap: HeatCell[]
  ranks: StepRank[]
  dialSpark: SparkPoint[]
  connectSpark: SparkPoint[]
  meetingSpark: SparkPoint[]
  dialsPerMeetingSpark: SparkPoint[]
  weekdays: number
}

async function loadActivities(
  range: InstantRange,
  sequenceId: string | "all",
): Promise<ActivityRow[]> {
  return db.activity.findMany({
    where: {
      occurredAt: { gte: range.start, lt: range.end },
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
  })
}

/** Trailing N weeks ending today — for consistency charts, not the KPI period. */
function trailingWeeksRange(weeks: number, endDay: Date = appToday()): InstantRange {
  const lastMon = mondayOf(endDay)
  const fromDay = addCalendarDays(lastMon, -(weeks - 1) * 7)
  return resolvePeriod({
    period: "custom",
    sequenceId: "all",
    from: formatCalendarDate(fromDay),
    to: formatCalendarDate(endDay),
  })
}

export async function getStatsDashboard(
  raw: Record<string, string | string[] | undefined>,
): Promise<StatsDashboard> {
  const filters = parseStatsFilters(raw)
  const range = resolvePeriod(filters)
  const prev = previousPeriod(range)
  const chartRange = trailingWeeksRange(13)
  const seqId = filters.sequenceId

  const sequences = await db.sequence.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
  const activeSeq =
    seqId !== "all"
      ? sequences.find((s) => s.id === seqId) ?? null
      : sequences[0] ?? null

  const [currentRows, prevRows, chartRows, newEnrollments, funnelSteps, enrolledForFunnel] =
    await Promise.all([
      loadActivities(range, seqId),
      loadActivities(prev, seqId),
      loadActivities(chartRange, seqId),
      db.enrollment.count({
        where: {
          startedAt: { gte: range.start, lt: range.end },
          ...(seqId !== "all" ? { sequenceId: seqId } : {}),
        },
      }),
      activeSeq
        ? db.sequenceStep.findMany({
            where: { sequenceId: activeSeq.id },
            orderBy: { order: "asc" },
          })
        : Promise.resolve([]),
      activeSeq
        ? db.enrollment.count({ where: { sequenceId: activeSeq.id } })
        : Promise.resolve(0),
    ])

  const funnelRows =
    activeSeq && seqId === "all"
      ? currentRows.filter((r) => r.sequenceId === activeSeq.id)
      : currentRows
  const outcomes = currentRows.filter(isDial).map((r) => r.outcome!)
  const current = computeCallRates(outcomes)
  const previous = computeCallRates(prevRows.filter(isDial).map((r) => r.outcome!))
  const weekly = buildWeekly(chartRows, 12, appToday())
  const meetingProspects = new Set(
    currentRows
      .filter(
        (r) =>
          r.type === ActivityType.MEETING_BOOKED ||
          r.outcome === CallOutcome.MEETING_BOOKED,
      )
      .map((r) => r.prospectId),
  ).size

  return {
    filters,
    range,
    sequenceName: activeSeq?.name ?? null,
    sequences,
    enrolledForFunnel,
    current,
    previous,
    emailsSent: currentRows.filter(
      (r) =>
        r.type === ActivityType.EMAIL_SENT ||
        r.type === ActivityType.EMAIL_REPLY_SENT,
    ).length,
    prospectsTouched: new Set(currentRows.map((r) => r.prospectId)).size,
    newEnrollments,
    prospectToMeeting: prospectMeetingRate(meetingProspects, newEnrollments),
    pickup: computePickupBuckets(outcomes),
    weekly,
    funnel: buildFunnel(funnelSteps, funnelRows),
    meetingsByStep: funnelSteps
      .map((step) => ({
        order: step.order,
        label: step.label,
        booked: funnelRows.filter(
          (r) =>
            r.stepOrder === step.order &&
            r.outcome === CallOutcome.MEETING_BOOKED,
        ).length,
      }))
      .filter((s) => s.booked > 0),
    heatmap: buildHeatmap(chartRows, 13, appToday()),
    ranks: rankSteps(funnelSteps, funnelRows),
    dialSpark: sparkSeries(weekly, (p) => p.dials),
    connectSpark: sparkSeries(weekly, (p) =>
      p.dials === 0 ? 0 : p.connects / p.dials,
    ),
    meetingSpark: sparkSeries(weekly, (p) => p.meetings),
    dialsPerMeetingSpark: sparkSeries(weekly, (p) =>
      p.meetings === 0 ? 0 : p.dials / p.meetings,
    ),
    weekdays: countWeekdays(range.fromDay, range.toDay),
  }
}
