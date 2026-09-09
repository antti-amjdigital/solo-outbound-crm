"use client"

import { useMemo } from "react"
import { parseCalendarDate } from "@/lib/dates"
import { buildSchedulePreview } from "@/lib/sequence-preview"
import { cn } from "@/lib/utils"
import { EnrollProspectsDialog } from "./enroll-prospects-dialog"
import { SequenceMenu } from "./sequence-menu"
import type { EditorStep } from "./types"

function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`
}

export function SequenceHeader({
  sequenceId,
  name,
  isActive,
  steps,
  enrolledAllTime,
  calendarToday,
  hasUnsavedChanges,
}: {
  sequenceId: string
  name: string
  isActive: boolean
  steps: EditorStep[]
  enrolledAllTime: number
  calendarToday: string
  hasUnsavedChanges: boolean
}) {
  // Same business-day math as the engine; "runs N calendar days" counts the
  // span from the first due date to the last, weekends included. Start day
  // comes from the server so SSR and hydration agree.
  const schedule = useMemo(
    () =>
      buildSchedulePreview(
        steps.map((s) => ({ type: s.type, label: s.label, delayDays: s.delayDays })),
        parseCalendarDate(calendarToday),
      ),
    [steps, calendarToday],
  )

  const meta = [
    plural(steps.length, "step"),
    `runs ${plural(schedule.calendarDays, "calendar day")}`,
    plural(schedule.dials, "dial"),
    `${enrolledAllTime} enrolled`,
  ].join(" · ")

  return (
    <header className="flex shrink-0 items-center gap-3.5 border-b border-stats-card-line bg-white px-8 py-5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-center gap-2.5">
          <h1 className="truncate text-xl font-bold tracking-tight text-stats-ink">
            {name}
          </h1>
          <span
            className={cn(
              "inline-flex h-6 shrink-0 items-center rounded-full border px-2.5 text-xs font-semibold",
              isActive
                ? "border-seq-teal-line bg-seq-teal-soft text-seq-teal-ink"
                : "border-stats-picker-line bg-stats-track text-stats-secondary",
            )}
          >
            {isActive ? "Active" : "Paused"}
          </span>
        </div>
        <p className="text-[13px] text-stats-muted tabular-nums">{meta}</p>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <EnrollProspectsDialog
          sequenceId={sequenceId}
          sequenceName={name}
          hasUnsavedChanges={hasUnsavedChanges}
        />
        <SequenceMenu sequenceId={sequenceId} name={name} isActive={isActive} />
      </div>
    </header>
  )
}
