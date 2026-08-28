"use server"

import { CallOutcome } from "@prisma/client"
import { revalidatePath } from "next/cache"
import {
  completeTask,
  rescheduleTask,
  skipTask,
} from "@/lib/sequence-engine"
import { parseCalendarDate, toCalendarDate } from "@/lib/dates"

export type ActionResult = { ok: true } | { ok: false; error: string }

function fail(error: unknown): ActionResult {
  return { ok: false, error: error instanceof Error ? error.message : "Something went wrong" }
}

export async function completeTaskAction(input: {
  taskId: string
  outcome?: CallOutcome
  note?: string
  nextDueDate?: string
  durationSec?: number
}): Promise<ActionResult> {
  try {
    await completeTask(input.taskId, {
      outcome: input.outcome,
      note: input.note?.trim() || undefined,
      nextDueDate: input.nextDueDate
        ? toCalendarDate(parseCalendarDate(input.nextDueDate))
        : undefined,
      durationSec: input.durationSec,
    })
    revalidatePath("/")
    revalidatePath("/prospects")
    return { ok: true }
  } catch (error) {
    return fail(error)
  }
}

export async function snoozeTaskAction(input: {
  taskId: string
  dueDate: string
}): Promise<ActionResult> {
  try {
    await rescheduleTask(input.taskId, parseCalendarDate(input.dueDate))
    revalidatePath("/")
    revalidatePath("/prospects")
    return { ok: true }
  } catch (error) {
    return fail(error)
  }
}

export async function skipTaskAction(taskId: string): Promise<ActionResult> {
  try {
    await skipTask(taskId)
    revalidatePath("/")
    revalidatePath("/prospects")
    return { ok: true }
  } catch (error) {
    return fail(error)
  }
}
