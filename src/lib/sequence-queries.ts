import {
  ActivityType,
  CallOutcome,
  EnrollState,
  StepType,
} from "@prisma/client"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"

export type StepStats = {
  done: number
  connects: number
  replies: number
  booked: number
}

export type SequenceEditorData = {
  id: string
  name: string
  isActive: boolean
  steps: {
    id: string
    order: number
    type: StepType
    label: string
    delayDays: number
    template: string | null
    stats: StepStats
  }[]
  midSequenceCount: number
  enrolledAllTime: number
  runningCount: number
  meetingsBooked: number
  dialCount: number
}

const CONNECT_OUTCOMES: CallOutcome[] = [
  CallOutcome.CONNECTED,
  CallOutcome.CALLBACK_REQUESTED,
  CallOutcome.MEETING_BOOKED,
  CallOutcome.NOT_INTERESTED,
]

export async function resolveSequenceId(idOrDefault: string): Promise<string | null> {
  if (idOrDefault !== "default") return idOrDefault
  const first = await db.sequence.findFirst({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true },
  })
  return first?.id ?? null
}

export async function getSequenceEditorData(
  id: string,
): Promise<SequenceEditorData> {
  const sequence = await db.sequence.findUnique({
    where: { id },
    include: { steps: { orderBy: { order: "asc" } } },
  })
  if (!sequence) notFound()

  const [midSequenceCount, enrolledAllTime, runningCount, meetingsBooked, dialCount, activities] =
    await Promise.all([
      db.enrollment.count({
        where: { sequenceId: id, state: EnrollState.RUNNING },
      }),
      db.enrollment.count({ where: { sequenceId: id } }),
      db.enrollment.count({
        where: { sequenceId: id, state: EnrollState.RUNNING },
      }),
      db.activity.count({
        where: {
          sequenceId: id,
          OR: [
            { type: ActivityType.MEETING_BOOKED },
            { outcome: CallOutcome.MEETING_BOOKED },
          ],
        },
      }),
      db.activity.count({
        where: { sequenceId: id, type: ActivityType.CALL },
      }),
      db.activity.findMany({
        where: { sequenceId: id, stepOrder: { not: null } },
        select: { stepOrder: true, type: true, outcome: true },
      }),
    ])

  const byOrder = new Map<number, StepStats>()
  for (const step of sequence.steps) {
    byOrder.set(step.order, { done: 0, connects: 0, replies: 0, booked: 0 })
  }

  for (const a of activities) {
    if (a.stepOrder == null) continue
    const bucket = byOrder.get(a.stepOrder)
    if (!bucket) continue
    bucket.done += 1
    if (a.outcome && CONNECT_OUTCOMES.includes(a.outcome)) bucket.connects += 1
    if (
      a.type === ActivityType.EMAIL_REPLY_RECEIVED ||
      a.type === ActivityType.EMAIL_REPLY_SENT
    ) {
      bucket.replies += 1
    }
    if (
      a.type === ActivityType.MEETING_BOOKED ||
      a.outcome === CallOutcome.MEETING_BOOKED
    ) {
      bucket.booked += 1
    }
  }

  return {
    id: sequence.id,
    name: sequence.name,
    isActive: sequence.isActive,
    steps: sequence.steps.map((s) => ({
      id: s.id,
      order: s.order,
      type: s.type,
      label: s.label,
      delayDays: s.delayDays,
      template: s.template,
      stats: byOrder.get(s.order) ?? {
        done: 0,
        connects: 0,
        replies: 0,
        booked: 0,
      },
    })),
    midSequenceCount,
    enrolledAllTime,
    runningCount,
    meetingsBooked,
    dialCount,
  }
}
