import Link from "next/link"
import {
  hrefWithParams,
  type QueueRangeFilter,
  type TodayQueueFilters,
} from "@/lib/queue-filters"
import type { TodayQueueCounts } from "@/lib/queries"
import { cn } from "@/lib/utils"

type Props = {
  filters: TodayQueueFilters
  counts: TodayQueueCounts
}

function baseParams(filters: TodayQueueFilters): Record<string, string | undefined> {
  return {
    range: filters.range === "today" ? undefined : filters.range,
    from: filters.from,
    to: filters.to,
  }
}

const RANGES: {
  key: QueueRangeFilter
  label: string
  countKey?: keyof Pick<TodayQueueCounts, "overdue" | "today" | "tomorrow" | "week">
  overdue?: boolean
}[] = [
  { key: "overdue", label: "Overdue", countKey: "overdue", overdue: true },
  { key: "today", label: "Today", countKey: "today" },
  { key: "tomorrow", label: "Tomorrow", countKey: "tomorrow" },
  { key: "week", label: "This week", countKey: "week" },
]

export function QueueFilters({ filters, counts }: Props) {
  const base = baseParams(filters)

  return (
    <div className="flex flex-wrap items-center gap-1">
      {RANGES.map((r) => {
        const selected = filters.range === r.key
        const count = r.countKey != null ? counts[r.countKey] : undefined
        const overdueHot = r.overdue && count != null && count > 0

        return (
          <Link
            key={r.key}
            href={hrefWithParams(base, {
              range: r.key === "today" ? undefined : r.key,
              from: undefined,
              to: undefined,
            })}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-[13px] transition-colors focus-visible:ring-2 focus-visible:ring-[#4f46e5]/30 focus-visible:outline-none",
              selected &&
                !overdueHot &&
                "border-[#c7d2fe] bg-[#eef2ff] font-semibold text-[#4f46e5]",
              selected &&
                overdueHot &&
                "border-[#fecaca] bg-[#fef2f2] font-semibold text-[#dc2626]",
              !selected && !overdueHot && "text-[#64748b] hover:text-[#1e293b]",
              !selected && overdueHot && "font-medium text-[#dc2626] hover:text-[#b91c1c]",
            )}
          >
            {r.label}
            {count != null && (
              <span
                className={cn(
                  "inline-flex min-w-[18px] items-center justify-center text-[12px] tabular-nums",
                  selected &&
                    !overdueHot &&
                    "size-[18px] rounded-full bg-[#4f46e5] text-[11px] font-semibold text-white",
                  selected &&
                    overdueHot &&
                    "size-[18px] rounded-full bg-[#dc2626] text-[11px] font-semibold text-white",
                  !selected && "text-[#94a3b8]",
                  !selected && overdueHot && "text-[#dc2626]",
                )}
              >
                {count}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
