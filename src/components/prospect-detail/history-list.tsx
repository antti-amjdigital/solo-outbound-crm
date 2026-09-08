"use client"

import { useMemo } from "react"
import { ActivityType, StepType, type Activity } from "@prisma/client"
import { CornerDownLeft, UserPlus } from "lucide-react"
import { TypeIcon } from "@/components/today/type-icon"
import { OUTCOME_LABEL } from "@/components/today/labels"
import { REMOVED_FROM_SEQUENCE_HISTORY_LABEL } from "@/lib/prospect-filters"

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
  const custom = taskLabel?.trim() || ""
  const generic = custom === "Call" || custom === "Email" || custom === "To-do"
  const name = custom && !generic ? custom : null

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

function dateKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ })
}

function dateLabel(d: Date, todayKey: string): string {
  const key = dateKey(d)
  if (key === todayKey) return "TODAY"
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (key === dateKey(yesterday)) return "YESTERDAY"
  return d
    .toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: TZ,
    })
    .toUpperCase()
}

function groupByDate(
  activities: Activity[],
  todayKey: string,
): { label: string; items: Activity[] }[] {
  const groups: { label: string; key: string; items: Activity[] }[] = []
  for (const a of activities) {
    const key = dateKey(a.occurredAt)
    const last = groups[groups.length - 1]
    if (last?.key === key) last.items.push(a)
    else
      groups.push({
        key,
        label: dateLabel(a.occurredAt, todayKey),
        items: [a],
      })
  }
  return groups
}

function HistoryTypeIcon({ type }: { type: StepType }) {
  return (
    <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-[#f1f5f9] text-[#64748b]">
      <TypeIcon type={type} />
    </span>
  )
}

function HistoryIcon({ activity }: { activity: Activity }) {
  if (isCreationEvent(activity)) {
    return (
      <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-[#eef2ff]">
        <UserPlus className="size-3.5 text-[#4f46e5]" />
      </span>
    )
  }
  if (activity.type === ActivityType.EMAIL_REPLY_RECEIVED) {
    return (
      <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-[#f1f5f9]">
        <CornerDownLeft className="size-3.5 text-[#64748b]" />
      </span>
    )
  }
  return <HistoryTypeIcon type={activityIcon(activity)} />
}

function ActivityRow({
  activity: a,
  source,
  taskLabel,
}: {
  activity: Activity
  source: string | null
  taskLabel?: string
}) {
  return (
    <div className="grid grid-cols-[30px_1fr_auto] items-start gap-3 py-2.5">
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
        {a.note && a.type !== ActivityType.STATUS_CHANGE && (
          <div className="mt-1 text-[13px] leading-relaxed text-[#64748b]">
            {a.note}
          </div>
        )}
      </div>
      <time
        dateTime={a.occurredAt.toISOString()}
        className="shrink-0 whitespace-nowrap text-[13px] tabular-nums text-[#94a3b8]"
      >
        {formatTime(a.occurredAt)}
      </time>
    </div>
  )
}

export function HistoryList({
  history,
  source,
  taskLabels = {},
}: {
  history: Activity[]
  source: string | null
  taskLabels?: Record<string, string>
}) {
  const todayKey = useMemo(
    () => new Date().toLocaleDateString("en-CA", { timeZone: TZ }),
    [],
  )

  const groups = useMemo(
    () => groupByDate(history, todayKey),
    [history, todayKey],
  )

  return (
    <div>
      {history.length === 0 && (
        <div className="py-8 text-center text-[13px] text-[#94a3b8]">
          No activity yet.
        </div>
      )}

      {groups.map((group) => (
        <div key={group.label}>
          <div className="pb-1 pt-3 text-[11px] font-medium tracking-[0.8px] text-[#94a3b8] uppercase first:pt-0">
            {group.label}
          </div>
          {group.items.map((activity) => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              source={source}
              taskLabel={taskLabels[activity.id]}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
