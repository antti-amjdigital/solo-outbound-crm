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

function DownloadIcon() {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function FunnelIcon() {
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
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  )
}

const secondaryBtn =
  "h-[38px] gap-2 rounded-lg border-stats-picker-line bg-white px-4 text-[13px] font-semibold text-stats-secondary hover:bg-stats-canvas"

export function ProspectFilters({ filters, sequences, sources }: Props) {
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
    <div className="flex items-center gap-2.5 px-0">
      <AddProspectDialog
        triggerClassName="h-[38px] rounded-lg bg-stats-indigo-700 px-[18px] text-[14px] font-semibold text-white hover:bg-stats-indigo-900"
      />
      <Button
        variant="outline"
        nativeButton={false}
        render={<Link href="/import" />}
        className={secondaryBtn}
      >
        <DownloadIcon />
        Import CSV
      </Button>

      <div className="ml-auto" />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              className={cn(
                secondaryBtn,
                count > 0 &&
                  "border-stats-indigo-200 bg-[#eef2ff] text-stats-indigo-700",
              )}
            />
          }
        >
          <FunnelIcon />
          Filter{count > 0 ? ` (${count})` : ""}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
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
              className="mt-1 text-stats-indigo-700"
            >
              Clear {count} {count === 1 ? "filter" : "filters"}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
