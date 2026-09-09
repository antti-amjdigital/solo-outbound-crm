"use server"

import { db } from "@/lib/db"
import { revalidateProspects } from "@/lib/revalidate"
import type { ActionResult } from "@/actions/prospects"

function fail(error: unknown): ActionResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Something went wrong",
  }
}

/** At most one pinned note per prospect: unpin the rest, then create. */
async function createPinnedNote(prospectId: string, body: string) {
  await db.$transaction([
    db.note.updateMany({
      where: { prospectId, pinned: true },
      data: { pinned: false },
    }),
    db.note.create({ data: { prospectId, body, pinned: true } }),
  ])
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
      await db.note.update({
        where: { id: noteId, prospectId },
        data: { body: trimmed, pinned: true },
      })
    } else {
      await createPinnedNote(prospectId, trimmed)
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

    if (options.pinned) {
      await createPinnedNote(prospectId, trimmed)
    } else {
      await db.note.create({ data: { prospectId, body: trimmed } })
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

/** Pin an existing note (replacing the current pinned one) or unpin it. */
export async function setNotePinnedAction(
  noteId: string,
  prospectId: string,
  pinned: boolean,
): Promise<ActionResult> {
  try {
    if (pinned) {
      await db.$transaction([
        db.note.updateMany({
          where: { prospectId, pinned: true, id: { not: noteId } },
          data: { pinned: false },
        }),
        db.note.update({
          where: { id: noteId, prospectId },
          data: { pinned: true },
        }),
      ])
    } else {
      await db.note.update({
        where: { id: noteId, prospectId },
        data: { pinned: false },
      })
    }
    revalidateProspects(prospectId)
    return { ok: true }
  } catch (error) {
    return fail(error)
  }
}

export async function deleteNoteAction(
  noteId: string,
  prospectId: string,
): Promise<ActionResult> {
  try {
    await db.note.deleteMany({ where: { id: noteId, prospectId } })
    revalidateProspects(prospectId)
    return { ok: true }
  } catch (error) {
    return fail(error)
  }
}
