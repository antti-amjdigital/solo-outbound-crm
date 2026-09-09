import { StepType } from "@prisma/client"
import { notFound } from "next/navigation"
import { cache } from "react"
import { appToday, formatCalendarDate } from "@/lib/dates"
import { db } from "@/lib/db"

export type SequenceEditorData = {
  id: string
  name: string
  isActive: boolean
  steps: {
    id: string
    order: number
    type: StepType
    label: string
    delayDays: number
    template: string | null
  }[]
  /** Enrollments in any state — the "N enrolled" figure in the header. */
  enrolledAllTime: number
  /** YYYY-MM-DD in APP_TZ — keeps the header's calendar-day count stable across hydration. */
  calendarToday: string
}

/**
 * Per-request memoised: the (app) layout and the sequence page both resolve
 * the default sequence during the same render, so only one query is issued.
 * Prefers an active sequence but falls back to a paused one so the nav rail
 * still has somewhere to point when everything is paused.
 */
export const resolveSequenceId = cache(async function resolveSequenceId(
  idOrDefault: string,
): Promise<string | null> {
  if (idOrDefault !== "default") return idOrDefault
  const first = await db.sequence.findFirst({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: { id: true },
  })
  return first?.id ?? null
})

export async function getSequenceEditorData(
  id: string,
): Promise<SequenceEditorData> {
  const [sequence, enrolledAllTime] = await Promise.all([
    db.sequence.findUnique({
      where: { id },
      include: { steps: { orderBy: { order: "asc" } } },
    }),
    db.enrollment.count({ where: { sequenceId: id } }),
  ])
  if (!sequence) notFound()

  return {
    id: sequence.id,
    name: sequence.name,
    isActive: sequence.isActive,
    steps: sequence.steps.map((s) => ({
      id: s.id,
      order: s.order,
      type: s.type,
      label: s.label,
      delayDays: s.delayDays,
      template: s.template,
    })),
    enrolledAllTime,
    calendarToday: formatCalendarDate(appToday()),
  }
}
