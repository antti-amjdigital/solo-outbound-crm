"use client"

import { useState } from "react"
import { BulkBar } from "@/components/prospects/bulk-bar"
import { ProspectFilters } from "@/components/prospects/prospect-filters"
import { ProspectsPagination } from "@/components/prospects/prospects-pagination"
import { ProspectsTable } from "@/components/prospects/prospects-table"
import type { ProspectListRow } from "@/lib/prospect-queries"
import type { ProspectListFilters } from "@/lib/prospect-filters"

type Props = {
  rows: ProspectListRow[]
  filters: ProspectListFilters
  sequences: { id: string; name: string }[]
  sources: string[]
  total: number
  totalUnfiltered: number
  openId?: string
}

export function ProspectsList({
  rows,
  filters,
  sequences,
  sources,
  total,
  totalUnfiltered,
  openId,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [enrollOpen, setEnrollOpen] = useState(false)
  const selectedIds = [...selected]
  const hasSelection = selectedIds.length > 0

  function clearSelection() {
    setSelected(new Set())
    setEnrollOpen(false)
  }

  function enrollOne(id: string) {
    setSelected(new Set([id]))
    setEnrollOpen(true)
  }

  return (
    <>
      {hasSelection ? (
        <BulkBar
          selectedIds={selectedIds}
          sequences={sequences}
          onClear={clearSelection}
          enrollOpen={enrollOpen}
          onEnrollOpenChange={setEnrollOpen}
        />
      ) : (
        <ProspectFilters
          filters={filters}
          sequences={sequences}
          sources={sources}
        />
      )}

      <div className="overflow-hidden rounded-xl border border-stats-card-line bg-white">
        <ProspectsTable
          rows={rows}
          filters={filters}
          selected={selected}
          onSelectedChange={setSelected}
          onEnroll={enrollOne}
          totalUnfiltered={totalUnfiltered}
          openId={openId}
        />
        {!(totalUnfiltered === 0 && rows.length === 0) && (
          <ProspectsPagination filters={filters} total={total} />
        )}
      </div>
    </>
  )
}
