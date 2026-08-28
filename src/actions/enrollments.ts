"use server"

import { ProspectStatus } from "@prisma/client"
import { db } from "@/lib/db"
import { revalidateProspects } from "@/lib/revalidate"
import { enrollProspect, stopEnrollment } from "@/lib/sequence-engine"
import type { ActionResult } from "@/actions/prospects"

export async function enrollProspectsAction(input: {
  prospectIds: string[]
  sequenceId: string
  spreadDays: number
}): Promise<ActionResult> {
  try {
    const { prospectIds, sequenceId, spreadDays } = input
    if (!prospectIds.length) return { ok: false, error: "No prospects selected" }
    if (!sequenceId) return { ok: false, error: "Pick a sequence" }
    const days = Math.max(1, Math.min(30, Math.floor(spreadDays) || 1))
    let enrolled = 0
    let lastError = "Could not enroll any prospects"
    for (let i = 0; i < prospectIds.length; i++) {
      const delay = days <= 1 ? 0 : i % days
      try {
        await enrollProspect(prospectIds[i], sequenceId, {
          delayBusinessDays: delay,
        })
        enrolled += 1
      } catch (e) {
        lastError = e instanceof Error ? e.message : "failed"
      }
    }
    revalidateProspects()
    if (enrolled === 0) return { ok: false, error: lastError }
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Something went wrong",
    }
  }
}

export async function pauseEnrollmentAction(enrollmentId: string): Promise<ActionResult> {
  try {
    await db.enrollment.update({
      where: { id: enrollmentId },
      data: { state: "PAUSED" },
    })
    revalidateProspects()
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed",
    }
  }
}

export async function resumeEnrollmentAction(enrollmentId: string): Promise<ActionResult> {
  try {
    const enr = await db.enrollment.findUnique({ where: { id: enrollmentId } })
    if (!enr) return { ok: false, error: "Enrollment not found" }
    const other = await db.enrollment.findFirst({
      where: {
        prospectId: enr.prospectId,
        state: "RUNNING",
        id: { not: enrollmentId },
      },
    })
    if (other) return { ok: false, error: "Prospect already has a running enrollment" }
    await db.enrollment.update({
      where: { id: enrollmentId },
      data: { state: "RUNNING" },
    })
    await db.prospect.update({
      where: { id: enr.prospectId },
      data: { status: ProspectStatus.ACTIVE },
    })
    revalidateProspects(enr.prospectId)
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed",
    }
  }
}

export async function stopEnrollmentAction(enrollmentId: string): Promise<ActionResult> {
  try {
    await stopEnrollment(enrollmentId)
    revalidateProspects()
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed",
    }
  }
}
