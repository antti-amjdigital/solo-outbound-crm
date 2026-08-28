import Link from "next/link"
import { hrefWithParams, type TodayQueueFilters } from "@/lib/queue-filters"
import type { TodayQueueCounts } from "@/lib/queries"
import { cn } from "@/lib/utils"

type Props = {
  filters: TodayQueueFilters
  counts: TodayQueueCounts
}

function baseParams(filters: TodayQueueFilters): Record<string, string | undefined> {
  return {
    type: filters.type === "all" ? undefined : filters.type,
    range: filters.range === "today" ? undefined : filters.range,
    q: filters.q || undefined,
    from: filters.from,
    to: filters.to,
  }
}

export function QueueFilters({ filters, counts }: Props) {
  const base = baseParams(filters)

  const types = [
    { key: "all" as const, label: "All", count: counts.all },
    { key: "call" as const, label: "Call", count: counts.call },
    { key: "email" as const, label: "Email", count: counts.email },
    { key: "reply" as const, label: "Reply", count: counts.reply },
    { key: "linkedin" as const, label: "LinkedIn", count: counts.linkedin },
    { key: "manual" as const, label: "Manual", count: counts.manual },
  ]

  const ranges = [
    { key: "overdue" as const, label: "Overdue", count: counts.overdue, od: true },
    { key: "today" as const, label: "Today", count: counts.today },
    { key: "tomorrow" as const, label: "Tomorrow" },
    { key: "week" as const, label: "This week" },
    { key: "next" as const, label: "Next week" },
  ]

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2">
      {types.map((t, i) => (
        <span key={t.key} className="contents">
          {i === 1 && <span className="mx-1 h-4 w-px bg-border" />}
          <Link
            href={hrefWithParams(base, {
              type: t.key === "all" ? undefined : t.key,
            })}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border border-transparent bg-surface px-2.5 py-1 text-xs text-dim",
              filters.type === t.key &&
                "border-accent-line bg-accent-soft font-semibold text-primary",
            )}
          >
            {t.label}
            <span
              className={cn(
                "rounded-lg bg-black/5 px-1 text-[10px]",
                filters.type === t.key && "bg-primary/15",
              )}
            >
              {t.count}
            </span>
          </Link>
        </span>
      ))}

      <div className="ml-auto flex flex-wrap gap-0.5">
        {ranges.map((r) => (
          <Link
            key={r.key}
            href={hrefWithParams(base, {
              range: r.key === "today" ? undefined : r.key,
              from: undefined,
              to: undefined,
            })}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs text-dim",
              r.od && "text-bad",
              filters.range === r.key && "bg-accent-soft font-semibold text-primary",
              filters.range === r.key && r.od && "text-bad",
            )}
          >
            {r.label}
            {r.count != null && (
              <span className="ml-1 text-[10px] opacity-85">{r.count}</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
