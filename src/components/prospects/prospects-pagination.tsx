"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  prospectsHref,
  type ProspectListFilters,
} from "@/lib/prospect-filters"
import { cn } from "@/lib/utils"

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
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2.5 text-xs text-dim">
      <span>
        Showing{" "}
        <b className="text-foreground">
          {pageFrom}–{pageTo}
        </b>{" "}
        of <b className="text-foreground">{total}</b> matching prospects
      </span>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          Rows
          {[25, 50, 100].map((n) => (
            <Link
              key={n}
              href={prospectsHref(
                { ...base, pageSize: undefined },
                { pageSize: String(n), page: undefined },
              )}
              className={cn(
                "rounded border px-1.5 py-0.5",
                filters.pageSize === n
                  ? "border-accent-line bg-accent-soft text-primary"
                  : "border-border",
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
            onClick={() =>
              router.push(prospectsHref(base, { page: String(filters.page - 1) }))
            }
          >
            ‹
          </Button>
          <span className="px-1.5">
            {filters.page} / {pageCount}
          </span>
          <Button
            size="icon-xs"
            variant="outline"
            disabled={filters.page >= pageCount}
            onClick={() =>
              router.push(prospectsHref(base, { page: String(filters.page + 1) }))
            }
          >
            ›
          </Button>
        </div>
      </div>
    </div>
  )
}
