"use client"

import { useRouter } from "next/navigation"
import { CallOutcome } from "@prisma/client"
import { Clock, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { OutcomePopover } from "@/components/today/outcome-popover"
import { SnoozeMenu } from "@/components/today/snooze-menu"
import { TypeIcon } from "@/components/today/type-icon"
import { OUTCOME_LABEL } from "@/components/today/labels"
import { completeTaskAction, snoozeTaskAction } from "@/actions/tasks"
import { formatRelativeDue } from "@/lib/prospect-queries"
import type { OpenTaskItem, ProspectDetail } from "@/lib/prospect-detail-query"

const SECTION_LABEL =
  "mb-1 text-[11px] font-medium tracking-[0.8px] text-[#94a3b8] uppercase"

function DueTodayTaskRow({
  task,
  prospectName,
  logOpen,
  onLogOpenChange,
  onComplete,
  onSnooze,
  showContext,
  lastCallOutcome,
  pinnedNote,
}: {
  task: OpenTaskItem
  prospectName: string
  logOpen: boolean
  onLogOpenChange: (open: boolean) => void
  onComplete: (input: {
    taskId: string
    outcome?: CallOutcome
    note?: string
    nextDueDate?: string
  }) => void
  onSnooze: (taskId: string, dueDate: string) => void
  showContext?: boolean
  lastCallOutcome: ProspectDetail["lastCallOutcome"]
  pinnedNote: string | null
}) {
  return (
    <div className="rounded-lg border border-[#c7d2fe] bg-[#f5f7ff]/50 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-3">
        <TypeIcon type={task.type} />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-[#0f172a]">
            {task.label}
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
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

function UpcomingTaskRow({ task }: { task: OpenTaskItem }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <TypeIcon type={task.type} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-[#0f172a]">
          {task.label}
        </div>
      </div>
      <span className="shrink-0 text-[12px] tabular-nums text-[#94a3b8]">
        {formatRelativeDue(task.dueDate)}
      </span>
    </div>
  )
}

export function FocusPanel({
  data,
  logOpenTaskId,
  onLogOpenTaskIdChange,
  onAddTaskClick,
}: {
  data: ProspectDetail
  logOpenTaskId: string | null
  onLogOpenTaskIdChange: (taskId: string | null) => void
  onAddTaskClick: () => void
}) {
  const router = useRouter()
  const { dueToday, upcoming } = data.openTasks
  const firstName = data.prospect.firstName
  const prospectName = [data.prospect.firstName, data.prospect.lastName]
    .filter(Boolean)
    .join(" ")
  const pinnedNote = data.notes[0]?.body ?? null
  const hasTasks = dueToday.length > 0 || upcoming.length > 0

  async function complete(input: {
    taskId: string
    outcome?: CallOutcome
    note?: string
    nextDueDate?: string
  }) {
    onLogOpenTaskIdChange(null)
    const res = await completeTaskAction(input)
    if (!res.ok) toast.error(res.error)
    else {
      toast.success("Logged")
      router.refresh()
    }
  }

  async function snooze(taskId: string, dueDate: string) {
    const res = await snoozeTaskAction({ taskId, dueDate })
    if (!res.ok) toast.error(res.error)
    else {
      toast.success("Snoozed")
      router.refresh()
    }
  }

  return (
    <div className="rounded-xl border border-[#e8edf4] bg-white px-4 py-3.5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[15px] font-bold text-[#0f172a]">Tasks</span>
        <Button
          size="sm"
          className="bg-[#4f46e5] hover:bg-[#4338ca]"
          onClick={onAddTaskClick}
        >
          <Plus className="size-3.5" />
          Add task
        </Button>
      </div>

      {!hasTasks ? (
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f1f5f9]">
            <Clock className="size-4 text-[#64748b]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold text-[#0f172a]">
              No open tasks
            </div>
            <p className="text-[13px] text-[#94a3b8]">
              {data.enrollment
                ? `Nothing is scheduled for ${firstName} right now.`
                : `Not enrolled in a sequence — nothing is scheduled for ${firstName}.`}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {dueToday.length > 0 && (
            <div>
              <div className={SECTION_LABEL}>Due today</div>
              <div className="space-y-2">
                {dueToday.map((task, i) => (
                <DueTodayTaskRow
                  key={task.id}
                  task={task}
                  prospectName={prospectName}
                  logOpen={logOpenTaskId === task.id}
                  onLogOpenChange={(open) =>
                    onLogOpenTaskIdChange(open ? task.id : null)
                  }
                  onComplete={complete}
                  onSnooze={snooze}
                  showContext={i === 0}
                  lastCallOutcome={data.lastCallOutcome}
                  pinnedNote={pinnedNote}
                />
                ))}
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div>
              <div className={SECTION_LABEL}>Upcoming</div>
              <div className="divide-y divide-[#f1f5f9]">
                {upcoming.map((task) => (
                  <UpcomingTaskRow key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
