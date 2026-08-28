"use client"

import Link from "next/link"
import { useLayoutEffect, useRef, useState } from "react"
import { CallOutcome, StepType, TaskStatus } from "@prisma/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { OutcomePopover } from "@/components/today/outcome-popover"
import { SnoozeMenu } from "@/components/today/snooze-menu"
import { TypeIcon } from "@/components/today/type-icon"
import {
  OUTCOME_LABEL,
  contactForType,
  prospectDisplayName,
} from "@/components/today/labels"
import { overdueDays } from "@/lib/queue-filters"
import type { TodayQueueItem } from "@/lib/queries"
import { cn } from "@/lib/utils"

type Props = {
  item: TodayQueueItem
  selected: boolean
  exiting?: boolean
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
      className="inline-flex size-[18px] items-center justify-center rounded-full bg-good text-white"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-2.5 fill-none stroke-current [stroke-width:3]"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  )
}

export function QueueRow({
  item,
  selected,
  exiting = false,
  popoverOpen,
  snoozeOpen,
  showSnooze,
  onSelect,
  onPopoverOpenChange,
  onSnoozeOpenChange,
  onComplete,
  onSnooze,
}: Props) {
  const rowRef = useRef<HTMLTableRowElement>(null)
  const [exitPhase, setExitPhase] = useState<"idle" | "collapse">("idle")
  const done = item.status === TaskStatus.DONE
  const name = prospectDisplayName(item.prospect)
  const contact = contactForType(item.type, item.prospect)
  const daysLate = !done && !exiting ? overdueDays(item.dueDate) : 0
  const isCallback =
    item.lastOutcome === CallOutcome.CALLBACK_REQUESTED && !done

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
    <TableRow
      ref={rowRef}
      data-state={selected ? "selected" : undefined}
      data-exiting={exiting || undefined}
      data-exit-phase={exiting ? exitPhase : undefined}
      className={cn(
        "cursor-pointer",
        selected &&
          !exiting &&
          "bg-accent-soft/60 shadow-[inset_3px_0_0_var(--accent-brand)]",
        done &&
          "text-dim hover:bg-transparent [&_td]:line-through [&_td:first-child]:no-underline [&_td:last-child]:no-underline",
      )}
      onClick={onSelect}
    >
      <TableCell className="w-11">
        {done ? (
          <DoneCheck />
        ) : exiting ? (
          <DoneCheck animate />
        ) : (
          <OutcomePopover
            taskId={item.id}
            taskType={item.type}
            prospectName={name}
            open={popoverOpen}
            onOpenChange={onPopoverOpenChange}
            onComplete={onComplete}
          />
        )}
      </TableCell>

      <TableCell className="max-w-[280px]">
        <span className="inline-flex items-center gap-2">
          <TypeIcon type={item.type} />
          <span className="truncate font-medium">{item.label}</span>
          {daysLate > 0 && (
            <span className="shrink-0 text-[11px] font-semibold text-bad">
              · overdue {daysLate}d
            </span>
          )}
          {isCallback && (
            <Badge
              variant="outline"
              className="border-accent-line bg-accent-soft text-primary"
            >
              callback
            </Badge>
          )}
        </span>
      </TableCell>

      <TableCell>
        <Link
          href={`/prospects/${item.prospect.id}`}
          className="hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {name}
        </Link>
      </TableCell>

      <TableCell className="text-dim">{item.prospect.company ?? "—"}</TableCell>

      <TableCell>
        {contact.href ? (
          <a
            href={contact.href}
            className={cn("font-mono text-[12px]", contact.muted && "text-dim")}
            onClick={(e) => e.stopPropagation()}
          >
            {contact.text}
          </a>
        ) : (
          <span
            className={cn("font-mono text-[12px]", contact.muted && "text-dim")}
          >
            {contact.text}
          </span>
        )}
      </TableCell>

      <TableCell>
        {item.lastOutcome ? (
          <Badge variant="outline" className="font-normal">
            {OUTCOME_LABEL[item.lastOutcome]}
          </Badge>
        ) : (
          <span className="text-[11px] text-dim">—</span>
        )}
      </TableCell>

      <TableCell className="text-right">
        {done ? (
          <span className="text-[11px]">{formatDoneTime(item.completedAt)}</span>
        ) : item.type === StepType.EMAIL ||
          item.type === StepType.EMAIL_REPLY ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={!item.template || exiting}
            onClick={(e) => {
              e.stopPropagation()
              if (item.template) void navigator.clipboard.writeText(item.template)
            }}
          >
            Copy template
          </Button>
        ) : showSnooze ? (
          <SnoozeMenu
            taskId={item.id}
            open={snoozeOpen}
            onOpenChange={onSnoozeOpenChange}
            onSnooze={onSnooze}
          />
        ) : null}
      </TableCell>
    </TableRow>
  )
}
