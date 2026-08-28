"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ProspectStatus } from "@prisma/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AddProspectDialog } from "@/components/prospects/add-prospect-dialog"
import {
  activeFilterCount,
  prospectsHref,
  STATUS_LABEL,
  type ProspectListFilters,
} from "@/lib/prospect-filters"
import { cn } from "@/lib/utils"

type Props = {
  filters: ProspectListFilters
  sequences: { id: string; name: string }[]
  sources: string[]
  matchCount: number
  totalUnfiltered: number
}

function baseParams(f: ProspectListFilters): Record<string, string | undefined> {
  return {
    status: f.status === "all" ? undefined : f.status,
    sequence: f.sequenceId === "all" ? undefined : f.sequenceId,
    source: f.source === "all" ? undefined : f.source,
    openTask: f.openTask === "all" ? undefined : f.openTask,
    q: f.q || undefined,
    sort: f.sort,
    dir: f.dir,
    pageSize: String(f.pageSize),
  }
}

export function ProspectFilters({
  filters,
  sequences,
  sources,
  matchCount,
  totalUnfiltered,
}: Props) {
  const router = useRouter()
  const base = baseParams(filters)
  const count = activeFilterCount(filters)

  function go(patch: Record<string, string | undefined>) {
    router.push(prospectsHref(base, { ...patch, page: undefined }))
  }

  const statusLabel =
    filters.status === "all" ? "Any" : STATUS_LABEL[filters.status]
  const seqLabel =
    filters.sequenceId === "all"
      ? "Any"
      : filters.sequenceId === "none"
        ? "Not enrolled"
        : (sequences.find((s) => s.id === filters.sequenceId)?.name ?? "…")
  const sourceLabel = filters.source === "all" ? "Any" : filters.source
  const openLabel =
    filters.openTask === "all"
      ? "Any"
      : filters.openTask === "yes"
        ? "Has open"
        : "None"

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
      <AddProspectDialog />
      <Button
        size="sm"
        variant="outline"
        nativeButton={false}
        render={<Link href="/import" />}
      >
        Import CSV
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "font-normal",
                count > 0 && "border-accent-line bg-accent-soft text-primary",
              )}
            />
          }
        >
          Filter{count > 0 ? ` (${count})` : ""}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-44">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <span className="text-dim">Status</span>
              <span className="ml-1.5">{statusLabel}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => go({ status: undefined })}>
                Any
              </DropdownMenuItem>
              {Object.values(ProspectStatus).map((s) => (
                <DropdownMenuItem key={s} onClick={() => go({ status: s })}>
                  {STATUS_LABEL[s]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <span className="text-dim">Sequence</span>
              <span className="ml-1.5">{seqLabel}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => go({ sequence: undefined })}>
                Any
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => go({ sequence: "none" })}>
                Not enrolled
              </DropdownMenuItem>
              {sequences.map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={() => go({ sequence: s.id })}
                >
                  {s.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <span className="text-dim">Source</span>
              <span className="ml-1.5">{sourceLabel}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => go({ source: undefined })}>
                Any
              </DropdownMenuItem>
              {sources.map((s) => (
                <DropdownMenuItem key={s} onClick={() => go({ source: s })}>
                  {s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <span className="text-dim">Open task</span>
              <span className="ml-1.5">{openLabel}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => go({ openTask: undefined })}>
                Any
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => go({ openTask: "yes" })}>
                Has open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => go({ openTask: "no" })}>
                None
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {count > 0 && (
            <DropdownMenuItem
              onClick={() => router.push("/prospects")}
              className="mt-1 text-primary"
            >
              Clear {count} {count === 1 ? "filter" : "filters"}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <span className="ml-auto text-[11px] text-dim">
        Showing {matchCount} of {totalUnfiltered} prospects
      </span>
    </div>
  )
}
