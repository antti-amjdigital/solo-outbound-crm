"use client"

import Link from "next/link"
import { Checkbox } from "@/components/ui/checkbox"
import { ProspectRow, EmptyProspects } from "@/components/prospects/prospect-row"
import type { ProspectListRow } from "@/lib/prospect-queries"
import {
  prospectsHref,
  type ProspectListFilters,
  type ProspectSort,
} from "@/lib/prospect-filters"
import { cn } from "@/lib/utils"

type Props = {
  rows: ProspectListRow[]
  filters: ProspectListFilters
  selected: Set<string>
  onSelectedChange: (next: Set<string>) => void
  onEnroll: (id: string) => void
  totalUnfiltered: number
}

const COLS =
  "grid grid-cols-[40px_1.5fr_1.1fr_1fr_0.8fr_1.1fr_1fr_0.9fr] items-center gap-3.5 px-5"

function SortArrow({ dir }: { dir: "asc" | "desc" }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn(dir === "desc" && "rotate-180")}
    >
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  )
}

function SortHead({
  label,
  sortKey,
  filters,
  align,
}: {
  label: string
  sortKey: ProspectSort
  filters: ProspectListFilters
  align?: "right"
}) {
  const active = filters.sort === sortKey
  const nextDir = active && filters.dir === "asc" ? "desc" : "asc"
  const href = prospectsHref(
    {
      status: filters.status === "all" ? undefined : filters.status,
      sequence: filters.sequenceId === "all" ? undefined : filters.sequenceId,
      source: filters.source === "all" ? undefined : filters.source,
      openTask: filters.openTask === "all" ? undefined : filters.openTask,
      q: filters.q || undefined,
      pageSize: String(filters.pageSize),
    },
    { sort: sortKey, dir: nextDir, page: undefined },
  )
  return (
    <Link
      href={href}
      role="columnheader"
      aria-sort={
        active ? (filters.dir === "asc" ? "ascending" : "descending") : "none"
      }
      className={cn(
        "inline-flex items-center gap-1 text-[12px] font-semibold text-stats-secondary hover:text-[#475569] focus-visible:ring-2 focus-visible:ring-stats-indigo-700/30 focus-visible:outline-none",
        align === "right" && "w-full justify-end",
        active && "text-[#475569]",
      )}
    >
      {label}
      {active && <SortArrow dir={filters.dir} />}
    </Link>
  )
}

/** Activity header: sorts by last; cycles to dials after last desc (keeps both sorts). */
function ActivitySortHead({ filters }: { filters: ProspectListFilters }) {
  const active = filters.sort === "last" || filters.sort === "dials"
  let nextSort: ProspectSort = "last"
  let nextDir: "asc" | "desc" = "asc"
  if (filters.sort === "last" && filters.dir === "asc") {
    nextDir = "desc"
  } else if (filters.sort === "last" && filters.dir === "desc") {
    nextSort = "dials"
    nextDir = "desc"
  } else if (filters.sort === "dials" && filters.dir === "desc") {
    nextSort = "dials"
    nextDir = "asc"
  } else if (filters.sort === "dials" && filters.dir === "asc") {
    nextSort = "last"
    nextDir = "asc"
  }

  const href = prospectsHref(
    {
      status: filters.status === "all" ? undefined : filters.status,
      sequence: filters.sequenceId === "all" ? undefined : filters.sequenceId,
      source: filters.source === "all" ? undefined : filters.source,
      openTask: filters.openTask === "all" ? undefined : filters.openTask,
      q: filters.q || undefined,
      pageSize: String(filters.pageSize),
    },
    { sort: nextSort, dir: nextDir, page: undefined },
  )

  return (
    <Link
      href={href}
      role="columnheader"
      aria-sort={
        active ? (filters.dir === "asc" ? "ascending" : "descending") : "none"
      }
      className={cn(
        "inline-flex w-full items-center justify-end gap-1 text-[12px] font-semibold text-stats-secondary hover:text-[#475569] focus-visible:ring-2 focus-visible:ring-stats-indigo-700/30 focus-visible:outline-none",
        active && "text-[#475569]",
      )}
    >
      Activity
      {active && <SortArrow dir={filters.dir} />}
    </Link>
  )
}

export function ProspectsTable({
  rows,
  filters,
  selected,
  onSelectedChange,
  onEnroll,
  totalUnfiltered,
}: Props) {
  const allIds = rows.map((r) => r.id)
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selected.has(id))

  function toggleAll(checked: boolean) {
    onSelectedChange(checked ? new Set(allIds) : new Set())
  }

  function toggle(id: string, checked: boolean) {
    const next = new Set(selected)
    if (checked) next.add(id)
    else next.delete(id)
    onSelectedChange(next)
  }

  if (rows.length === 0) {
    return (
      <EmptyProspects kind={totalUnfiltered === 0 ? "none" : "filtered"} />
    )
  }

  return (
    <div role="table" aria-label="Prospects">
      <div
        role="row"
        className={cn(COLS, "h-11 border-b border-stats-grid")}
      >
        <div role="columnheader" className="flex items-center">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(v) => toggleAll(Boolean(v))}
            aria-label="Select all"
          />
        </div>
        <SortHead label="Name" sortKey="name" filters={filters} />
        <SortHead label="Company" sortKey="company" filters={filters} />
        <span
          role="columnheader"
          className="text-[12px] font-semibold text-stats-secondary"
        >
          Phone
        </span>
        <SortHead label="Status" sortKey="status" filters={filters} />
        <span
          role="columnheader"
          className="text-[12px] font-semibold text-stats-secondary"
        >
          Sequence
        </span>
        <span
          role="columnheader"
          className="text-[12px] font-semibold text-stats-secondary"
        >
          Next task
        </span>
        <ActivitySortHead filters={filters} />
      </div>

      <div role="rowgroup">
        {rows.map((row) => (
          <ProspectRow
            key={row.id}
            row={row}
            selected={selected.has(row.id)}
            onToggle={(checked) => toggle(row.id, checked)}
            onEnroll={() => onEnroll(row.id)}
          />
        ))}
      </div>
    </div>
  )
}
