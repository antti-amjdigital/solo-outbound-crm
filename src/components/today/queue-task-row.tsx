"use client"

import { CallOutcome } from "@prisma/client"
import { QueueRow } from "@/components/today/queue-row"
import type { TodayQueueItem } from "@/lib/queries"

type Props = {
  item: TodayQueueItem
  done?: boolean
  selectedId: string | null
  exitingIds: ReadonlySet<string>
  popoverId: string | null
  snoozeId: string | null
  setSelectedId: (id: string | null) => void
  setPopoverId: (id: string | null) => void
  setSnoozeId: (id: string | null) => void
  complete: (input: {
    taskId: string
    outcome?: CallOutcome
    note?: string
    nextDueDate?: string
  }) => void
  snooze: (taskId: string, dueDate: string) => void
}

export function QueueTaskRow({
  item,
  done = false,
  selectedId,
  exitingIds,
  popoverId,
  snoozeId,
  setSelectedId,
  setPopoverId,
  setSnoozeId,
  complete,
  snooze,
}: Props) {
  return (
    <QueueRow
      item={item}
      done={done}
      selected={selectedId === item.id && !done}
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
      showSnooze
    />
  )
}
