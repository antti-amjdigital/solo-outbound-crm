import {
  ActivityType,
  EnrollState,
  ProspectStatus,
  StepType,
  TaskStatus,
} from "@prisma/client"
import { Prisma } from "@prisma/client"
import { appToday, formatCalendarDate } from "@/lib/dates"
import { db } from "@/lib/db"
import { overdueDays } from "@/lib/queue-filters"
import {
  parseProspectFilters,
  type ProspectListFilters,
  type ProspectSort,
} from "@/lib/prospect-filters"

export type ProspectListRow = {
  id: string
  firstName: string
  lastName: string | null
  title: string | null
  company: string | null
  phone: string | null
  status: ProspectStatus
  deadReason: string | null
  sequenceName: string | null
  enrollmentState: EnrollState | null
  stepOrder: number | null
  stepTotal: number
  nextTask: {
    id: string
    type: StepType
    label: string
    dueDate: Date
    overdueDays: number
  } | null
  dials: number
  lastActivityAt: Date | null
}

export type ProspectListResult = {
  rows: ProspectListRow[]
  total: number
  totalUnfiltered: number
  filters: ProspectListFilters
  sequences: { id: string; name: string }[]
  sources: string[]
}

function sortClause(
  sort: ProspectSort,
  dir: "asc" | "desc",
): Prisma.ProspectOrderByWithRelationInput[] {
  if (sort === "company") return [{ company: dir }, { firstName: "asc" }]
  if (sort === "status") return [{ status: dir }, { firstName: "asc" }]
  if (sort === "created") return [{ createdAt: dir }]
  if (sort === "last") return [{ updatedAt: dir }]
  return [{ firstName: dir }, { lastName: dir }]
}

export async function getProspectList(
  raw: Record<string, string | string[] | undefined> = {},
): Promise<ProspectListResult> {
  const filters = parseProspectFilters(raw)
  const today = appToday()
  const where: Prisma.ProspectWhereInput = {}

  if (filters.status !== "all") where.status = filters.status
  if (filters.source !== "all") where.source = filters.source
  if (filters.q) {
    where.OR = [
      { firstName: { contains: filters.q, mode: "insensitive" } },
      { lastName: { contains: filters.q, mode: "insensitive" } },
      { company: { contains: filters.q, mode: "insensitive" } },
      { email: { contains: filters.q, mode: "insensitive" } },
      { phone: { contains: filters.q, mode: "insensitive" } },
    ]
  }
  if (filters.sequenceId === "none") {
    where.enrollments = { none: { state: EnrollState.RUNNING } }
  } else if (filters.sequenceId !== "all") {
    where.enrollments = {
      some: { sequenceId: filters.sequenceId, state: EnrollState.RUNNING },
    }
  }
  if (filters.openTask === "yes") {
    where.tasks = { some: { status: TaskStatus.OPEN } }
  } else if (filters.openTask === "no") {
    where.tasks = { none: { status: TaskStatus.OPEN } }
  }

  const [totalUnfiltered, total, sequences, sourceRows, prospects] =
    await Promise.all([
      db.prospect.count(),
      db.prospect.count({ where }),
      db.sequence.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      db.prospect.findMany({
        where: { source: { not: null } },
        select: { source: true },
        distinct: ["source"],
      }),
      db.prospect.findMany({
        where,
        orderBy: sortClause(filters.sort, filters.dir),
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
        include: {
          enrollments: {
            where: { state: { in: [EnrollState.RUNNING, EnrollState.PAUSED] } },
            orderBy: { startedAt: "desc" },
            take: 1,
            include: {
              sequence: {
                select: {
                  name: true,
                  steps: { select: { order: true }, orderBy: { order: "asc" } },
                },
              },
            },
          },
          tasks: {
            where: { status: TaskStatus.OPEN },
            orderBy: { dueDate: "asc" },
            take: 1,
          },
          activities: {
            orderBy: { occurredAt: "desc" },
            take: 1,
            select: { occurredAt: true },
          },
          _count: {
            select: { activities: { where: { type: ActivityType.CALL } } },
          },
        },
      }),
    ])

  let rows: ProspectListRow[] = prospects.map((p) => {
    const enr = p.enrollments[0] ?? null
    const task = p.tasks[0] ?? null
    return {
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      title: p.title,
      company: p.company,
      phone: p.phone,
      status: p.status,
      deadReason: p.deadReason,
      sequenceName: enr?.sequence.name ?? null,
      enrollmentState: enr?.state ?? null,
      stepOrder: task?.stepOrder ?? (enr?.currentStepOrder || null),
      stepTotal: enr?.sequence.steps.length ?? 0,
      nextTask: task
        ? {
            id: task.id,
            type: task.type,
            label: task.label,
            dueDate: task.dueDate,
            overdueDays: overdueDays(task.dueDate, today),
          }
        : null,
      dials: p._count.activities,
      lastActivityAt: p.activities[0]?.occurredAt ?? null,
    }
  })

  if (filters.sort === "dials") {
    rows = [...rows].sort((a, b) =>
      filters.dir === "asc" ? a.dials - b.dials : b.dials - a.dials,
    )
  } else if (filters.sort === "last") {
    rows = [...rows].sort((a, b) => {
      const av = a.lastActivityAt?.getTime() ?? 0
      const bv = b.lastActivityAt?.getTime() ?? 0
      return filters.dir === "asc" ? av - bv : bv - av
    })
  }

  return {
    rows,
    total,
    totalUnfiltered,
    filters,
    sequences,
    sources: sourceRows
      .map((s) => s.source)
      .filter((s): s is string => Boolean(s))
      .sort(),
  }
}

export function formatRelativeDue(due: Date, today = appToday()): string {
  const days = overdueDays(due, today)
  if (days > 0) return `Overdue ${days}d`
  if (formatCalendarDate(due) === formatCalendarDate(today)) return "Today"
  const diff = Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
  if (diff === 1) return "Tomorrow"
  return due.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
}
