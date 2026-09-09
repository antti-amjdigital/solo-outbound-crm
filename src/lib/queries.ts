import {
  CallOutcome,
  EnrollState,
  StepType,
  TaskStatus,
  type Prisma,
  type Prospect,
  type Task,
} from "@prisma/client"
import { appToday, formatCalendarDate } from "@/lib/dates"
import { db } from "@/lib/db"
import {
  loadQueueContext,
  stepKey,
  type QueueContext,
} from "@/lib/queue-loaders"
import {
  addCalendarDays,
  appDayBounds,
  dueRange,
  mondayOf,
  parseQueueFilters,
  TYPE_MAP,
  type QueueTypeFilter,
  type TodayQueueFilters,
} from "@/lib/queue-filters"

export type { TodayQueueFilters } from "@/lib/queue-filters"
export type {
  QueueTypeFilter,
  QueueRangeFilter,
} from "@/lib/queue-filters"

export type TodayQueueItem = {
  id: string
  type: StepType
  label: string
  dueDate: Date
  status: TaskStatus
  completedAt: Date | null
  stepOrder: number | null
  template: string | null
  hasActiveSequence: boolean
  prospect: Pick<
    Prospect,
    "id" | "firstName" | "lastName" | "company" | "email" | "phone" | "linkedin"
  >
  lastOutcome: CallOutcome | null
}

export type TodayQueueCounts = {
  all: number
  call: number
  email: number
  reply: number
  linkedin: number
  manual: number
  overdue: number
  today: number
  tomorrow: number
  week: number
}

export type TodayProgress = {
  done: number
  total: number
}

export type TodayQueueResult = {
  open: TodayQueueItem[]
  done: TodayQueueItem[]
  counts: TodayQueueCounts
  todayProgress: TodayProgress
  filters: TodayQueueFilters
}

type TaskRow = Task & { prospect: TodayQueueItem["prospect"] }

function typeBucket(
  type: StepType,
): keyof Omit<TodayQueueCounts, "all" | "overdue" | "today"> {
  if (type === StepType.CALL) return "call"
  if (type === StepType.EMAIL) return "email"
  if (type === StepType.EMAIL_REPLY) return "reply"
  if (type === StepType.LINKEDIN) return "linkedin"
  return "manual"
}

function matchesType(type: StepType, filter: QueueTypeFilter): boolean {
  if (filter === "all") return true
  return type === TYPE_MAP[filter]
}

function toItem(task: TaskRow, ctx: QueueContext): TodayQueueItem {
  const sequenceId = task.enrollmentId
    ? ctx.sequenceIdByEnrollment.get(task.enrollmentId)
    : undefined
  const template =
    sequenceId && task.stepOrder != null
      ? ctx.templateBySequenceStep.get(stepKey(sequenceId, task.stepOrder))
      : undefined
  return {
    id: task.id,
    type: task.type,
    label: task.label,
    dueDate: task.dueDate,
    status: task.status,
    completedAt: task.completedAt,
    stepOrder: task.stepOrder,
    template: template ?? null,
    prospect: {
      id: task.prospect.id,
      firstName: task.prospect.firstName,
      lastName: task.prospect.lastName,
      company: task.prospect.company,
      email: task.prospect.email,
      phone: task.prospect.phone,
      linkedin: task.prospect.linkedin,
    },
    lastOutcome: ctx.lastOutcomeByProspect.get(task.prospect.id) ?? null,
    hasActiveSequence: task.enrollmentId != null,
  }
}

const prospectInclude = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    company: true,
    email: true,
    phone: true,
    linkedin: true,
  },
}

export async function getTodayQueue(
  raw: Record<string, string | string[] | undefined> = {},
): Promise<TodayQueueResult> {
  const filters = parseQueueFilters(raw)
  const today = appToday()
  const { start: dayStart, end: dayEnd } = appDayBounds(today)

  const openWhere: Prisma.TaskWhereInput = {
    status: TaskStatus.OPEN,
    OR: [{ enrollmentId: null }, { enrollment: { state: EnrollState.RUNNING } }],
  }
  const doneWhere: Prisma.TaskWhereInput = {
    status: TaskStatus.DONE,
    completedAt: { gte: dayStart, lt: dayEnd },
  }

  // Everything depends only on the filters, not on the task rows, so it all
  // goes out in one parallel wave instead of nested relation round trips.
  const [openRows, doneRows, ctx] = await Promise.all([
    db.task.findMany({
      where: openWhere,
      include: { prospect: prospectInclude },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    }),
    db.task.findMany({
      where: doneWhere,
      include: { prospect: prospectInclude },
      orderBy: { completedAt: "desc" },
    }),
    loadQueueContext([openWhere, doneWhere]),
  ])

  const openItems = openRows.map((t) => toItem(t, ctx))
  const rangeSpec = dueRange(filters.range, today, filters.from, filters.to)

  const inRange = (due: Date) => {
    if (rangeSpec === "overdue") return due.getTime() < today.getTime()
    if (rangeSpec.gte && due.getTime() < rangeSpec.gte.getTime()) return false
    if (rangeSpec.lte && due.getTime() > rangeSpec.lte.getTime()) return false
    return true
  }

  const tomorrow = addCalendarDays(today, 1)
  const weekEnd = addCalendarDays(mondayOf(today), 6)
  const todayKey = formatCalendarDate(today)
  const tomorrowKey = formatCalendarDate(tomorrow)

  const rangeForCounts = openItems.filter((t) => inRange(t.dueDate))
  const counts: TodayQueueCounts = {
    all: rangeForCounts.length,
    call: 0,
    email: 0,
    reply: 0,
    linkedin: 0,
    manual: 0,
    overdue: openItems.filter((t) => t.dueDate.getTime() < today.getTime()).length,
    today: openItems.filter((t) => formatCalendarDate(t.dueDate) === todayKey).length,
    tomorrow: openItems.filter((t) => formatCalendarDate(t.dueDate) === tomorrowKey).length,
    week: openItems.filter(
      (t) => t.dueDate.getTime() >= mondayOf(today).getTime() && t.dueDate.getTime() <= weekEnd.getTime(),
    ).length,
  }
  for (const t of rangeForCounts) counts[typeBucket(t.type)] += 1

  const open = openItems.filter(
    (t) => matchesType(t.type, filters.type) && inRange(t.dueDate),
  )
  const done = doneRows
    .map((t) => toItem(t, ctx))
    .filter((t) => matchesType(t.type, filters.type))

  const todayOpenCount = openItems.filter(
    (t) => formatCalendarDate(t.dueDate) === todayKey,
  ).length
  const todayDoneCount = doneRows.length
  const todayProgress: TodayProgress = {
    done: todayDoneCount,
    total: todayOpenCount + todayDoneCount,
  }

  return { open, done, counts, todayProgress, filters }
}
