"use client"

import { useMemo, useOptimistic, useState, useTransition } from "react"
import { CallOutcome, TaskStatus } from "@prisma/client"
import { toast } from "sonner"
import { groupOverdue } from "@/components/today/queue-overdue-groups"
import { QueueTaskRow } from "@/components/today/queue-task-row"
import { QueueNoteDialog } from "@/components/today/queue-note-dialog"
import { useTodayHotkeys } from "@/components/today/use-today-hotkeys"
import { waitForUndo } from "@/lib/undo-toast"
import { OUTCOME_LABEL, prospectDisplayName } from "@/components/today/labels"
import { completeTaskAction, snoozeTaskAction } from "@/actions/tasks"
import type { QueueRangeFilter } from "@/lib/queue-filters"
import type { TodayProgress, TodayQueueItem } from "@/lib/queries"

const EXIT_MS = 220

type QueueState = { open: TodayQueueItem[]; done: TodayQueueItem[] }

type OptimisticAction =
  | { kind: "complete"; taskId: string; outcome?: CallOutcome }
  | { kind: "snooze"; taskId: string }

function applyOptimistic(
  state: QueueState,
  action: OptimisticAction,
): QueueState {
  if (action.kind === "snooze") {
    return { ...state, open: state.open.filter((t) => t.id !== action.taskId) }
  }
  const task = state.open.find((t) => t.id === action.taskId)
  if (!task) return state
  return {
    open: state.open.filter((t) => t.id !== action.taskId),
    done: [
      {
        ...task,
        status: TaskStatus.DONE,
        completedAt: new Date(),
        lastOutcome: action.outcome ?? task.lastOutcome,
      },
      ...state.done,
    ],
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export function TodayQueue({
  open: initialOpen,
  done: initialDone,
  range,
  todayProgress,
}: {
  open: TodayQueueItem[]
  done: TodayQueueItem[]
  range: QueueRangeFilter
  todayProgress: TodayProgress
}) {
  const [optimistic, dispatch] = useOptimistic(
    { open: initialOpen, done: initialDone },
    applyOptimistic,
  )
  const [, startTransition] = useTransition()
  const [selectedId, setSelectedId] = useState<string | null>(
    initialOpen[0]?.id ?? null,
  )
  const [popoverId, setPopoverId] = useState<string | null>(null)
  const [snoozeId, setSnoozeId] = useState<string | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [exitingIds, setExitingIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  )

  const isTodayView = range === "today"
  const completedItems = isTodayView ? optimistic.done : []
  const progressPct =
    todayProgress.total > 0
      ? Math.round((todayProgress.done / todayProgress.total) * 100)
      : 0

  const overdueGroups = useMemo(
    () => (range === "overdue" ? groupOverdue(optimistic.open) : []),
    [range, optimistic.open],
  )

  function selectNext(afterId: string) {
    const next = optimistic.open.find(
      (t) => t.id !== afterId && !exitingIds.has(t.id),
    )
    setSelectedId(next?.id ?? null)
  }

  function markExiting(taskId: string, on: boolean) {
    setExitingIds((prev) => {
      const next = new Set(prev)
      if (on) next.add(taskId)
      else next.delete(taskId)
      return next
    })
  }

  function complete(input: {
    taskId: string
    outcome?: CallOutcome
    note?: string
    nextDueDate?: string
  }) {
    setPopoverId(null)
    selectNext(input.taskId)
    const label = input.outcome
      ? OUTCOME_LABEL[input.outcome]
      : "Completed"

    startTransition(async () => {
      markExiting(input.taskId, true)
      const undoPromise = waitForUndo(`Logged ${label}`)
      await sleep(EXIT_MS)

      const early = await Promise.race([
        undoPromise.then((ok) => ({ kind: "undo" as const, ok })),
        Promise.resolve({ kind: "continue" as const }),
      ])
      if (early.kind === "undo" && !early.ok) {
        markExiting(input.taskId, false)
        setSelectedId(input.taskId)
        return
      }

      dispatch({
        kind: "complete",
        taskId: input.taskId,
        outcome: input.outcome,
      })
      markExiting(input.taskId, false)

      const shouldCommit = await undoPromise
      if (!shouldCommit) {
        setSelectedId(input.taskId)
        return
      }
      const result = await completeTaskAction(input)
      if (!result.ok) {
        toast.error(result.error)
        setSelectedId(input.taskId)
      }
    })
  }

  function snooze(taskId: string, dueDate: string) {
    setSnoozeId(null)
    selectNext(taskId)
    startTransition(async () => {
      markExiting(taskId, true)
      await sleep(EXIT_MS)
      dispatch({ kind: "snooze", taskId })
      markExiting(taskId, false)
      const result = await snoozeTaskAction({ taskId, dueDate })
      if (!result.ok) toast.error(result.error)
    })
  }

  useTodayHotkeys({
    open: optimistic.open.filter((t) => !exitingIds.has(t.id)),
    selectedId,
    popoverOpen: popoverId !== null,
    noteOpen,
    setSelectedId,
    setPopoverId,
    setSnoozeId,
    setNoteOpen,
    onComplete: complete,
  })

  const selected = optimistic.open.find((t) => t.id === selectedId)
  const hasOpen = optimistic.open.length > 0
  const hasCompleted = completedItems.length > 0
  const emptyToday = isTodayView && todayProgress.total === 0
  const allDoneToday = isTodayView && !hasOpen && hasCompleted

  const rowProps = {
    selectedId,
    exitingIds,
    popoverId,
    snoozeId,
    setSelectedId,
    setPopoverId,
    setSnoozeId,
    complete,
    snooze,
  }

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-[#e8edf4] bg-white">
        <header className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5">
          <h2 className="text-[15px] font-bold text-[#0f172a]">
            {allDoneToday ? "All done for today" : "To do"}
          </h2>
          {isTodayView && !emptyToday ? (
            <>
              <span className="text-[13px] text-[#94a3b8]">
                {todayProgress.done} of {todayProgress.total} done today
              </span>
              <div
                className="h-[5px] w-[120px] overflow-hidden rounded-[3px] bg-[#f1f5f9]"
                role="progressbar"
                aria-valuenow={todayProgress.done}
                aria-valuemin={0}
                aria-valuemax={todayProgress.total}
              >
                <div
                  className="h-full rounded-[3px] bg-[#4f46e5] transition-[width] duration-200"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </>
          ) : null}
        </header>

        {emptyToday ? (
          <p className="px-4 py-8 text-[14px] text-[#64748b]">No tasks for today</p>
        ) : (
          <div role="table">
            {range === "overdue" && overdueGroups.length > 0
              ? overdueGroups.map((group) => (
                  <div key={group.label}>
                    <div className="px-4 pb-1 pt-2 text-[11px] font-medium tracking-[0.8px] text-[#94a3b8] uppercase">
                      {group.label}
                    </div>
                    {group.items.map((item) => (
                      <QueueTaskRow key={item.id} item={item} {...rowProps} />
                    ))}
                  </div>
                ))
              : optimistic.open.map((item) => (
                  <QueueTaskRow key={item.id} item={item} {...rowProps} />
                ))}

            {isTodayView && hasCompleted ? (
              <div className="pb-2 pt-1">
                <div className="flex items-center gap-2 px-4 py-2">
                  <span className="text-[11px] font-medium tracking-[0.8px] text-[#94a3b8] uppercase">
                    COMPLETED
                  </span>
                  <span className="inline-flex min-w-[18px] items-center justify-center rounded-md bg-[#f1f5f9] px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-[#64748b]">
                    {completedItems.length}
                  </span>
                </div>
                {completedItems.map((item) => (
                  <QueueTaskRow key={item.id} item={item} done {...rowProps} />
                ))}
              </div>
            ) : null}

            {!hasOpen && !hasCompleted && !emptyToday ? (
              <p className="px-4 py-8 text-[14px] text-[#64748b]">
                No tasks in this range
              </p>
            ) : null}
          </div>
        )}
      </section>

      <QueueNoteDialog
        open={noteOpen}
        prospectId={selected?.prospect.id ?? null}
        prospectName={selected ? prospectDisplayName(selected.prospect) : ""}
        onOpenChange={setNoteOpen}
      />
    </>
  )
}
