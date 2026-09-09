"use server"

import { ProspectStatus } from "@prisma/client"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { revalidateProspects } from "@/lib/revalidate"
import { enrollProspect, stopEnrollment } from "@/lib/sequence-engine"
import type { ActionResult } from "@/actions/prospects"

/** Parallel enrollments per batch — stays well under the DB connection pool. */
const ENROLL_CONCURRENCY = 4

export async function enrollProspectsAction(input: {
  prospectIds: string[]
  sequenceId: string
  spreadDays: number
}): Promise<ActionResult> {
  try {
    const { sequenceId, spreadDays } = input
    // Dedupe so two concurrent enrollments can never race on one prospect.
    const prospectIds = [...new Set(input.prospectIds)]
    if (!prospectIds.length) return { ok: false, error: "No prospects selected" }
    if (!sequenceId) return { ok: false, error: "Pick a sequence" }
    const days = Math.max(1, Math.min(30, Math.floor(spreadDays) || 1))
    let enrolled = 0
    let lastError = "Could not enroll any prospects"
    // Each enrollment is its own transaction on an independent prospect, so
    // run a few at a time instead of strictly one after another.
    for (let start = 0; start < prospectIds.length; start += ENROLL_CONCURRENCY) {
      const chunk = prospectIds.slice(start, start + ENROLL_CONCURRENCY)
      const results = await Promise.allSettled(
        chunk.map((prospectId, offset) => {
          const i = start + offset
          const delay = days <= 1 ? 0 : i % days
          return enrollProspect(prospectId, sequenceId, {
            delayBusinessDays: delay,
          })
        }),
      )
      for (const r of results) {
        if (r.status === "fulfilled") enrolled += 1
        else lastError = r.reason instanceof Error ? r.reason.message : "failed"
      }
    }
    revalidateProspects()
    revalidatePath(`/sequences/${sequenceId}`)
    revalidatePath("/sequences/default")
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
