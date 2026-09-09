"use client"

import { useMemo } from "react"
import type { Activity } from "@prisma/client"
import { ActivityRow } from "@/components/prospect-detail/history-activity-row"

const TZ = "Europe/Helsinki"

function dateKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ })
}

function dateLabel(d: Date, todayKey: string): string {
  const key = dateKey(d)
  if (key === todayKey) return "TODAY"
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (key === dateKey(yesterday)) return "YESTERDAY"
  return d
    .toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: TZ,
    })
    .toUpperCase()
}

function groupByDate(
  activities: Activity[],
  todayKey: string,
): { label: string; items: Activity[] }[] {
  const groups: { label: string; key: string; items: Activity[] }[] = []
  for (const a of activities) {
    const key = dateKey(a.occurredAt)
    const last = groups[groups.length - 1]
    if (last?.key === key) last.items.push(a)
    else
      groups.push({
        key,
        label: dateLabel(a.occurredAt, todayKey),
        items: [a],
      })
  }
  return groups
}

export function HistoryList({
  prospectId,
  history,
  source,
  taskLabels = {},
}: {
  prospectId: string
  history: Activity[]
  source: string | null
  taskLabels?: Record<string, string>
}) {
  const todayKey = useMemo(
    () => new Date().toLocaleDateString("en-CA", { timeZone: TZ }),
    [],
  )

  const groups = useMemo(
    () => groupByDate(history, todayKey),
    [history, todayKey],
  )

  return (
    <div>
      {history.length === 0 && (
        <div className="py-8 text-center text-[13px] text-[#94a3b8]">
          No activity yet.
        </div>
      )}

      {groups.map((group) => (
        <div key={group.label}>
          <div className="pb-1 pt-3 text-[11px] font-medium tracking-[0.8px] text-[#94a3b8] uppercase first:pt-0">
            {group.label}
          </div>
          {group.items.map((activity) => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              prospectId={prospectId}
              source={source}
              taskLabel={taskLabels[activity.id]}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
