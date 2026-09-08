import {
  ActivityType,
  CallOutcome,
  EnrollState,
  ProspectStatus,
  StepType,
  TaskStatus,
} from "@prisma/client"
import { db as defaultDb } from "./db"
import { addBusinessDays, appToday, toCalendarDate } from "./dates"

// PrismaClient | transaction client — kept loose so tests can inject a memory db.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any

export type CompleteTaskInput = {
  outcome?: CallOutcome
  note?: string
  nextDueDate?: Date
  durationSec?: number
}

export type EnrollOptions = { delayBusinessDays?: number }

function activityType(type: StepType, outcome?: CallOutcome): ActivityType {
  if (outcome === CallOutcome.MEETING_BOOKED) return ActivityType.MEETING_BOOKED
  if (type === StepType.EMAIL) return ActivityType.EMAIL_SENT
  if (type === StepType.EMAIL_REPLY) return ActivityType.EMAIL_REPLY_SENT
  if (type === StepType.CALL) return ActivityType.CALL
  return ActivityType.NOTE
}

async function cancelOpen(
  client: Client,
  where: { prospectId?: string; enrollmentId?: string },
) {
  await client.task.updateMany({
    where: { ...where, status: TaskStatus.OPEN },
    data: { status: TaskStatus.CANCELLED },
  })
}

async function materialise(
  client: Client,
  args: {
    prospectId: string
    enrollmentId: string
    step: { order: number; type: StepType; label: string }
    dueDate: Date
  },
) {
  return client.task.create({
    data: {
      prospectId: args.prospectId,
      enrollmentId: args.enrollmentId,
      type: args.step.type,
      label: args.step.label,
      stepOrder: args.step.order,
      dueDate: toCalendarDate(args.dueDate),
      status: TaskStatus.OPEN,
    },
  })
}

async function advance(
  client: Client,
  enrollment: { id: string; prospectId: string; sequenceId: string; currentStepOrder: number },
  nextDueDate?: Date,
) {
  const next = await client.sequenceStep.findFirst({
    where: { sequenceId: enrollment.sequenceId, order: { gt: enrollment.currentStepOrder } },
    orderBy: { order: "asc" },
  })
  if (!next) {
    await client.enrollment.update({
      where: { id: enrollment.id },
      data: { state: EnrollState.FINISHED, finishedAt: new Date(), exitReason: "completed" },
    })
    return null
  }
  const due =
    nextDueDate !== undefined
      ? toCalendarDate(nextDueDate)
      : addBusinessDays(appToday(), next.delayDays)
  return materialise(client, {
    prospectId: enrollment.prospectId,
    enrollmentId: enrollment.id,
    step: next,
    dueDate: due,
  })
}

export async function enrollProspect(
  prospectId: string,
  sequenceId: string,
  options: EnrollOptions = {},
  client: Client = defaultDb,
) {
  return client.$transaction(async (tx: Client) => {
    const existing = await tx.enrollment.findFirst({
      where: { prospectId, state: EnrollState.RUNNING },
    })
    if (existing) throw new Error("Prospect already has a running enrollment")

    const sequence = await tx.sequence.findUnique({
      where: { id: sequenceId },
      include: { steps: true },
    })
    if (!sequence?.steps.length) throw new Error("Sequence has no steps")

    const enrollment = await tx.enrollment.create({
      data: { prospectId, sequenceId, currentStepOrder: 0, state: EnrollState.RUNNING },
    })
    await tx.prospect.update({
      where: { id: prospectId },
      data: { status: ProspectStatus.ACTIVE, deadReason: null },
    })

    const first = [...sequence.steps].sort(
      (a: { order: number }, b: { order: number }) => a.order - b.order,
    )[0]
    const task = await materialise(tx, {
      prospectId,
      enrollmentId: enrollment.id,
      step: first,
      dueDate: addBusinessDays(appToday(), (options.delayBusinessDays ?? 0) + first.delayDays),
    })
    return { enrollment, task }
  })
}

export async function completeTask(
  taskId: string,
  input: CompleteTaskInput = {},
  client: Client = defaultDb,
) {
  return client.$transaction(async (tx: Client) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      include: { enrollment: true },
    })
    if (!task) throw new Error("Task not found")
    if (task.status !== TaskStatus.OPEN) throw new Error("Task is not open")

    const enrollment = task.enrollment
    const activity = await tx.activity.create({
      data: {
        prospectId: task.prospectId,
        type: activityType(task.type, input.outcome),
        outcome: input.outcome ?? null,
        stepOrder: task.stepOrder,
        sequenceId: enrollment?.sequenceId ?? null,
        note: input.note ?? null,
        durationSec: input.durationSec ?? null,
      },
    })
    await tx.task.update({
      where: { id: task.id },
      data: { status: TaskStatus.DONE, completedAt: new Date(), activityId: activity.id },
    })

    if (!enrollment || enrollment.state !== EnrollState.RUNNING) {
      return { activity, nextTask: null }
    }

    const { outcome } = input

    if (outcome === CallOutcome.CALLBACK_REQUESTED) {
      if (!input.nextDueDate) throw new Error("CALLBACK_REQUESTED requires nextDueDate")
      if (task.stepOrder == null) throw new Error("Task has no stepOrder")
      const nextTask = await materialise(tx, {
        prospectId: task.prospectId,
        enrollmentId: enrollment.id,
        step: { order: task.stepOrder, type: task.type, label: task.label },
        dueDate: input.nextDueDate,
      })
      return { activity, nextTask }
    }

    if (
      outcome === CallOutcome.MEETING_BOOKED ||
      outcome === CallOutcome.NOT_INTERESTED ||
      outcome === CallOutcome.WRONG_NUMBER
    ) {
      await cancelOpen(tx, { prospectId: task.prospectId })
      const booked = outcome === CallOutcome.MEETING_BOOKED
      await tx.prospect.update({
        where: { id: task.prospectId },
        data: booked
          ? { status: ProspectStatus.MEETING_BOOKED, deadReason: null }
          : {
              status: ProspectStatus.DEAD,
              deadReason:
                outcome === CallOutcome.NOT_INTERESTED ? "not_interested" : "wrong_number",
            },
      })
      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: {
          state: EnrollState.FINISHED,
          finishedAt: new Date(),
          exitReason: booked ? "meeting_booked" : "dead",
          currentStepOrder: task.stepOrder ?? undefined,
        },
      })
      return { activity, nextTask: null }
    }

    const currentStepOrder = task.stepOrder ?? enrollment.currentStepOrder
    await tx.enrollment.update({ where: { id: enrollment.id }, data: { currentStepOrder } })
    const nextTask = await advance(tx, { ...enrollment, currentStepOrder }, input.nextDueDate)
    return { activity, nextTask }
  })
}

export async function skipTask(taskId: string, client: Client = defaultDb) {
  return client.$transaction(async (tx: Client) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      include: { enrollment: true },
    })
    if (!task) throw new Error("Task not found")
    if (task.status !== TaskStatus.OPEN) throw new Error("Task is not open")

    await tx.task.update({
      where: { id: task.id },
      data: { status: TaskStatus.SKIPPED, completedAt: new Date() },
    })
    const enrollment = task.enrollment
    if (!enrollment || enrollment.state !== EnrollState.RUNNING) return { nextTask: null }

    const currentStepOrder = task.stepOrder ?? enrollment.currentStepOrder
    await tx.enrollment.update({ where: { id: enrollment.id }, data: { currentStepOrder } })
    return { nextTask: await advance(tx, { ...enrollment, currentStepOrder }) }
  })
}

const AD_HOC_TYPES = new Set<StepType>([
  StepType.CALL,
  StepType.EMAIL,
  StepType.MANUAL,
])

export async function createAdHocTask(
  prospectId: string,
  input: { type: StepType; label: string; dueDate: Date },
  client: Client = defaultDb,
) {
  if (!AD_HOC_TYPES.has(input.type)) {
    throw new Error("Invalid ad-hoc task type")
  }
  const label = input.label.trim()
  if (!label) throw new Error("Task label is required")

  const prospect = await client.prospect.findUnique({ where: { id: prospectId } })
  if (!prospect) throw new Error("Prospect not found")

  return client.task.create({
    data: {
      prospectId,
      enrollmentId: null,
      stepOrder: null,
      type: input.type,
      label,
      dueDate: toCalendarDate(input.dueDate),
      status: TaskStatus.OPEN,
    },
  })
}

export async function rescheduleTask(
  taskId: string,
  dueDate: Date,
  client: Client = defaultDb,
) {
  const task = await client.task.findUnique({ where: { id: taskId } })
  if (!task) throw new Error("Task not found")
  if (task.status !== TaskStatus.OPEN) throw new Error("Task is not open")
  return client.task.update({
    where: { id: taskId },
    data: { dueDate: toCalendarDate(dueDate) },
  })
}

export async function stopEnrollment(enrollmentId: string, client: Client = defaultDb) {
  return client.$transaction(async (tx: Client) => {
    const enrollment = await tx.enrollment.findUnique({ where: { id: enrollmentId } })
    if (!enrollment) throw new Error("Enrollment not found")
    await cancelOpen(tx, { enrollmentId })
    return tx.enrollment.update({
      where: { id: enrollmentId },
      data: { state: EnrollState.FINISHED, finishedAt: new Date(), exitReason: "manual_stop" },
    })
  })
}

export async function markEmailReplyReceived(
  prospectId: string,
  note?: string,
  client: Client = defaultDb,
) {
  return client.$transaction(async (tx: Client) => {
    const activity = await tx.activity.create({
      data: { prospectId, type: ActivityType.EMAIL_REPLY_RECEIVED, note: note ?? null },
    })
    const enrollment = await tx.enrollment.findFirst({
      where: { prospectId, state: EnrollState.RUNNING },
    })
    if (enrollment) {
      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: { state: EnrollState.PAUSED },
      })
    }
    return { activity, enrollmentId: enrollment?.id ?? null }
  })
}
