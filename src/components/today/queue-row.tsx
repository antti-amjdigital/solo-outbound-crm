"use client"

import Link from "next/link"
import { useLayoutEffect, useRef, useState } from "react"
import { CallOutcome, StepType, TaskStatus } from "@prisma/client"
import { CopyContactButton } from "@/components/today/copy-contact-button"
import { OutcomePill } from "@/components/today/outcome-pill"
import { OutcomePopover } from "@/components/today/outcome-popover"
import { SnoozeMenu } from "@/components/today/snooze-menu"
import { TypeIcon } from "@/components/today/type-icon"
import { contactForType, prospectDisplayName } from "@/components/today/labels"
import type { TodayQueueItem } from "@/lib/queries"
import { cn } from "@/lib/utils"

type Props = {
  item: TodayQueueItem
  selected: boolean
  exiting?: boolean
  done?: boolean
  popoverOpen: boolean
  snoozeOpen: boolean
  showSnooze: boolean
  onSelect: () => void
  onPopoverOpenChange: (open: boolean) => void
  onSnoozeOpenChange: (open: boolean) => void
  onComplete: (input: {
    taskId: string
    outcome?: CallOutcome
    note?: string
    nextDueDate?: string
  }) => void
  onSnooze: (taskId: string, dueDate: string) => void
}

function formatDoneTime(d: Date | null): string {
  if (!d) return ""
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Helsinki",
  })
}

function DoneCheck({ animate }: { animate?: boolean }) {
  return (
    <span
      data-queue-check={animate ? "" : undefined}
      className="inline-flex size-5 items-center justify-center rounded-full bg-[#16a34a] text-white"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-3 fill-none stroke-current [stroke-width:3] [stroke-linecap:round] [stroke-linejoin:round]"
        aria-hidden
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  )
}

const ROW_GRID =
  "grid grid-cols-[28px_minmax(0,1fr)_190px_130px_90px] items-center gap-3.5 px-4 py-3"

export function QueueRow({
  item,
  selected,
  exiting = false,
  done = false,
  popoverOpen,
  snoozeOpen,
  showSnooze,
  onSelect,
  onPopoverOpenChange,
  onSnoozeOpenChange,
  onComplete,
  onSnooze,
}: Props) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [exitPhase, setExitPhase] = useState<"idle" | "collapse">("idle")
  const isDone = done || item.status === TaskStatus.DONE
  const name = prospectDisplayName(item.prospect)
  const contact = contactForType(item.type, item.prospect)
  const company = item.prospect.company

  useLayoutEffect(() => {
    if (!exiting) {
      setExitPhase("idle")
      const row = rowRef.current
      if (row) {
        row.style.height = ""
        row.style.transition = ""
      }
      return
    }

    const row = rowRef.current
    if (!row) return

    const height = row.getBoundingClientRect().height
    row.style.height = `${height}px`
    void row.offsetHeight

    const ease = "cubic-bezier(0.2, 0, 0, 1)"
    row.style.transition = `height 200ms ${ease}`
    setExitPhase("collapse")

    requestAnimationFrame(() => {
      row.style.height = "0px"
    })
  }, [exiting])

  return (
    <div
      ref={rowRef}
      role="row"
      data-queue-row
      data-state={selected ? "selected" : undefined}
      data-exiting={exiting || undefined}
      data-exit-phase={exiting ? exitPhase : undefined}
      className={cn(
        ROW_GRID,
        "cursor-pointer hover:bg-[#f8fafc] focus-within:bg-[#f8fafc]",
        selected && !exiting && !isDone && "bg-[#f8fafc]",
      )}
      onClick={onSelect}
    >
      <div role="cell" className="flex items-center justify-center">
        {isDone ? (
          <DoneCheck />
        ) : exiting ? (
          <DoneCheck animate />
        ) : (
          <OutcomePopover
            taskId={item.id}
            taskType={item.type}
            hasActiveSequence={item.hasActiveSequence}
            open={popoverOpen}
            onOpenChange={onPopoverOpenChange}
            onComplete={onComplete}
          />
        )}
      </div>

      <div role="cell" className="min-w-0">
        <div
          className={cn(
            "truncate text-[14px] font-semibold",
            isDone ? "text-[#64748b]" : "text-[#1e293b]",
          )}
        >
          <Link
            href={`/prospects/${item.prospect.id}`}
            className="hover:underline focus-visible:ring-2 focus-visible:ring-[#4f46e5]/30 focus-visible:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            {name}
          </Link>
          {company ? (
            <span className="font-normal text-[#94a3b8]"> · {company}</span>
          ) : null}
        </div>
        <div
          className={cn(
            "mt-0.5 flex min-w-0 items-center gap-1.5 text-[13px]",
            isDone ? "text-[#94a3b8]" : "text-[#64748b]",
          )}
        >
          <TypeIcon type={item.type} variant="inline" />
          <span className="truncate">{item.label}</span>
        </div>
      </div>

      <div role="cell" className="group/contact flex min-w-0 items-center gap-1">
        {contact.text !== "—" ? (
          <>
            {contact.href ? (
              <a
                href={contact.href}
                className={cn(
                  "truncate text-[14px] font-medium tabular-nums hover:underline focus-visible:ring-2 focus-visible:ring-[#4f46e5]/30 focus-visible:outline-none",
                  isDone ? "text-[#94a3b8]" : "text-[#1e293b]",
                  contact.muted && "font-normal",
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {contact.text}
              </a>
            ) : (
              <span
                className={cn(
                  "truncate text-[14px] font-medium tabular-nums",
                  isDone ? "text-[#94a3b8]" : "text-[#1e293b]",
                  contact.muted && "font-normal",
                )}
              >
                {contact.text}
              </span>
            )}
            {contact.raw ? (
              <CopyContactButton
                value={contact.raw}
                label={`Copy ${item.type === StepType.CALL ? "phone number" : "contact"}`}
              />
            ) : null}
          </>
        ) : (
          <span className="text-[14px] text-[#cbd5e1]">—</span>
        )}
      </div>

      <div role="cell">
        <OutcomePill outcome={item.lastOutcome} />
      </div>

      <div role="cell" className="text-right">
        {isDone ? (
          <span className="text-[13px] tabular-nums text-[#94a3b8]">
            {formatDoneTime(item.completedAt)}
          </span>
        ) : item.type === StepType.EMAIL ||
          item.type === StepType.EMAIL_REPLY ? (
          <button
            type="button"
            disabled={!item.template || exiting}
            className="text-[13px] text-[#64748b] hover:text-[#1e293b] disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-[#4f46e5]/30 focus-visible:outline-none"
            onClick={(e) => {
              e.stopPropagation()
              if (item.template) void navigator.clipboard.writeText(item.template)
            }}
          >
            Copy template
          </button>
        ) : showSnooze ? (
          <SnoozeMenu
            taskId={item.id}
            open={snoozeOpen}
            onOpenChange={onSnoozeOpenChange}
            onSnooze={onSnooze}
          />
        ) : null}
      </div>
    </div>
  )
}
