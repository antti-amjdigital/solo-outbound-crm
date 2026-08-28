"use client"

import { useOptimistic, useState, useTransition } from "react"
import { CallOutcome, StepType, TaskStatus } from "@prisma/client"
import Link from "next/link"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { QueueRow } from "@/components/today/queue-row"
import { QueueNoteDialog } from "@/components/today/queue-note-dialog"
import { useTodayHotkeys } from "@/components/today/use-today-hotkeys"
import { waitForUndo } from "@/components/today/undo-toast"
import { OUTCOME_LABEL, prospectDisplayName } from "@/components/today/labels"
import { completeTaskAction, snoozeTaskAction } from "@/actions/tasks"
import type { TodayQueueItem } from "@/lib/queries"

/** Match CSS collapse duration — keep snappy. */
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
}: {
  open: TodayQueueItem[]
  done: TodayQueueItem[]
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
  const rows = [...optimistic.open, ...optimistic.done]

  if (rows.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center">
        <p className="text-sm font-medium">Queue is clear</p>
        <p className="text-xs text-dim">
          Enroll new prospects to keep the pipeline moving.
        </p>
        <Link
          href="/prospects?status=NEW"
          className="mt-2 text-sm font-medium text-primary hover:underline"
        >
          View un-enrolled prospects →
        </Link>
      </div>
    )
  }

  return (
    <>
      <Table className="text-[12.5px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-11">Done</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead className="w-40">Prospect</TableHead>
            <TableHead className="w-44">Company</TableHead>
            <TableHead className="w-44">Phone / Email</TableHead>
            <TableHead className="w-32">Last outcome</TableHead>
            <TableHead className="w-24 text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((item) => (
            <QueueRow
              key={item.id}
              item={item}
              selected={
                selectedId === item.id && item.status === TaskStatus.OPEN
              }
              exiting={exitingIds.has(item.id)}
              popoverOpen={popoverId === item.id}
              snoozeOpen={snoozeId === item.id}
              onSelect={() => setSelectedId(item.id)}
              onPopoverOpenChange={(open) => {
                setPopoverId(open ? item.id : null)
                if (open) setSelectedId(item.id)
              }}
              onSnoozeOpenChange={(open) => {
                setSnoozeId(open ? item.id : null)
                if (open) setSelectedId(item.id)
              }}
              onComplete={complete}
              onSnooze={snooze}
              showSnooze={
                item.type !== StepType.EMAIL &&
                item.type !== StepType.EMAIL_REPLY
              }
            />
          ))}
        </TableBody>
      </Table>

      <QueueNoteDialog
        open={noteOpen}
        prospectId={selected?.prospect.id ?? null}
        prospectName={selected ? prospectDisplayName(selected.prospect) : ""}
        onOpenChange={setNoteOpen}
      />
    </>
  )
}
