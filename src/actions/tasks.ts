"use server"

import { CallOutcome, EnrollState, StepType } from "@prisma/client"
import { revalidatePath } from "next/cache"
import {
  completeTask,
  createAdHocTask,
  rescheduleTask,
  skipTask,
} from "@/lib/sequence-engine"
import { parseCalendarDate, toCalendarDate } from "@/lib/dates"
import { db } from "@/lib/db"
import { revalidateProspects } from "@/lib/revalidate"

export type ActionResult = { ok: true } | { ok: false; error: string }

const TASK_TYPE_MAP = {
  call: StepType.CALL,
  email: StepType.EMAIL,
  task: StepType.MANUAL,
} as const

const TASK_TYPE_LABEL = {
  call: "Call",
  email: "Email",
  task: "To-do",
} as const

const AD_HOC_FOLLOW_UP_TYPES = new Set<StepType>([
  StepType.CALL,
  StepType.EMAIL,
  StepType.MANUAL,
])

function fail(error: unknown): ActionResult {
  return { ok: false, error: error instanceof Error ? error.message : "Something went wrong" }
}

export async function createTaskAction(input: {
  prospectId: string
  type: keyof typeof TASK_TYPE_MAP
  dueDate: string
  name?: string
  notes?: string
}): Promise<ActionResult> {
  try {
    const stepType = TASK_TYPE_MAP[input.type]
    const taskName = input.name?.trim() || TASK_TYPE_LABEL[input.type]
    const notes = input.notes?.trim()
    const label = notes ? `${taskName}\n${notes}` : taskName
    await createAdHocTask(input.prospectId, {
      type: stepType,
      label,
      dueDate: parseCalendarDate(input.dueDate),
    })
    revalidateProspects(input.prospectId)
    return { ok: true }
  } catch (error) {
    return fail(error)
  }
}

export async function completeTaskAction(input: {
  taskId: string
  outcome?: CallOutcome
  note?: string
  nextDueDate?: string
  durationSec?: number
}): Promise<ActionResult> {
  try {
    const task = await db.task.findUnique({
      where: { id: input.taskId },
      include: { enrollment: true },
    })
    if (!task) return { ok: false, error: "Task not found" }

    await completeTask(input.taskId, {
      outcome: input.outcome,
      note: input.note?.trim() || undefined,
      nextDueDate: input.nextDueDate
        ? toCalendarDate(parseCalendarDate(input.nextDueDate))
        : undefined,
      durationSec: input.durationSec,
    })

    const inSequence = task.enrollment?.state === EnrollState.RUNNING
    if (
      input.nextDueDate &&
      !inSequence &&
      AD_HOC_FOLLOW_UP_TYPES.has(task.type)
    ) {
      await createAdHocTask(task.prospectId, {
        type: task.type,
        label: task.label,
        dueDate: parseCalendarDate(input.nextDueDate),
      })
      revalidateProspects(task.prospectId)
    }

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
