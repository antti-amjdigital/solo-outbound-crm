"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { CallOutcome } from "@prisma/client"
import { Clock, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DueTodayTaskRow,
  UpcomingTaskRow,
} from "@/components/prospect-detail/focus-task-rows"
import {
  completeTaskAction,
  skipTaskAction,
  snoozeTaskAction,
} from "@/actions/tasks"
import type { ProspectDetail } from "@/lib/prospect-detail-query"

const SECTION_LABEL =
  "mb-1 text-[11px] font-medium tracking-[0.8px] text-[#94a3b8] uppercase"

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
  const [, start] = useTransition()
  const [removingId, setRemovingId] = useState<string | null>(null)
  const { dueToday, upcoming } = data.openTasks
  const pinnedNote = data.notes.find((n) => n.pinned)?.body ?? null
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

  function remove(taskId: string) {
    if (removingId) return
    setRemovingId(taskId)
    if (logOpenTaskId === taskId) onLogOpenTaskIdChange(null)
    start(async () => {
      const res = await skipTaskAction(taskId)
      setRemovingId(null)
      if (!res.ok) toast.error(res.error)
      else {
        toast.success("Task removed")
        router.refresh()
      }
    })
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
                    logOpen={logOpenTaskId === task.id}
                    onLogOpenChange={(open) =>
                      onLogOpenTaskIdChange(open ? task.id : null)
                    }
                    onComplete={complete}
                    onSnooze={snooze}
                    onRemove={remove}
                    removing={removingId === task.id}
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
                  <UpcomingTaskRow
                    key={task.id}
                    task={task}
                    onRemove={remove}
                    removing={removingId === task.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
