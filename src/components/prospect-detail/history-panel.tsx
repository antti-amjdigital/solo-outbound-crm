import Link from "next/link"
import { ActivityType, type Activity } from "@prisma/client"
import { TypeIcon } from "@/components/today/type-icon"
import { OUTCOME_LABEL } from "@/components/today/labels"
import type { HistoryFilter } from "@/lib/prospect-filters"
import { cn } from "@/lib/utils"
import { StepType } from "@prisma/client"

const CHIPS: { key: HistoryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "calls", label: "Calls" },
  { key: "emails", label: "Emails" },
  { key: "notes", label: "Notes" },
  { key: "changes", label: "Changes" },
]

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

function titleFor(a: Activity): string {
  switch (a.type) {
    case ActivityType.CALL:
      return `Call${a.outcome ? ` — ${OUTCOME_LABEL[a.outcome]}` : ""}`
    case ActivityType.EMAIL_SENT:
      return "Email sent"
    case ActivityType.EMAIL_REPLY_SENT:
      return "Reply sent"
    case ActivityType.EMAIL_REPLY_RECEIVED:
      return "They replied"
    case ActivityType.MEETING_BOOKED:
      return "Meeting booked"
    case ActivityType.NOTE:
      return "Note added"
    case ActivityType.STATUS_CHANGE:
      return a.note?.startsWith("Status")
        ? a.note
        : a.note ?? "Status change"
    default:
      return a.type
  }
}

export function HistoryPanel({
  prospectId,
  history,
  counts,
  filter,
}: {
  prospectId: string
  history: Activity[]
  counts: Record<HistoryFilter, number>
  filter: HistoryFilter
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">History</span>
        <div className="ml-auto flex flex-wrap gap-1">
          {CHIPS.map((c) => (
            <Link
              key={c.key}
              href={
                c.key === "all"
                  ? `/prospects/${prospectId}`
                  : `/prospects/${prospectId}?history=${c.key}`
              }
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-dim hover:text-foreground",
                filter === c.key &&
                  "bg-accent-soft font-semibold text-primary",
              )}
            >
              {c.label}
              <span className="text-[10px] opacity-70">{counts[c.key]}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="border-t border-border">
        {history.length === 0 && (
          <div className="py-8 text-center text-sm text-dim">No activity yet.</div>
        )}

        {history.map((a) => (
          <div
            key={a.id}
            className="grid grid-cols-[auto_1fr_auto] gap-3 border-b border-line-soft py-3 last:border-0"
          >
            <TypeIcon type={activityIcon(a)} />
            <div className="min-w-0">
              <div className="text-sm font-semibold">{titleFor(a)}</div>
              {a.stepOrder != null && (
                <div className="mt-0.5 text-[11px] text-dim">Step {a.stepOrder}</div>
              )}
              {a.note && a.type !== ActivityType.STATUS_CHANGE && (
                <div className="mt-1.5 border-l-2 border-primary/30 pl-2.5 text-[12.5px] leading-relaxed text-ink">
                  <span className="mr-1 text-[10px] font-semibold tracking-wide text-dim uppercase">
                    {a.type === ActivityType.CALL ? "Call note" : "Note"}
                  </span>
                  {a.note}
                </div>
              )}
            </div>
            <div className="text-right text-[11px] leading-snug text-dim">
              {a.occurredAt.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                timeZone: "Europe/Helsinki",
              })}
              <br />
              {a.occurredAt.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Europe/Helsinki",
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
