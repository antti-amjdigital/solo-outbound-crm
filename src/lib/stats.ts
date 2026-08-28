import { CallOutcome } from "@prisma/client"

/**
 * A "connect" means you spoke to the target human.
 * Hard nos and bookings count — GATEKEEPER / VOICEMAIL do not (SPEC §6.2).
 */
export const CONNECTED_ISH: readonly CallOutcome[] = [
  CallOutcome.CONNECTED,
  CallOutcome.CALLBACK_REQUESTED,
  CallOutcome.MEETING_BOOKED,
  CallOutcome.NOT_INTERESTED,
] as const

const CONNECTED_ISH_SET = new Set<CallOutcome>(CONNECTED_ISH)

/**
 * Phone attempt: any activity with a call outcome.
 * Booked meetings are stored as type=MEETING_BOOKED (see sequence-engine),
 * so dials ≠ count(type=CALL).
 */
export function isDial(a: { outcome: CallOutcome | null }): boolean {
  return a.outcome != null
}

export function isConnectedIsh(outcome: CallOutcome): boolean {
  return CONNECTED_ISH_SET.has(outcome)
}

export type CallRates = {
  /** Activities with a call outcome (every dial, including wrong numbers). */
  dials: number
  /** CONNECTED + CALLBACK_REQUESTED + MEETING_BOOKED + NOT_INTERESTED */
  connectedIsh: number
  /** outcome = MEETING_BOOKED */
  meetingsBooked: number
  /** connectedIsh / dials */
  connectRate: number | null
  /** meetingsBooked / connectedIsh — "of my connects, how many book" */
  meetingRate: number | null
  /** dials / meetingsBooked — how many calls a meeting costs */
  dialsPerMeeting: number | null
}

/** Pure rates from call outcomes — fixture-tested; UI and SQL both use this. */
export function computeCallRates(outcomes: readonly CallOutcome[]): CallRates {
  const dials = outcomes.length
  let connectedIsh = 0
  let meetingsBooked = 0
  for (const o of outcomes) {
    if (CONNECTED_ISH_SET.has(o)) connectedIsh += 1
    if (o === CallOutcome.MEETING_BOOKED) meetingsBooked += 1
  }
  return {
    dials,
    connectedIsh,
    meetingsBooked,
    connectRate: dials === 0 ? null : connectedIsh / dials,
    meetingRate: connectedIsh === 0 ? null : meetingsBooked / connectedIsh,
    dialsPerMeeting: meetingsBooked === 0 ? null : dials / meetingsBooked,
  }
}

export type PickupBuckets = {
  spoke: number
  gatekeeper: number
  voicemail: number
  /** NO_ANSWER + WRONG_NUMBER */
  noAnswer: number
}

export function computePickupBuckets(
  outcomes: readonly CallOutcome[],
): PickupBuckets {
  const buckets: PickupBuckets = {
    spoke: 0,
    gatekeeper: 0,
    voicemail: 0,
    noAnswer: 0,
  }
  for (const o of outcomes) {
    if (CONNECTED_ISH_SET.has(o)) buckets.spoke += 1
    else if (o === CallOutcome.GATEKEEPER) buckets.gatekeeper += 1
    else if (o === CallOutcome.VOICEMAIL) buckets.voicemail += 1
    else buckets.noAnswer += 1
  }
  return buckets
}

/** prospects with a MEETING_BOOKED activity / prospects enrolled (SPEC §6.2) */
export function prospectMeetingRate(
  meetingProspects: number,
  enrolled: number,
): number | null {
  return enrolled === 0 ? null : meetingProspects / enrolled
}

export type FunnelStep = {
  order: number
  label: string
  /** distinct prospectId with Activity.stepOrder >= order */
  reached: number
  completed: number
  connects: number
  booked: number
  dropPct: number | null
}

export function buildFunnel(
  steps: { order: number; label: string }[],
  rows: { prospectId: string; stepOrder: number | null; outcome: CallOutcome | null }[],
): FunnelStep[] {
  const funnel: FunnelStep[] = steps.map((step) => {
    const reached = new Set(
      rows
        .filter((r) => r.stepOrder != null && r.stepOrder >= step.order)
        .map((r) => r.prospectId),
    ).size
    const atStep = rows.filter((r) => r.stepOrder === step.order)
    return {
      order: step.order,
      label: step.label,
      reached,
      completed: atStep.length,
      connects: atStep.filter((r) => r.outcome && CONNECTED_ISH_SET.has(r.outcome))
        .length,
      booked: atStep.filter((r) => r.outcome === CallOutcome.MEETING_BOOKED)
        .length,
      dropPct: null,
    }
  })
  for (let i = 1; i < funnel.length; i++) {
    const prev = funnel[i - 1].reached
    funnel[i].dropPct =
      prev === 0 ? null : (prev - funnel[i].reached) / prev
  }
  return funnel
}

export type StepRank = {
  order: number
  label: string
  completed: number
  booked: number
  /** meetings booked per 100 completed steps */
  per100: number
}

export function rankSteps(
  steps: { order: number; label: string }[],
  rows: { stepOrder: number | null; outcome: CallOutcome | null }[],
): StepRank[] {
  return steps
    .map((step) => {
      const atStep = rows.filter((r) => r.stepOrder === step.order)
      const completed = atStep.length
      const booked = atStep.filter(
        (r) => r.outcome === CallOutcome.MEETING_BOOKED,
      ).length
      return {
        order: step.order,
        label: step.label,
        completed,
        booked,
        per100: completed === 0 ? 0 : (booked / completed) * 100,
      }
    })
    .sort((a, b) => b.per100 - a.per100)
}

export type WeekPoint = {
  label: string
  dials: number
  connects: number
  meetings: number
}

export type HeatCell = { weekIndex: number; weekday: number; dials: number }
export type SparkPoint = { i: number; v: number }

export function sparkSeries(
  weekly: WeekPoint[],
  pick: (p: WeekPoint) => number,
): SparkPoint[] {
  return weekly.map((p, i) => ({ i, v: pick(p) }))
}

export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return (current - previous) / previous
}

export function deltaPp(
  current: number | null,
  previous: number | null,
): number | null {
  if (current == null || previous == null) return null
  return current - previous
}
