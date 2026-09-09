import type { CallOutcome, Prisma } from "@prisma/client"
import { db } from "@/lib/db"

/** Side tables for the Today queue, resolved once and joined in memory. */
export type QueueContext = {
  lastOutcomeByProspect: Map<string, CallOutcome>
  sequenceIdByEnrollment: Map<string, string>
  templateBySequenceStep: Map<string, string | null>
}

export function stepKey(sequenceId: string, order: number): string {
  return `${sequenceId}:${order}`
}

/**
 * Everything the queue rows need besides the tasks themselves, as three flat
 * queries that only depend on the task filters — so they run in the same
 * parallel wave as the task queries instead of as nested relation loads.
 */
export async function loadQueueContext(
  taskWheres: Prisma.TaskWhereInput[],
): Promise<QueueContext> {
  const [enrollments, steps, outcomes] = await Promise.all([
    db.enrollment.findMany({
      where: { tasks: { some: { OR: taskWheres } } },
      select: { id: true, sequenceId: true },
    }),
    db.sequenceStep.findMany({
      select: { sequenceId: true, order: true, template: true },
    }),
    // Latest call outcome per prospect that has a queue task.
    db.activity.findMany({
      where: {
        outcome: { not: null },
        prospect: { tasks: { some: { OR: taskWheres } } },
      },
      orderBy: [{ prospectId: "asc" }, { occurredAt: "desc" }],
      distinct: ["prospectId"],
      select: { prospectId: true, outcome: true },
    }),
  ])

  return {
    lastOutcomeByProspect: new Map(outcomes.map((r) => [r.prospectId, r.outcome!])),
    sequenceIdByEnrollment: new Map(enrollments.map((e) => [e.id, e.sequenceId])),
    templateBySequenceStep: new Map(
      steps.map((s) => [stepKey(s.sequenceId, s.order), s.template]),
    ),
  }
}
