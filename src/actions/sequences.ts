"use server"

import { StepType } from "@prisma/client"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import type { ActionResult } from "@/actions/prospects"

const STEP_TYPES = new Set<string>(Object.values(StepType))

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

    revalidatePath(`/sequences/${sequenceId}`)
    revalidatePath("/sequences/default")
    revalidatePath("/")
    revalidatePath("/prospects")
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save sequence",
    }
  }
}
