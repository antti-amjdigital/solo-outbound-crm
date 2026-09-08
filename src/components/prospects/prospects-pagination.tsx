"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  prospectsHref,
  type ProspectListFilters,
} from "@/lib/prospect-filters"
import { cn } from "@/lib/utils"

function ChevronLeftIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

export function ProspectsPagination({
  filters,
  total,
}: {
  filters: ProspectListFilters
  total: number
}) {
  const router = useRouter()
  const pageFrom = total === 0 ? 0 : (filters.page - 1) * filters.pageSize + 1
  const pageTo = Math.min(filters.page * filters.pageSize, total)
  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize))
  const multiPage = pageCount > 1

  const base = {
    status: filters.status === "all" ? undefined : filters.status,
    sequence: filters.sequenceId === "all" ? undefined : filters.sequenceId,
    source: filters.source === "all" ? undefined : filters.source,
    openTask: filters.openTask === "all" ? undefined : filters.openTask,
    q: filters.q || undefined,
    sort: filters.sort,
    dir: filters.dir,
    pageSize: String(filters.pageSize),
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stats-grid px-5 py-3">
      <span className="text-[13px] text-stats-muted tabular-nums">
        {pageFrom}–{pageTo} of {total}
      </span>
      {multiPage && (
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[13px] text-stats-muted">
            Rows
            {[25, 50, 100].map((n) => (
              <Link
                key={n}
                href={prospectsHref(
                  { ...base, pageSize: undefined },
                  { pageSize: String(n), page: undefined },
                )}
                className={cn(
                  "rounded-md border px-1.5 py-0.5 tabular-nums focus-visible:ring-2 focus-visible:ring-stats-indigo-700/30 focus-visible:outline-none",
                  filters.pageSize === n
                    ? "border-stats-indigo-200 bg-[#eef2ff] text-stats-indigo-700"
                    : "border-stats-picker-line text-stats-secondary",
                )}
              >
                {n}
              </Link>
            ))}
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="icon-xs"
              variant="outline"
              disabled={filters.page <= 1}
              aria-label="Previous page"
              className="border-stats-picker-line"
              onClick={() =>
                router.push(
                  prospectsHref(base, { page: String(filters.page - 1) }),
                )
              }
            >
              <ChevronLeftIcon />
            </Button>
            <span className="px-1.5 text-[13px] text-stats-muted tabular-nums">
              {filters.page} / {pageCount}
            </span>
            <Button
              size="icon-xs"
              variant="outline"
              disabled={filters.page >= pageCount}
              aria-label="Next page"
              className="border-stats-picker-line"
              onClick={() =>
                router.push(
                  prospectsHref(base, { page: String(filters.page + 1) }),
                )
              }
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
