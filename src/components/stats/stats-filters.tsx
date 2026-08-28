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
import { cn } from "@/lib/utils"

const PERIODS: StatsPeriod[] = ["7d", "30d", "90d", "quarter"]

type Props = {
  filters: StatsFilters
  sequences: { id: string; name: string }[]
  rangeLabel: string
}

export function StatsFiltersBar({ filters, sequences, rangeLabel }: Props) {
  const seqLabel =
    filters.sequenceId === "all"
      ? "All"
      : (sequences.find((s) => s.id === filters.sequenceId)?.name ?? "All")

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-4 py-2.5">
      <FilterDrop label="Period" value={PERIOD_LABEL[filters.period]} active={filters.period !== "30d"}>
        {PERIODS.map((p) => (
          <DropdownMenuItem key={p} render={<Link href={statsHref(filters, { period: p })} />}>
            {PERIOD_LABEL[p]}
          </DropdownMenuItem>
        ))}
      </FilterDrop>

      <FilterDrop label="Sequence" value={seqLabel} active={filters.sequenceId !== "all"}>
        <DropdownMenuItem render={<Link href={statsHref(filters, { sequenceId: "all" })} />}>
          All
        </DropdownMenuItem>
        {sequences.map((s) => (
          <DropdownMenuItem
            key={s.id}
            render={<Link href={statsHref(filters, { sequenceId: s.id })} />}
          >
            {s.name}
          </DropdownMenuItem>
        ))}
      </FilterDrop>

      <span className="ml-auto text-xs text-dim">{rangeLabel}</span>
    </div>
  )
}

function FilterDrop({
  label,
  value,
  active,
  children,
}: {
  label: string
  value: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-1.5 font-normal",
              active && "border-accent-line bg-accent-soft text-primary",
            )}
          />
        }
      >
        <span className="text-dim">{label}</span> {value}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">{children}</DropdownMenuContent>
    </DropdownMenu>
  )
}
