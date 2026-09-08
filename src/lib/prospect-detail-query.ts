import {
  ActivityType,
  EnrollState,
  StepType,
  TaskStatus,
  type Activity,
  type Note,
  type Prospect,
} from "@prisma/client"
import { appToday } from "@/lib/dates"
import { db } from "@/lib/db"
import {
  parseHistoryFilter,
  type HistoryFilter,
} from "@/lib/prospect-filters"

export type OpenTaskItem = {
  id: string
  type: StepType
  label: string
  dueDate: Date
  stepOrder: number | null
  template: string | null
  hasActiveSequence: boolean
}

export type ProspectDetail = {
  prospect: Prospect
  notes: Note[]
  enrollment: {
    id: string
    state: EnrollState
    currentStepOrder: number
    sequenceId: string
    sequenceName: string
    stepTotal: number
    exitReason: string | null
    startedAt: Date
  } | null
  /** Primary focus task — earliest due today/overdue, else earliest upcoming. */
  openTask: OpenTaskItem | null
  openTasks: {
    dueToday: OpenTaskItem[]
    upcoming: OpenTaskItem[]
  }
  lastCallOutcome: {
    outcome: string
    occurredAt: Date
    note: string | null
  } | null
  dials: number
  connects: number
  emails: number
  daysInSequence: number | null
  history: Activity[]
  /** Completed-task display names keyed by activity id (custom task name). */
  historyTaskLabels: Record<string, string>
  historyCounts: Record<HistoryFilter, number>
  historyFilter: HistoryFilter
  sequences: { id: string; name: string }[]
}

function historyBucket(a: Activity): HistoryFilter {
  if (a.type === ActivityType.CALL) return "calls"
  if (
    a.type === ActivityType.EMAIL_SENT ||
    a.type === ActivityType.EMAIL_REPLY_SENT ||
    a.type === ActivityType.EMAIL_REPLY_RECEIVED
  )
    return "emails"
  if (a.type === ActivityType.NOTE) return "notes"
  return "changes"
}

export async function getProspectDetail(
  id: string,
  raw: Record<string, string | string[] | undefined> = {},
): Promise<ProspectDetail | null> {
  const historyFilter = parseHistoryFilter(raw)
  const prospect = await db.prospect.findUnique({
    where: { id },
    include: {
      notes: { orderBy: { updatedAt: "desc" } },
      activities: { orderBy: { occurredAt: "desc" }, take: 200 },
      enrollments: {
        orderBy: { startedAt: "desc" },
        take: 1,
        include: {
          sequence: {
            select: {
              id: true,
              name: true,
              steps: {
                select: { order: true, template: true },
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
      tasks: {
        where: { status: TaskStatus.OPEN },
        orderBy: { dueDate: "asc" },
      },
    },
  })
  if (!prospect) return null

  const enr = prospect.enrollments[0] ?? null

  function toOpenTask(task: {
    id: string
    type: StepType
    label: string
    dueDate: Date
    stepOrder: number | null
    enrollmentId: string | null
  }): OpenTaskItem {
    const step =
      task.stepOrder != null
        ? enr?.sequence.steps.find((s) => s.order === task.stepOrder)
        : null
    return {
      id: task.id,
      type: task.type,
      label: task.label,
      dueDate: task.dueDate,
      stepOrder: task.stepOrder,
      template: step?.template ?? null,
      hasActiveSequence: task.enrollmentId != null,
    }
  }

  const allOpen = prospect.tasks.map(toOpenTask)
  const today = appToday()
  const dueToday = allOpen.filter((t) => t.dueDate.getTime() <= today.getTime())
  const upcoming = allOpen.filter((t) => t.dueDate.getTime() > today.getTime())
  const open = dueToday[0] ?? upcoming[0] ?? null

  const calls = prospect.activities.filter((a) => a.type === ActivityType.CALL)
  const connects = calls.filter(
    (a) =>
      a.outcome &&
      ["CONNECTED", "CALLBACK_REQUESTED", "MEETING_BOOKED", "NOT_INTERESTED"].includes(
        a.outcome,
      ),
  )
  const emails = prospect.activities.filter(
    (a) =>
      a.type === ActivityType.EMAIL_SENT ||
      a.type === ActivityType.EMAIL_REPLY_SENT ||
      a.type === ActivityType.EMAIL_REPLY_RECEIVED,
  )
  const lastCall = calls.find((a) => a.outcome)

  const counts: Record<HistoryFilter, number> = {
    all: prospect.activities.length,
    calls: 0,
    emails: 0,
    notes: 0,
    changes: 0,
  }
  for (const a of prospect.activities) counts[historyBucket(a)] += 1

  const history =
    historyFilter === "all"
      ? prospect.activities
      : prospect.activities.filter((a) => historyBucket(a) === historyFilter)

  const completedLinked = await db.task.findMany({
    where: { prospectId: id, activityId: { not: null } },
    select: { activityId: true, label: true },
  })
  const historyTaskLabels: Record<string, string> = {}
  for (const t of completedLinked) {
    if (!t.activityId || !t.label.trim()) continue
    // Full label: first line is the name, remaining lines are task notes.
    historyTaskLabels[t.activityId] = t.label
  }

  const sequences = await db.sequence.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  const daysInSequence = enr
    ? Math.max(
        0,
        Math.round(
          (appToday().getTime() -
            Date.UTC(
              enr.startedAt.getUTCFullYear(),
              enr.startedAt.getUTCMonth(),
              enr.startedAt.getUTCDate(),
            )) /
            (24 * 60 * 60 * 1000),
        ),
      )
    : null

  return {
    prospect: {
      id: prospect.id,
      firstName: prospect.firstName,
      lastName: prospect.lastName,
      company: prospect.company,
      title: prospect.title,
      email: prospect.email,
      phone: prospect.phone,
      linkedin: prospect.linkedin,
      source: prospect.source,
      timezone: prospect.timezone,
      status: prospect.status,
      deadReason: prospect.deadReason,
      createdAt: prospect.createdAt,
      updatedAt: prospect.updatedAt,
    },
    notes: prospect.notes,
    enrollment: enr
      ? {
          id: enr.id,
          state: enr.state,
          currentStepOrder: enr.currentStepOrder,
          sequenceId: enr.sequence.id,
          sequenceName: enr.sequence.name,
          stepTotal: enr.sequence.steps.length,
          exitReason: enr.exitReason,
          startedAt: enr.startedAt,
        }
      : null,
    openTask: open,
    openTasks: { dueToday, upcoming },
    lastCallOutcome: lastCall?.outcome
      ? {
          outcome: lastCall.outcome,
          occurredAt: lastCall.occurredAt,
          note: lastCall.note,
        }
      : null,
    dials: calls.length,
    connects: connects.length,
    emails: emails.length,
    daysInSequence,
    history,
    historyTaskLabels,
    historyCounts: counts,
    historyFilter,
    sequences,
  }
}
