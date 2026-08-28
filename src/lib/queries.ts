import {
  CallOutcome,
  EnrollState,
  StepType,
  TaskStatus,
  type Prospect,
  type Task,
} from "@prisma/client"
import { appToday, formatCalendarDate } from "@/lib/dates"
import { db } from "@/lib/db"
import {
  appDayBounds,
  dueRange,
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
}

export type TodayQueueResult = {
  open: TodayQueueItem[]
  done: TodayQueueItem[]
  counts: TodayQueueCounts
  filters: TodayQueueFilters
}

type TaskRow = Task & {
  prospect: TodayQueueItem["prospect"] & {
    activities: { outcome: CallOutcome | null }[]
  }
  enrollment: {
    sequence: { steps: { order: number; template: string | null }[] }
  } | null
}

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

function matchesSearch(
  task: { label: string; prospect: TodayQueueItem["prospect"] },
  q: string,
): boolean {
  if (!q) return true
  const name = [task.prospect.firstName, task.prospect.lastName]
    .filter(Boolean)
    .join(" ")
  const hay = [task.label, name, task.prospect.company, task.prospect.email, task.prospect.phone]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return hay.includes(q.toLowerCase())
}

function toItem(task: TaskRow): TodayQueueItem {
  const step = task.enrollment?.sequence.steps.find((s) => s.order === task.stepOrder)
  return {
    id: task.id,
    type: task.type,
    label: task.label,
    dueDate: task.dueDate,
    status: task.status,
    completedAt: task.completedAt,
    stepOrder: task.stepOrder,
    template: step?.template ?? null,
    prospect: {
      id: task.prospect.id,
      firstName: task.prospect.firstName,
      lastName: task.prospect.lastName,
      company: task.prospect.company,
      email: task.prospect.email,
      phone: task.prospect.phone,
      linkedin: task.prospect.linkedin,
    },
    lastOutcome: task.prospect.activities[0]?.outcome ?? null,
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
    activities: {
      where: { outcome: { not: null } },
      orderBy: { occurredAt: "desc" as const },
      take: 1,
      select: { outcome: true },
    },
  },
}

const enrollmentInclude = {
  select: {
    sequence: {
      select: { steps: { select: { order: true, template: true } } },
    },
  },
}

export async function getTodayQueue(
  raw: Record<string, string | string[] | undefined> = {},
): Promise<TodayQueueResult> {
  const filters = parseQueueFilters(raw)
  const today = appToday()
  const { start: dayStart, end: dayEnd } = appDayBounds(today)

  const [openRows, doneRows] = await Promise.all([
    db.task.findMany({
      where: {
        status: TaskStatus.OPEN,
        OR: [{ enrollmentId: null }, { enrollment: { state: EnrollState.RUNNING } }],
      },
      include: { prospect: prospectInclude, enrollment: enrollmentInclude },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    }),
    db.task.findMany({
      where: {
        status: TaskStatus.DONE,
        completedAt: { gte: dayStart, lt: dayEnd },
      },
      include: { prospect: prospectInclude, enrollment: enrollmentInclude },
      orderBy: { completedAt: "desc" },
    }),
  ])

  const openItems = (openRows as unknown as TaskRow[]).map(toItem)
  const rangeSpec = dueRange(filters.range, today, filters.from, filters.to)

  const inRange = (due: Date) => {
    if (rangeSpec === "overdue") return due.getTime() < today.getTime()
    if (rangeSpec.gte && due.getTime() < rangeSpec.gte.getTime()) return false
    if (rangeSpec.lte && due.getTime() > rangeSpec.lte.getTime()) return false
    return true
  }

  const rangeForCounts = openItems.filter((t) => inRange(t.dueDate))
  const counts: TodayQueueCounts = {
    all: rangeForCounts.length,
    call: 0,
    email: 0,
    reply: 0,
    linkedin: 0,
    manual: 0,
    overdue: openItems.filter((t) => t.dueDate.getTime() < today.getTime()).length,
    today: openItems.filter(
      (t) => formatCalendarDate(t.dueDate) === formatCalendarDate(today),
    ).length,
  }
  for (const t of rangeForCounts) counts[typeBucket(t.type)] += 1

  const open = openItems.filter(
    (t) =>
      matchesType(t.type, filters.type) && inRange(t.dueDate) && matchesSearch(t, filters.q),
  )
  const done = (doneRows as unknown as TaskRow[])
    .map(toItem)
    .filter((t) => matchesType(t.type, filters.type) && matchesSearch(t, filters.q))

  return { open, done, counts, filters }
}
