"use server"

import { ActivityType, EnrollState, ProspectStatus } from "@prisma/client"
import { db } from "@/lib/db"
import { buildProspectSearchWhere, normalizePhone } from "@/lib/search"
import { revalidateProspects } from "@/lib/revalidate"
import {
  markEmailReplyReceived,
  stopEnrollment,
} from "@/lib/sequence-engine"

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string }

export type ActionResultWithId =
  | { ok: true; id: string }
  | { ok: false; error: string }

function fail(error: unknown): ActionResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Something went wrong",
  }
}

export async function createProspectAction(input: {
  firstName: string
  lastName?: string
  company?: string
  title?: string
  email?: string
  phone?: string
  linkedin?: string
  source?: string
}): Promise<ActionResultWithId> {
  try {
    const firstName = input.firstName.trim()
    if (!firstName) return { ok: false, error: "First name is required" }
    const prospect = await db.prospect.create({
      data: {
        firstName,
        lastName: input.lastName?.trim() || null,
        company: input.company?.trim() || null,
        title: input.title?.trim() || null,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        linkedin: input.linkedin?.trim() || null,
        source: input.source?.trim() || "manual",
        status: ProspectStatus.NEW,
      },
    })
    await db.activity.create({
      data: {
        prospectId: prospect.id,
        type: ActivityType.STATUS_CHANGE,
        note: "Prospect created",
      },
    })
    revalidateProspects(prospect.id)
    return { ok: true, id: prospect.id }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed" }
  }
}

export async function updateProspectAction(
  id: string,
  input: {
    firstName?: string
    lastName?: string
    company?: string
    title?: string
    email?: string
    phone?: string
    linkedin?: string
    source?: string
    timezone?: string
  },
): Promise<ActionResult> {
  try {
    await db.prospect.update({
      where: { id },
      data: {
        ...(input.firstName !== undefined && { firstName: input.firstName.trim() }),
        ...(input.lastName !== undefined && {
          lastName: input.lastName.trim() || null,
        }),
        ...(input.company !== undefined && {
          company: input.company.trim() || null,
        }),
        ...(input.title !== undefined && { title: input.title.trim() || null }),
        ...(input.email !== undefined && { email: input.email.trim() || null }),
        ...(input.phone !== undefined && { phone: input.phone.trim() || null }),
        ...(input.linkedin !== undefined && {
          linkedin: input.linkedin.trim() || null,
        }),
        ...(input.source !== undefined && {
          source: input.source.trim() || null,
        }),
        ...(input.timezone !== undefined && {
          timezone: input.timezone.trim() || null,
        }),
      },
    })
    revalidateProspects(id)
    return { ok: true }
  } catch (error) {
    return fail(error)
  }
}

export async function setProspectStatusAction(
  ids: string[],
  status: ProspectStatus,
  deadReason?: string,
): Promise<ActionResult> {
  try {
    await db.prospect.updateMany({
      where: { id: { in: ids } },
      data: {
        status,
        deadReason: status === ProspectStatus.DEAD ? (deadReason ?? "manual") : null,
      },
    })
    await db.activity.createMany({
      data: ids.map((id) => ({
        prospectId: id,
        type: ActivityType.STATUS_CHANGE,
        note: `Status → ${status}${deadReason ? ` (${deadReason})` : ""}`,
      })),
    })
    revalidateProspects()
    return { ok: true }
  } catch (error) {
    return fail(error)
  }
}

export async function deleteProspectsAction(ids: string[]): Promise<ActionResult> {
  try {
    await db.prospect.deleteMany({ where: { id: { in: ids } } })
    revalidateProspects()
    return { ok: true }
  } catch (error) {
    return fail(error)
  }
}

export async function upsertPinnedNoteAction(
  prospectId: string,
  body: string,
  noteId?: string,
): Promise<ActionResult> {
  try {
    const trimmed = body.trim()
    if (!trimmed) return { ok: false, error: "Note cannot be empty" }
    if (noteId) {
      await db.note.update({ where: { id: noteId }, data: { body: trimmed } })
    } else {
      await db.note.create({ data: { prospectId, body: trimmed } })
    }
    revalidateProspects(prospectId)
    return { ok: true }
  } catch (error) {
    return fail(error)
  }
}

export async function addNoteAction(
  prospectId: string,
  body: string,
  options: { pinned?: boolean } = {},
): Promise<ActionResult> {
  try {
    const trimmed = body.trim()
    if (!trimmed) return { ok: false, error: "Note cannot be empty" }

    await db.activity.create({
      data: { prospectId, type: ActivityType.NOTE, note: trimmed },
    })

    if (options.pinned) {
      const existing = await db.note.findFirst({
        where: { prospectId },
        orderBy: { updatedAt: "desc" },
      })
      if (existing) {
        await db.note.update({ where: { id: existing.id }, data: { body: trimmed } })
      } else {
        await db.note.create({ data: { prospectId, body: trimmed } })
      }
    }

    revalidateProspects(prospectId)
    return { ok: true }
  } catch (error) {
    return fail(error)
  }
}

export async function addTimelineNoteAction(
  prospectId: string,
  body: string,
): Promise<ActionResult> {
  return addNoteAction(prospectId, body, { pinned: false })
}

export async function theyRepliedAction(
  prospectId: string,
  note?: string,
): Promise<ActionResult> {
  try {
    await markEmailReplyReceived(prospectId, note?.trim() || undefined)
    revalidateProspects(prospectId)
    return { ok: true }
  } catch (error) {
    return fail(error)
  }
}

export async function logAdHocActivityAction(input: {
  prospectId: string
  kind: "call" | "email" | "meeting"
  note?: string
}): Promise<ActionResult> {
  try {
    const note = input.note?.trim() || null
    const type =
      input.kind === "call"
        ? ActivityType.CALL
        : input.kind === "email"
          ? ActivityType.EMAIL_SENT
          : ActivityType.MEETING_BOOKED

    await db.activity.create({
      data: { prospectId: input.prospectId, type, note },
    })

    if (input.kind === "meeting") {
      await db.prospect.update({
        where: { id: input.prospectId },
        data: { status: ProspectStatus.MEETING_BOOKED, deadReason: null },
      })
      const enrollment = await db.enrollment.findFirst({
        where: {
          prospectId: input.prospectId,
          state: { in: [EnrollState.RUNNING, EnrollState.PAUSED] },
        },
      })
      if (enrollment) await stopEnrollment(enrollment.id)
    }

    revalidateProspects(input.prospectId)
    return { ok: true }
  } catch (error) {
    return fail(error)
  }
}

export type TaskProspectOption = {
  id: string
  firstName: string
  lastName: string | null
  company: string | null
  phone: string | null
}

export async function searchProspectsForTaskAction(
  q: string,
): Promise<{ ok: true; prospects: TaskProspectOption[] } | ActionResult> {
  try {
    const trimmed = q.trim()
    if (!trimmed) return { ok: true, prospects: [] }
    const digits = normalizePhone(trimmed)
    const phoneIds =
      digits.length >= 3
        ? (
            await db.$queryRaw<{ id: string }[]>`
              SELECT id FROM "Prospect"
              WHERE phone IS NOT NULL
                AND regexp_replace(phone, '[^0-9+]', '', 'g') LIKE ${"%" + digits + "%"}
            `
          ).map((r) => r.id)
        : []

    const textWhere = buildProspectSearchWhere(trimmed)
    const orClause = [...(textWhere.OR ?? [])]
    if (phoneIds.length > 0) orClause.push({ id: { in: phoneIds } })

    const prospects = await db.prospect.findMany({
      where: { OR: orClause },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        phone: true,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: 8,
    })
    return { ok: true, prospects }
  } catch (error) {
    return fail(error)
  }
}

