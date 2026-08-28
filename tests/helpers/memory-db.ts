/**
 * Minimal in-memory Prisma stand-in for sequence-engine unit tests.
 */
import {
  ActivityType,
  CallOutcome,
  EnrollState,
  ProspectStatus,
  StepType,
  TaskStatus,
  type Activity,
  type Enrollment,
  type Prospect,
  type Sequence,
  type SequenceStep,
  type Task,
} from "@prisma/client"

type Id = string

function id(prefix: string): Id {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export type MemoryDb = {
  prospect: {
    create: (args: { data: Partial<Prospect> & Pick<Prospect, "firstName"> }) => Promise<Prospect>
    findUnique: (args: { where: { id: Id } }) => Promise<Prospect | null>
    update: (args: { where: { id: Id }; data: Partial<Prospect> }) => Promise<Prospect>
  }
  sequence: {
    create: (args: {
      data: {
        name: string
        isActive?: boolean
        steps?: { create: Omit<SequenceStep, "id" | "sequenceId">[] }
      }
    }) => Promise<Sequence>
    findUnique: (args: {
      where: { id: Id }
      include?: { steps?: boolean }
    }) => Promise<(Sequence & { steps?: SequenceStep[] }) | null>
  }
  sequenceStep: {
    findFirst: (args: {
      where: { sequenceId: Id; order: { gt: number } }
      orderBy: { order: "asc" }
    }) => Promise<SequenceStep | null>
  }
  enrollment: {
    create: (args: {
      data: Partial<Enrollment> & Pick<Enrollment, "prospectId" | "sequenceId">
    }) => Promise<Enrollment>
    findUnique: (args: {
      where: { id: Id }
      include?: { sequence?: { include?: { steps?: boolean } }; tasks?: boolean }
    }) => Promise<
      | (Enrollment & { sequence?: Sequence & { steps?: SequenceStep[] }; tasks?: Task[] })
      | null
    >
    findFirst: (args: {
      where: { prospectId: Id; state: EnrollState }
    }) => Promise<Enrollment | null>
    update: (args: { where: { id: Id }; data: Partial<Enrollment> }) => Promise<Enrollment>
  }
  task: {
    create: (args: {
      data: Partial<Task> & Pick<Task, "prospectId" | "type" | "label" | "dueDate">
    }) => Promise<Task>
    findUnique: (args: {
      where: { id: Id }
      include?: { enrollment?: boolean }
    }) => Promise<(Task & { enrollment?: Enrollment | null }) | null>
    findMany: (args: {
      where: { prospectId?: Id; enrollmentId?: Id; status?: TaskStatus }
    }) => Promise<Task[]>
    update: (args: { where: { id: Id }; data: Partial<Task> }) => Promise<Task>
    updateMany: (args: {
      where: { prospectId?: Id; enrollmentId?: Id; status: TaskStatus }
      data: Partial<Task>
    }) => Promise<{ count: number }>
  }
  activity: {
    create: (args: {
      data: Partial<Activity> & Pick<Activity, "prospectId" | "type">
    }) => Promise<Activity>
    findMany: (args?: { where?: { prospectId?: Id } }) => Promise<Activity[]>
  }
  $transaction: <T>(fn: (tx: MemoryDb) => Promise<T>) => Promise<T>
}

export function createMemoryDb(): MemoryDb {
  const prospects = new Map<Id, Prospect>()
  const sequences = new Map<Id, Sequence>()
  const steps = new Map<Id, SequenceStep>()
  const enrollments = new Map<Id, Enrollment>()
  const tasks = new Map<Id, Task>()
  const activities = new Map<Id, Activity>()

  const db: MemoryDb = {
    prospect: {
      async create({ data }) {
        const row: Prospect = {
          id: id("pro"),
          lastName: null,
          company: null,
          title: null,
          email: null,
          phone: null,
          linkedin: null,
          source: null,
          timezone: null,
          status: ProspectStatus.NEW,
          deadReason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        }
        prospects.set(row.id, row)
        return row
      },
      async findUnique({ where: { id: pid } }) {
        return prospects.get(pid) ?? null
      },
      async update({ where: { id: pid }, data }) {
        const row = prospects.get(pid)
        if (!row) throw new Error(`prospect ${pid} not found`)
        const next = { ...row, ...data, updatedAt: new Date() }
        prospects.set(pid, next)
        return next
      },
    },

    sequence: {
      async create({ data }) {
        const row: Sequence = {
          id: id("seq"),
          name: data.name,
          isActive: data.isActive ?? true,
        }
        sequences.set(row.id, row)
        for (const s of data.steps?.create ?? []) {
          const step: SequenceStep = { id: id("step"), sequenceId: row.id, ...s }
          steps.set(step.id, step)
        }
        return row
      },
      async findUnique({ where: { id: sid }, include }) {
        const row = sequences.get(sid)
        if (!row) return null
        if (include?.steps) {
          return {
            ...row,
            steps: [...steps.values()]
              .filter((s) => s.sequenceId === sid)
              .sort((a, b) => a.order - b.order),
          }
        }
        return row
      },
    },

    sequenceStep: {
      async findFirst({ where }) {
        const matches = [...steps.values()]
          .filter((s) => s.sequenceId === where.sequenceId && s.order > where.order.gt)
          .sort((a, b) => a.order - b.order)
        return matches[0] ?? null
      },
    },

    enrollment: {
      async create({ data }) {
        const row: Enrollment = {
          id: id("enr"),
          currentStepOrder: 0,
          state: EnrollState.RUNNING,
          startedAt: new Date(),
          finishedAt: null,
          exitReason: null,
          ...data,
        }
        enrollments.set(row.id, row)
        return row
      },
      async findUnique({ where: { id: eid }, include }) {
        const row = enrollments.get(eid)
        if (!row) return null
        const result: Enrollment & {
          sequence?: Sequence & { steps?: SequenceStep[] }
          tasks?: Task[]
        } = { ...row }
        if (include?.sequence) {
          const seq = sequences.get(row.sequenceId)!
          result.sequence = include.sequence.include?.steps
            ? {
                ...seq,
                steps: [...steps.values()]
                  .filter((s) => s.sequenceId === seq.id)
                  .sort((a, b) => a.order - b.order),
              }
            : seq
        }
        if (include?.tasks) {
          result.tasks = [...tasks.values()].filter((t) => t.enrollmentId === row.id)
        }
        return result
      },
      async findFirst({ where }) {
        return (
          [...enrollments.values()].find(
            (e) => e.prospectId === where.prospectId && e.state === where.state,
          ) ?? null
        )
      },
      async update({ where: { id: eid }, data }) {
        const row = enrollments.get(eid)
        if (!row) throw new Error(`enrollment ${eid} not found`)
        const next = { ...row, ...data }
        enrollments.set(eid, next)
        return next
      },
    },

    task: {
      async create({ data }) {
        const row: Task = {
          id: id("task"),
          enrollmentId: null,
          stepOrder: null,
          status: TaskStatus.OPEN,
          completedAt: null,
          activityId: null,
          createdAt: new Date(),
          ...data,
        }
        tasks.set(row.id, row)
        return row
      },
      async findUnique({ where: { id: tid }, include }) {
        const row = tasks.get(tid)
        if (!row) return null
        if (include?.enrollment) {
          return {
            ...row,
            enrollment: row.enrollmentId ? (enrollments.get(row.enrollmentId) ?? null) : null,
          }
        }
        return row
      },
      async findMany({ where }) {
        return [...tasks.values()].filter((t) => {
          if (where.prospectId && t.prospectId !== where.prospectId) return false
          if (where.enrollmentId && t.enrollmentId !== where.enrollmentId) return false
          if (where.status && t.status !== where.status) return false
          return true
        })
      },
      async update({ where: { id: tid }, data }) {
        const row = tasks.get(tid)
        if (!row) throw new Error(`task ${tid} not found`)
        const next = { ...row, ...data }
        tasks.set(tid, next)
        return next
      },
      async updateMany({ where, data }) {
        let count = 0
        for (const [tid, t] of tasks) {
          if (where.prospectId && t.prospectId !== where.prospectId) continue
          if (where.enrollmentId && t.enrollmentId !== where.enrollmentId) continue
          if (t.status !== where.status) continue
          tasks.set(tid, { ...t, ...data })
          count += 1
        }
        return { count }
      },
    },

    activity: {
      async create({ data }) {
        const row: Activity = {
          id: id("act"),
          outcome: null,
          stepOrder: null,
          sequenceId: null,
          note: null,
          durationSec: null,
          occurredAt: new Date(),
          ...data,
        }
        activities.set(row.id, row)
        return row
      },
      async findMany({ where } = {}) {
        return [...activities.values()].filter((a) => {
          if (where?.prospectId && a.prospectId !== where.prospectId) return false
          return true
        })
      },
    },

    async $transaction<T>(fn: (tx: MemoryDb) => Promise<T>): Promise<T> {
      return fn(db)
    },
  }

  return db
}

export { ActivityType, CallOutcome, EnrollState, ProspectStatus, StepType, TaskStatus }
