"use client"

import { CallOutcome } from "@prisma/client"
import { Trash2 } from "lucide-react"
import { OutcomePopover } from "@/components/today/outcome-popover"
import { SnoozeMenu } from "@/components/today/snooze-menu"
import { TypeIcon } from "@/components/today/type-icon"
import { OUTCOME_LABEL } from "@/components/today/labels"
import { formatRelativeDue } from "@/lib/prospect-queries"
import { splitTaskLabel } from "@/lib/task-label"
import type { OpenTaskItem, ProspectDetail } from "@/lib/prospect-detail-query"

export function DueTodayTaskRow({
  task,
  logOpen,
  onLogOpenChange,
  onComplete,
  onSnooze,
  onRemove,
  removing,
  showContext,
  lastCallOutcome,
  pinnedNote,
}: {
  task: OpenTaskItem
  logOpen: boolean
  onLogOpenChange: (open: boolean) => void
  onComplete: (input: {
    taskId: string
    outcome?: CallOutcome
    note?: string
    nextDueDate?: string
  }) => void
  onSnooze: (taskId: string, dueDate: string) => void
  onRemove: (taskId: string) => void
  removing?: boolean
  showContext?: boolean
  lastCallOutcome: ProspectDetail["lastCallOutcome"]
  pinnedNote: string | null
}) {
  const { name, notes } = splitTaskLabel(task.label)
  return (
    <div className="group relative rounded-lg border border-[#c7d2fe] bg-[#f5f7ff]/50 px-3 py-2.5">
      <button
        type="button"
        aria-label="Remove task"
        disabled={removing}
        onClick={() => onRemove(task.id)}
        className="absolute top-2 right-2 z-10 flex size-7 items-center justify-center rounded-md text-[#94a3b8] opacity-0 transition-opacity hover:bg-[#fef2f2] hover:text-[#dc2626] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f46e5]/30 group-hover:opacity-100 disabled:opacity-40"
      >
        <Trash2 className="size-3.5" />
      </button>
      <div className="flex flex-wrap items-start gap-3">
        <TypeIcon type={task.type} />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-[#0f172a]">
            {name ?? task.label}
          </div>
          {notes ? (
            <div className="mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed text-[#64748b]">
              {notes}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1.5 pt-0.5 pr-7">
          <SnoozeMenu taskId={task.id} onSnooze={onSnooze} />
          <OutcomePopover
            taskId={task.id}
            taskType={task.type}
            hasActiveSequence={task.hasActiveSequence}
            open={logOpen}
            onOpenChange={onLogOpenChange}
            onComplete={onComplete}
          />
        </div>
      </div>
      {showContext && (lastCallOutcome || pinnedNote) && (
        <div className="mt-3 rounded-lg border-l-2 border-[#c7d2fe] bg-white/70 px-3 py-2 text-[13px] leading-relaxed text-[#1e293b]">
          <div className="mb-1 text-[10px] font-semibold tracking-wide text-[#94a3b8] uppercase">
            Before you dial
          </div>
          {lastCallOutcome && (
            <>
              Last outcome was{" "}
              <b>
                {OUTCOME_LABEL[lastCallOutcome.outcome as CallOutcome] ??
                  lastCallOutcome.outcome}
              </b>{" "}
              on{" "}
              {lastCallOutcome.occurredAt.toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Europe/Helsinki",
              })}
              .
            </>
          )}
          {pinnedNote && (
            <>
              {lastCallOutcome ? " " : null}
              Pinned: {pinnedNote.split("\n")[0]}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function UpcomingTaskRow({
  task,
  onRemove,
  removing,
}: {
  task: OpenTaskItem
  onRemove: (taskId: string) => void
  removing?: boolean
}) {
  const { name, notes } = splitTaskLabel(task.label)
  return (
    <div className="group relative flex items-center gap-3 py-2 pr-8">
      <TypeIcon type={task.type} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-[#0f172a]">
          {name ?? task.label}
        </div>
        {notes ? (
          <div className="truncate text-[12px] text-[#94a3b8]">{notes}</div>
        ) : null}
      </div>
      <span className="shrink-0 text-[12px] tabular-nums text-[#94a3b8]">
        {formatRelativeDue(task.dueDate)}
      </span>
      <button
        type="button"
        aria-label="Remove task"
        disabled={removing}
        onClick={() => onRemove(task.id)}
        className="absolute top-1/2 right-0 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-[#94a3b8] opacity-0 transition-opacity hover:bg-[#fef2f2] hover:text-[#dc2626] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f46e5]/30 group-hover:opacity-100 disabled:opacity-40"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  )
}
