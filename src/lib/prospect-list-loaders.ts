import { EnrollState, TaskStatus, type StepType } from "@prisma/client"
import { db } from "@/lib/db"

export type ListEnrollment = {
  state: EnrollState
  currentStepOrder: number
  sequenceId: string
}

export type ListTask = {
  id: string
  type: StepType
  label: string
  dueDate: Date
  stepOrder: number | null
}

export type ListSequence = {
  id: string
  name: string
  isActive: boolean
  stepTotal: number
}

/**
 * Per-page relation data for the prospect list, fetched as three flat
 * queries in one parallel wave (instead of one nested relation round trip
 * per include). Each map holds the single "current" row per prospect:
 * latest RUNNING/PAUSED enrollment, earliest open task, latest activity.
 */
export async function loadProspectPageRelations(prospectIds: string[]): Promise<{
  enrollmentByProspect: Map<string, ListEnrollment>
  nextTaskByProspect: Map<string, ListTask>
  lastActivityByProspect: Map<string, Date>
}> {
  if (prospectIds.length === 0) {
    return {
      enrollmentByProspect: new Map(),
      nextTaskByProspect: new Map(),
      lastActivityByProspect: new Map(),
    }
  }

  const [enrollments, tasks, activities] = await Promise.all([
    db.enrollment.findMany({
      where: {
        prospectId: { in: prospectIds },
        state: { in: [EnrollState.RUNNING, EnrollState.PAUSED] },
      },
      orderBy: [{ prospectId: "asc" }, { startedAt: "desc" }],
      distinct: ["prospectId"],
      select: {
        prospectId: true,
        state: true,
        currentStepOrder: true,
        sequenceId: true,
      },
    }),
    db.task.findMany({
      where: { prospectId: { in: prospectIds }, status: TaskStatus.OPEN },
      orderBy: [{ prospectId: "asc" }, { dueDate: "asc" }],
      distinct: ["prospectId"],
      select: {
        prospectId: true,
        id: true,
        type: true,
        label: true,
        dueDate: true,
        stepOrder: true,
      },
    }),
    db.activity.findMany({
      where: { prospectId: { in: prospectIds } },
      orderBy: [{ prospectId: "asc" }, { occurredAt: "desc" }],
      distinct: ["prospectId"],
      select: { prospectId: true, occurredAt: true },
    }),
  ])

  return {
    enrollmentByProspect: new Map(
      enrollments.map(({ prospectId, ...e }) => [prospectId, e]),
    ),
    nextTaskByProspect: new Map(tasks.map(({ prospectId, ...t }) => [prospectId, t])),
    lastActivityByProspect: new Map(
      activities.map((a) => [a.prospectId, a.occurredAt]),
    ),
  }
}

/** All sequences with their step counts — small table, one query. */
export async function loadSequences(): Promise<ListSequence[]> {
  const rows = await db.sequence.findMany({
    select: {
      id: true,
      name: true,
      isActive: true,
      _count: { select: { steps: true } },
    },
    orderBy: { name: "asc" },
  })
  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    isActive: s.isActive,
    stepTotal: s._count.steps,
  }))
}
