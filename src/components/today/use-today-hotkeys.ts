"use client"

import { useHotkeys } from "react-hotkeys-hook"
import { CallOutcome, StepType } from "@prisma/client"
import { OUTCOME_OPTIONS } from "@/components/today/labels"
import {
  addBusinessDays,
  appToday,
  formatCalendarDate,
  toCalendarDate,
} from "@/lib/dates"
import type { TodayQueueItem } from "@/lib/queries"

const OUTCOME_BY_KBD = Object.fromEntries(
  OUTCOME_OPTIONS.map((o) => [o.kbd, o.value]),
) as Record<string, CallOutcome>

type Args = {
  open: TodayQueueItem[]
  selectedId: string | null
  popoverOpen: boolean
  noteOpen: boolean
  setSelectedId: (id: string | null) => void
  setPopoverId: (id: string | null) => void
  setSnoozeId: (id: string | null) => void
  setNoteOpen: (open: boolean) => void
  onComplete: (input: {
    taskId: string
    outcome?: CallOutcome
    note?: string
    nextDueDate?: string
  }) => void
}

export function useTodayHotkeys({
  open,
  selectedId,
  popoverOpen,
  noteOpen,
  setSelectedId,
  setPopoverId,
  setSnoozeId,
  setNoteOpen,
  onComplete,
}: Args) {
  const enabled = !popoverOpen && !noteOpen
  const selected = open.find((t) => t.id === selectedId) ?? null

  useHotkeys(
    "j",
    (e) => {
      e.preventDefault()
      if (open.length === 0) return
      if (!selectedId) {
        setSelectedId(open[0]!.id)
        return
      }
      const i = open.findIndex((t) => t.id === selectedId)
      const next = open[Math.min(i + 1, open.length - 1)]
      if (next) setSelectedId(next.id)
    },
    { enabled },
    [open, selectedId, setSelectedId],
  )

  useHotkeys(
    "k",
    (e) => {
      e.preventDefault()
      if (open.length === 0) return
      if (!selectedId) {
        setSelectedId(open[0]!.id)
        return
      }
      const i = open.findIndex((t) => t.id === selectedId)
      const prev = open[Math.max(i - 1, 0)]
      if (prev) setSelectedId(prev.id)
    },
    { enabled },
    [open, selectedId, setSelectedId],
  )

  useHotkeys(
    "enter",
    (e) => {
      if (!selected) return
      e.preventDefault()
      setPopoverId(selected.id)
    },
    { enabled },
    [selected, setPopoverId],
  )

  useHotkeys(
    "n",
    (e) => {
      if (!selected) return
      e.preventDefault()
      setNoteOpen(true)
    },
    { enabled },
    [selected, setNoteOpen],
  )

  useHotkeys(
    "s",
    (e) => {
      if (!selected) return
      if (
        selected.type === StepType.EMAIL ||
        selected.type === StepType.EMAIL_REPLY
      ) {
        return
      }
      e.preventDefault()
      setSnoozeId(selected.id)
    },
    { enabled },
    [selected, setSnoozeId],
  )

  useHotkeys(
    "1,2,3,4,5,6,7,8",
    (e) => {
      if (!selected || selected.type !== StepType.CALL) return
      const outcome = OUTCOME_BY_KBD[e.key]
      if (!outcome) return
      e.preventDefault()
      onComplete({
        taskId: selected.id,
        outcome,
        nextDueDate:
          outcome === CallOutcome.CALLBACK_REQUESTED
            ? formatCalendarDate(toCalendarDate(addBusinessDays(appToday(), 2)))
            : undefined,
      })
    },
    { enabled },
    [selected, onComplete],
  )
}
