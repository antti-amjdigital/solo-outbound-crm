import { TaskStatus, type Prisma } from "@prisma/client"
import { db } from "@/lib/db"

const enrollmentSelect = {
  id: true,
  state: true,
  currentStepOrder: true,
  sequenceId: true,
  exitReason: true,
  startedAt: true,
} satisfies Prisma.EnrollmentSelect

export type DetailEnrollment = Prisma.EnrollmentGetPayload<{
  select: typeof enrollmentSelect
}> & {
  sequence: {
    id: string
    name: string
    steps: { order: number; template: string | null }[]
  }
}

/**
 * Everything the prospect detail page reads, as flat queries in two parallel
 * waves. A single nested `include` here costs Prisma one round trip per
 * relation level (7 in total); flattening brings it down to 2.
 */
export async function loadProspectDetail(id: string) {
  const [prospect, notes, activities, enrollment, tasks, completedLinked, sequences] =
    await Promise.all([
      db.prospect.findUnique({ where: { id } }),
      db.note.findMany({ where: { prospectId: id }, orderBy: { updatedAt: "desc" } }),
      db.activity.findMany({
        where: { prospectId: id },
        orderBy: { occurredAt: "desc" },
        take: 200,
      }),
      db.enrollment.findFirst({
        where: { prospectId: id },
        orderBy: { startedAt: "desc" },
        select: enrollmentSelect,
      }),
      db.task.findMany({
        where: { prospectId: id, status: TaskStatus.OPEN },
        orderBy: { dueDate: "asc" },
      }),
      db.task.findMany({
        where: { prospectId: id, activityId: { not: null } },
        select: { activityId: true, label: true },
      }),
      db.sequence.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ])
  if (!prospect) return null

  let enr: DetailEnrollment | null = null
  if (enrollment) {
    const [sequence, steps] = await Promise.all([
      db.sequence.findUniqueOrThrow({
        where: { id: enrollment.sequenceId },
        select: { id: true, name: true },
      }),
      db.sequenceStep.findMany({
        where: { sequenceId: enrollment.sequenceId },
        select: { order: true, template: true },
        orderBy: { order: "asc" },
      }),
    ])
    enr = { ...enrollment, sequence: { ...sequence, steps } }
  }

  return { prospect, notes, activities, enr, tasks, completedLinked, sequences }
}
