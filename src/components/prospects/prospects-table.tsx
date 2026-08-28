"use client"

import Link from "next/link"
import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { TypeIcon } from "@/components/today/type-icon"
import { prospectDisplayName } from "@/components/today/labels"
import { StatusPill } from "@/components/prospects/status-pill"
import { BulkBar } from "@/components/prospects/bulk-bar"
import { ProspectsPagination } from "@/components/prospects/prospects-pagination"
import { formatRelativeDue, type ProspectListRow } from "@/lib/prospect-queries"
import {
  prospectsHref,
  type ProspectListFilters,
  type ProspectSort,
} from "@/lib/prospect-filters"
import { cn } from "@/lib/utils"

type Props = {
  rows: ProspectListRow[]
  filters: ProspectListFilters
  sequences: { id: string; name: string }[]
  total: number
}

function SortHead({
  label,
  sortKey,
  filters,
  className,
  align,
}: {
  label: string
  sortKey: ProspectSort
  filters: ProspectListFilters
  className?: string
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
    <TableHead className={className}>
      <Link
        href={href}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          align === "right" && "w-full justify-end",
          active && "font-semibold text-foreground",
        )}
      >
        {label}
        {active && (
          <span className="text-[10px]">{filters.dir === "asc" ? "↑" : "↓"}</span>
        )}
      </Link>
    </TableHead>
  )
}

export function ProspectsTable({ rows, filters, sequences, total }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const allIds = rows.map((r) => r.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id))

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(allIds) : new Set())
  }

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BulkBar
        selectedIds={[...selected]}
        sequences={sequences}
        onClear={() => setSelected(new Set())}
      />

      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(v) => toggleAll(Boolean(v))}
                  aria-label="Select all"
                />
              </TableHead>
              <SortHead label="Name" sortKey="name" filters={filters} />
              <SortHead label="Company" sortKey="company" filters={filters} className="w-[170px]" />
              <TableHead className="w-[150px]">Phone</TableHead>
              <SortHead label="Status" sortKey="status" filters={filters} className="w-[110px]" />
              <TableHead className="w-[150px]">Sequence</TableHead>
              <TableHead className="w-14">Step</TableHead>
              <TableHead className="w-[150px]">Next task</TableHead>
              <SortHead label="Dials" sortKey="dials" filters={filters} className="w-14" align="right" />
              <SortHead label="Last" sortKey="last" filters={filters} className="w-[78px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-16 text-center">
                  <p className="text-sm font-medium">No prospects match</p>
                  <p className="mt-1 text-xs text-dim">
                    Clear filters or import a CSV to load the pipeline.
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-3">
                    <Link
                      href="/prospects"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Clear filters
                    </Link>
                    <Link
                      href="/import"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Import CSV →
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => {
              const name = prospectDisplayName(row)
              const isSel = selected.has(row.id)
              return (
                <TableRow
                  key={row.id}
                  className={cn(isSel && "bg-accent-soft/50")}
                  data-state={isSel ? "selected" : undefined}
                >
                  <TableCell>
                    <Checkbox
                      checked={isSel}
                      onCheckedChange={(v) => toggle(row.id, Boolean(v))}
                      aria-label={`Select ${name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/prospects/${row.id}`}
                      className="font-semibold hover:text-primary hover:underline"
                    >
                      {name}
                    </Link>
                    {row.title && (
                      <div className="text-[11px] text-dim">{row.title}</div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[170px] truncate text-dim">
                    {row.company ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-[11px]">
                    {row.phone ? (
                      <a
                        href={`tel:${row.phone.replace(/\s+/g, "")}`}
                        className="text-primary hover:underline"
                      >
                        {row.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={row.status} />
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate text-xs">
                    {row.sequenceName ?? (
                      <span className="text-dim">Not enrolled</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-dim">
                    {row.stepOrder && row.stepTotal
                      ? `${row.stepOrder}/${row.stepTotal}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {row.nextTask ? (
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <TypeIcon type={row.nextTask.type} />
                        {row.nextTask.overdueDays > 0 ? (
                          <span className="font-semibold text-bad">
                            Overdue {row.nextTask.overdueDays}d
                          </span>
                        ) : (
                          formatRelativeDue(row.nextTask.dueDate)
                        )}
                      </span>
                    ) : row.status === "NEW" ? (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setSelected(new Set([row.id]))}
                      >
                        Enroll
                      </Button>
                    ) : (
                      <span className="text-xs text-dim">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {row.dials}
                  </TableCell>
                  <TableCell className="text-[11px] text-dim">
                    {row.lastActivityAt
                      ? row.lastActivityAt.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          timeZone: "Europe/Helsinki",
                        })
                      : "—"}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <ProspectsPagination filters={filters} total={total} />
    </div>
  )
}
