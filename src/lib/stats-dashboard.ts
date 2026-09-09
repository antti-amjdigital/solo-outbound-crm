import { ActivityType, CallOutcome } from "@prisma/client"
import { db } from "@/lib/db"
import { appToday, formatCalendarDate } from "@/lib/dates"
import { addCalendarDays, mondayOf } from "@/lib/queue-filters"
import {
  buildFunnel,
  computeCallRates,
  computePickupBuckets,
  isConnectedIsh,
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
import {
  loadActivityWindows,
  loadSequenceSummaries,
  type ActivityRow,
} from "@/lib/stats-loaders"
import { buildHeatmap, buildWeekly } from "@/lib/stats-series"
import type { FunnelStages } from "@/lib/stats-constants"

export type StatsDashboard = {
  filters: StatsFilters
  range: InstantRange
  sequenceName: string | null
  sequences: { id: string; name: string }[]
  enrolledForFunnel: number
  funnelStages: FunnelStages
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

function buildFunnelStages(
  enrolled: number,
  rows: ActivityRow[],
): FunnelStages {
  const contacted = new Set<string>()
  const connected = new Set<string>()
  const meetings = new Set<string>()
  for (const r of rows) {
    if (isDial(r)) contacted.add(r.prospectId)
    if (r.outcome && isConnectedIsh(r.outcome)) connected.add(r.prospectId)
    if (
      r.type === ActivityType.MEETING_BOOKED ||
      r.outcome === CallOutcome.MEETING_BOOKED
    ) {
      meetings.add(r.prospectId)
    }
  }
  return {
    enrolled,
    contacted: contacted.size,
    connected: connected.size,
    meetings: meetings.size,
  }
}

export async function getStatsDashboard(
  raw: Record<string, string | string[] | undefined>,
): Promise<StatsDashboard> {
  const filters = parseStatsFilters(raw)
  const range = resolvePeriod(filters)
  const prev = previousPeriod(range)
  const chartRange = trailingWeeksRange(13)
  const seqId = filters.sequenceId

  // Everything the page needs, in a single parallel round trip.
  const [windows, summaries, newEnrollments] = await Promise.all([
    loadActivityWindows({ current: range, prev, chart: chartRange }, seqId),
    loadSequenceSummaries(),
    db.enrollment.count({
      where: {
        startedAt: { gte: range.start, lt: range.end },
        ...(seqId !== "all" ? { sequenceId: seqId } : {}),
      },
    }),
  ])
  const { current: currentRows, prev: prevRows, chart: chartRows } = windows

  const sequences = summaries.map(({ id, name }) => ({ id, name }))
  const activeSeq =
    seqId !== "all"
      ? summaries.find((s) => s.id === seqId) ?? summaries[0] ?? null
      : summaries[0] ?? null
  const funnelSteps = activeSeq?.steps ?? []
  const enrolledForFunnel = activeSeq?.enrolled ?? 0

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
    funnelStages: buildFunnelStages(enrolledForFunnel, funnelRows),
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
