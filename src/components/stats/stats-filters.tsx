"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  PERIOD_LABEL,
  statsHref,
  type StatsFilters,
  type StatsPeriod,
} from "@/lib/stats-filters"
import { ChevronDown } from "lucide-react"

const PERIODS: StatsPeriod[] = ["7d", "30d", "90d", "quarter"]

type Props = {
  filters: StatsFilters
  rangeLabel: string
}

/** Period dropdown + date range for the Stats header. */
export function StatsPeriodFilter({ filters, rangeLabel }: Props) {
  return (
    <div className="flex shrink-0 items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="h-[34px] gap-1.5 rounded-lg border-stats-picker-line bg-white px-3 font-normal text-stats-ink shadow-none hover:bg-stats-canvas"
            />
          }
        >
          <span className="text-stats-muted">Period</span>{" "}
          {PERIOD_LABEL[filters.period]}
          <ChevronDown className="size-3.5 text-stats-muted" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {PERIODS.map((p) => (
            <DropdownMenuItem
              key={p}
              render={<Link href={statsHref(filters, { period: p })} />}
            >
              {PERIOD_LABEL[p]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="whitespace-nowrap text-[13px] text-stats-muted tabular-nums">
        {rangeLabel}
      </span>
    </div>
  )
}
