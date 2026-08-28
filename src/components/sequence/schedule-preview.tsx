"use client"

import { TypeIcon } from "@/components/today/type-icon"
import { cn } from "@/lib/utils"
import {
  buildSchedulePreview,
  formatPreviewDate,
  formatWeekendLabel,
  previewAnchorDates,
} from "@/lib/sequence-preview"
import { appToday } from "@/lib/dates"
import type { EditorStep } from "./types"

type Anchor = "today" | "monday" | "friday"

const ANCHOR_LABEL: Record<Anchor, string> = {
  today: "Today",
  monday: "Mon",
  friday: "Fri",
}

export function SchedulePreview({
  steps,
  anchor,
  onAnchorChange,
}: {
  steps: EditorStep[]
  anchor: Anchor
  onAnchorChange: (a: Anchor) => void
}) {
  const anchors = previewAnchorDates(appToday())
  const enrolledOn =
    anchor === "today"
      ? anchors.today
      : anchor === "monday"
        ? anchors.monday
        : anchors.friday

  const preview = buildSchedulePreview(
    steps.map((s) => ({ type: s.type, label: s.label, delayDays: s.delayDays })),
    enrolledOn,
  )

  const todayLabel = formatPreviewDate(anchors.today).split(" ")[0]

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="border-b border-border bg-surface px-3 py-2 text-[11px] font-bold tracking-wide text-dim uppercase">
        Schedule preview
      </div>
      <div className="flex flex-wrap items-center gap-1.5 border-b border-line-soft px-3 py-2 text-[11.5px] text-dim">
        If enrolled
        {(
          [
            ["today", `Today · ${todayLabel}`],
            ["monday", "Mon"],
            ["friday", "Fri"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onAnchorChange(key)}
            className={cn(
              "rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
              anchor === key
                ? "border-accent-line bg-accent-soft text-primary"
                : "border-border bg-background text-dim hover:border-primary/30",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-1 py-1">
        {preview.rows.length === 0 && (
          <p className="px-2 py-3 text-xs text-dim">Add a step to preview dates.</p>
        )}
        {preview.rows.map((row, i) => {
          if (row.kind === "weekend") {
            return (
              <div
                key={`w-${i}`}
                className="px-2 py-1.5 text-center text-[11px] text-dim italic"
              >
                {formatWeekendLabel(row.from, row.to)}
              </div>
            )
          }
          return (
            <div
              key={`s-${i}`}
              className="grid grid-cols-[72px_24px_1fr_36px] items-center gap-2 px-2 py-1.5 text-xs"
            >
              <span className="font-mono text-[11px] text-dim">
                {formatPreviewDate(row.date)}
              </span>
              <TypeIcon type={row.type} />
              <span className="truncate text-ink">{row.label || "Untitled"}</span>
              <span className="text-right font-mono text-[11px] text-dim">
                {row.delayDays === 0 ? "now" : `+${row.delayDays}`}
              </span>
            </div>
          )
        })}
      </div>

      {preview.rows.length > 0 && (
        <div className="border-t border-border bg-surface px-3 py-2 text-[11.5px] text-dim">
          Runs{" "}
          <b className="text-ink">
            {preview.calendarDays} calendar day
            {preview.calendarDays === 1 ? "" : "s"}
          </b>{" "}
          · {preview.businessDays} business day
          {preview.businessDays === 1 ? "" : "s"} · {preview.dials} dial
          {preview.dials === 1 ? "" : "s"}
        </div>
      )}
      <span className="sr-only">{ANCHOR_LABEL[anchor]}</span>
    </div>
  )
}

export function SequenceMetaPanel({
  enrolledAllTime,
  runningCount,
  meetingsBooked,
  dialCount,
}: {
  enrolledAllTime: number
  runningCount: number
  meetingsBooked: number
  dialCount: number
}) {
  const rate =
    enrolledAllTime > 0
      ? ((meetingsBooked / enrolledAllTime) * 100).toFixed(1)
      : "—"
  const dialsPer =
    meetingsBooked > 0 ? Math.round(dialCount / meetingsBooked) : "—"

  const rows: [string, string | number][] = [
    ["Enrolled, all time", enrolledAllTime],
    ["Currently running", runningCount],
    ["Meetings booked", meetingsBooked],
    ["Booked per enrolled", typeof rate === "string" ? `${rate}%` : rate],
    ["Dials per meeting", dialsPer],
  ]

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-border bg-background">
      <div className="border-b border-border bg-surface px-3 py-2 text-[11px] font-bold tracking-wide text-dim uppercase">
        This sequence
      </div>
      <table className="w-full text-xs">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-line-soft last:border-0">
              <td className="px-2.5 py-1.5 text-ink">{label}</td>
              <td className="px-2.5 py-1.5 text-right font-mono">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}