"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { ActivityType, StepType, type Activity } from "@prisma/client"
import { CornerDownLeft, Pencil, StickyNote, Trash2, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { TypeIcon } from "@/components/today/type-icon"
import { OUTCOME_LABEL } from "@/components/today/labels"
import { HistoryActivityEditDialog } from "@/components/prospect-detail/history-activity-edit-dialog"
import { deleteActivityAction } from "@/actions/prospects"
import { useFreshEnter } from "@/lib/fresh-enter"
import { waitForUndo } from "@/lib/undo-toast"
import { REMOVED_FROM_SEQUENCE_HISTORY_LABEL } from "@/lib/prospect-filters"
import { splitTaskLabel } from "@/lib/task-label"

const TZ = "Europe/Helsinki"

function activityIcon(a: Activity) {
  if (a.type === ActivityType.CALL) return StepType.CALL
  if (
    a.type === ActivityType.EMAIL_SENT ||
    a.type === ActivityType.EMAIL_REPLY_SENT ||
    a.type === ActivityType.EMAIL_REPLY_RECEIVED
  )
    return a.type === ActivityType.EMAIL_REPLY_SENT ||
      a.type === ActivityType.EMAIL_REPLY_RECEIVED
      ? StepType.EMAIL_REPLY
      : StepType.EMAIL
  return StepType.MANUAL
}

function titleFor(a: Activity, taskLabel?: string): string {
  const { name: rawName } = splitTaskLabel(taskLabel)
  const generic =
    rawName === "Call" || rawName === "Email" || rawName === "To-do"
  const name = rawName && !generic ? rawName : null

  switch (a.type) {
    case ActivityType.CALL:
      return `${name ?? "Call"}${a.outcome ? ` — ${OUTCOME_LABEL[a.outcome]}` : ""}`
    case ActivityType.EMAIL_SENT:
      return name ?? "Email sent"
    case ActivityType.EMAIL_REPLY_SENT:
      return name ?? "Reply sent"
    case ActivityType.EMAIL_REPLY_RECEIVED:
      return REMOVED_FROM_SEQUENCE_HISTORY_LABEL
    case ActivityType.MEETING_BOOKED:
      return name ? `${name} — Meeting booked` : "Meeting booked"
    case ActivityType.NOTE:
      if (!taskLabel) return a.note?.trim() || "Note added"
      return name ?? "Note added"
    case ActivityType.STATUS_CHANGE:
      return a.note?.startsWith("Status")
        ? a.note
        : a.note ?? "Status change"
    default:
      return a.type
  }
}

function isCreationEvent(a: Activity): boolean {
  return (
    a.type === ActivityType.STATUS_CHANGE && a.note === "Prospect created"
  )
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  })
}

function HistoryTypeIcon({ type }: { type: StepType }) {
  return (
    <span className="flex size-[30px] shrink-0 items-center justify-center text-[#64748b]">
      <TypeIcon type={type} variant="inline" className="text-[#64748b]" />
    </span>
  )
}

function HistoryIcon({ activity }: { activity: Activity }) {
  if (isCreationEvent(activity)) {
    return (
      <span className="flex size-[30px] shrink-0 items-center justify-center">
        <UserPlus className="size-3.5 text-[#4f46e5]" />
      </span>
    )
  }
  if (activity.type === ActivityType.NOTE) {
    return (
      <span className="flex size-[30px] shrink-0 items-center justify-center">
        <StickyNote className="size-3.5 text-[#64748b]" />
      </span>
    )
  }
  if (activity.type === ActivityType.EMAIL_REPLY_RECEIVED) {
    return (
      <span className="flex size-[30px] shrink-0 items-center justify-center">
        <CornerDownLeft className="size-3.5 text-[#64748b]" />
      </span>
    )
  }
  return <HistoryTypeIcon type={activityIcon(activity)} />
}

export function ActivityRow({
  activity: a,
  prospectId,
  source,
  taskLabel,
}: {
  activity: Activity
  prospectId: string
  source: string | null
  taskLabel?: string
}) {
  const router = useRouter()
  const [, start] = useTransition()
  const [hidden, setHidden] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const entering = useFreshEnter(a.occurredAt)
  const canRemove = !isCreationEvent(a)
  const canEdit = canRemove && a.type !== ActivityType.STATUS_CHANGE
  const { notes: taskNotes } = splitTaskLabel(taskLabel)
  const activityNote =
    a.type === ActivityType.STATUS_CHANGE
      ? null
      : a.type === ActivityType.NOTE && !taskLabel
        ? null
        : a.note?.trim() || null
  const detailParts = [taskNotes, activityNote].filter(
    (part, i, arr): part is string =>
      Boolean(part) && arr.indexOf(part) === i,
  )

  /** Hide immediately; only delete once the Undo toast has passed. */
  function remove() {
    if (!canRemove || hidden) return
    setHidden(true)
    start(async () => {
      const commit = await waitForUndo("Removed from history")
      if (!commit) {
        setHidden(false)
        return
      }
      const res = await deleteActivityAction(a.id, prospectId)
      if (!res.ok) {
        setHidden(false)
        toast.error(res.error)
      } else {
        router.refresh()
      }
    })
  }

  if (hidden) return null

  return (
    <div
      data-enter-row
      data-entering={entering || undefined}
      className="group relative grid grid-cols-[30px_1fr_auto] items-start gap-3 py-2.5 pr-14"
    >
      <HistoryIcon activity={a} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-semibold text-[#0f172a]">
            {titleFor(a, taskLabel)}
          </span>
          {isCreationEvent(a) && source && (
            <span className="rounded-md bg-[#f1f5f9] px-1.5 py-0.5 text-[11px] font-medium text-[#64748b]">
              {source}
            </span>
          )}
        </div>
        {a.stepOrder != null && (
          <div className="mt-0.5 text-[11px] text-[#94a3b8]">
            Step {a.stepOrder}
          </div>
        )}
        {detailParts.map((part) =>
          canEdit ? (
            <button
              key={part}
              type="button"
              onClick={() => setEditOpen(true)}
              className="mt-1 block w-full whitespace-pre-wrap rounded-md text-left text-[13px] leading-relaxed text-[#64748b] hover:text-[#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f46e5]/30"
            >
              {part}
            </button>
          ) : (
            <div
              key={part}
              className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-[#64748b]"
            >
              {part}
            </div>
          ),
        )}
        {canEdit && detailParts.length === 0 && (
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="mt-1 text-left text-[13px] text-[#94a3b8] hover:text-[#4f46e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f46e5]/30"
          >
            Add a note
          </button>
        )}
      </div>
      <time
        dateTime={a.occurredAt.toISOString()}
        className="shrink-0 whitespace-nowrap text-[13px] tabular-nums text-[#94a3b8]"
      >
        {formatTime(a.occurredAt)}
      </time>
      {canEdit ? (
        <button
          type="button"
          aria-label="Edit activity"
          onClick={() => setEditOpen(true)}
          className="absolute top-2 right-7 flex size-7 items-center justify-center rounded-md text-[#94a3b8] opacity-0 transition-opacity hover:bg-[#f1f5f9] hover:text-[#0f172a] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f46e5]/30 group-hover:opacity-100"
        >
          <Pencil className="size-3.5" />
        </button>
      ) : null}
      {canRemove ? (
        <button
          type="button"
          aria-label="Remove from history"
          onClick={remove}
          className="absolute top-2 right-0 flex size-7 items-center justify-center rounded-md text-[#94a3b8] opacity-0 transition-opacity hover:bg-[#fef2f2] hover:text-[#dc2626] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f46e5]/30 group-hover:opacity-100 disabled:opacity-40"
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : null}
      {editOpen && canEdit ? (
        <HistoryActivityEditDialog
          activity={a}
          prospectId={prospectId}
          title={titleFor(a, taskLabel)}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      ) : null}
    </div>
  )
}
