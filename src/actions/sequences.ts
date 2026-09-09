"use server"

import { StepType } from "@prisma/client"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import type { ActionResult, ActionResultWithId } from "@/actions/prospects"

const STEP_TYPES = new Set<string>(Object.values(StepType))

function fail(error: unknown, fallback: string): { ok: false; error: string } {
  return { ok: false, error: error instanceof Error ? error.message : fallback }
}

/** Every surface that lists or links to sequences. */
function revalidateSequences(sequenceId?: string) {
  if (sequenceId) revalidatePath(`/sequences/${sequenceId}`)
  revalidatePath("/sequences/default")
  revalidatePath("/", "layout")
  revalidatePath("/prospects")
}

/** Pause (isActive=false) hides the sequence from enrol pickers; resume re-shows it. */
export async function setSequenceActiveAction(input: {
  sequenceId: string
  isActive: boolean
}): Promise<ActionResult> {
  try {
    if (!input.sequenceId) return { ok: false, error: "Missing sequence" }
    await db.sequence.update({
      where: { id: input.sequenceId },
      data: { isActive: input.isActive },
    })
    revalidateSequences(input.sequenceId)
    return { ok: true }
  } catch (error) {
    return fail(error, "Could not update sequence")
  }
}

/** Copies the saved steps into a new sequence named "<name> (copy)". */
export async function duplicateSequenceAction(input: {
  sequenceId: string
}): Promise<ActionResultWithId> {
  try {
    const source = await db.sequence.findUnique({
      where: { id: input.sequenceId },
      include: { steps: { orderBy: { order: "asc" } } },
    })
    if (!source) return { ok: false, error: "Sequence not found" }

    const copy = await db.sequence.create({
      data: {
        name: `${source.name} (copy)`,
        isActive: true,
        steps: {
          create: source.steps.map((s) => ({
            order: s.order,
            type: s.type,
            label: s.label,
            delayDays: s.delayDays,
            template: s.template,
          })),
        },
      },
      select: { id: true },
    })
    revalidateSequences(copy.id)
    return { ok: true, id: copy.id }
  } catch (error) {
    return fail(error, "Could not duplicate sequence")
  }
}

/**
 * Hard delete. Refused while any prospect has ever been enrolled — those
 * enrollments and their history point at this sequence; pause it instead.
 */
export async function deleteSequenceAction(input: {
  sequenceId: string
}): Promise<ActionResult> {
  try {
    if (!input.sequenceId) return { ok: false, error: "Missing sequence" }
    const enrolled = await db.enrollment.count({
      where: { sequenceId: input.sequenceId },
    })
    if (enrolled > 0) {
      return {
        ok: false,
        error: `${enrolled} prospect${enrolled === 1 ? " has" : "s have"} been enrolled in this sequence, so it can't be deleted. Pause it instead.`,
      }
    }
    // Steps cascade from the sequence row.
    await db.sequence.delete({ where: { id: input.sequenceId } })
    revalidateSequences(input.sequenceId)
    return { ok: true }
  } catch (error) {
    return fail(error, "Could not delete sequence")
  }
}

export type SaveStepInput = {
  type: StepType
  label: string
  delayDays: number
  template: string | null
}

export async function saveSequenceStepsAction(input: {
  sequenceId: string
  name?: string
  steps: SaveStepInput[]
}): Promise<ActionResult> {
  try {
    const { sequenceId, steps } = input
    if (!sequenceId) return { ok: false, error: "Missing sequence" }
    if (!steps.length) return { ok: false, error: "Add at least one step" }

    for (const step of steps) {
      if (!STEP_TYPES.has(step.type)) {
        return { ok: false, error: `Invalid step type: ${step.type}` }
      }
      if (!step.label.trim()) {
        return { ok: false, error: "Every step needs a name" }
      }
      if (!Number.isInteger(step.delayDays) || step.delayDays < 0) {
        return { ok: false, error: "Wait must be 0 or more business days" }
      }
    }

    const existing = await db.sequence.findUnique({ where: { id: sequenceId } })
    if (!existing) return { ok: false, error: "Sequence not found" }

    await db.$transaction(async (tx) => {
      if (input.name !== undefined && input.name.trim()) {
        await tx.sequence.update({
          where: { id: sequenceId },
          data: { name: input.name.trim() },
        })
      }

      // Unique (sequenceId, order) — wipe then recreate so order stays 1..n
      await tx.sequenceStep.deleteMany({ where: { sequenceId } })
      await tx.sequenceStep.createMany({
        data: steps.map((s, i) => ({
          sequenceId,
          order: i + 1,
          type: s.type,
          label: s.label.trim(),
          delayDays: s.delayDays,
          template: s.template?.trim() ? s.template.trim() : null,
        })),
      })
    })

    revalidateSequences(sequenceId)
    return { ok: true }
  } catch (error) {
    return fail(error, "Could not save sequence")
  }
}
