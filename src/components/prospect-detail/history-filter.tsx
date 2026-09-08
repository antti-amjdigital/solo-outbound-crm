"use client"

import Link from "next/link"
import { ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { HistoryFilter } from "@/lib/prospect-filters"

const OPTIONS: { key: HistoryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "calls", label: "Calls" },
  { key: "emails", label: "Emails" },
  { key: "notes", label: "Notes" },
  { key: "changes", label: "Changes" },
]

export function HistoryFilter({
  prospectId,
  filter,
  counts,
}: {
  prospectId: string
  filter: HistoryFilter
  counts: Record<HistoryFilter, number>
}) {
  const current = OPTIONS.find((o) => o.key === filter) ?? OPTIONS[0]

  function href(key: HistoryFilter) {
    return key === "all"
      ? `/prospects/${prospectId}`
      : `/prospects/${prospectId}?history=${key}`
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[13px] text-[#64748b] transition-colors hover:text-[#0f172a]"
          />
        }
      >
        {current.label} · {counts[filter]}
        <ChevronDown className="size-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map((o) => (
          <DropdownMenuItem key={o.key} render={<Link href={href(o.key)} />}>
            {o.label}
            <span className="ml-auto text-xs text-[#94a3b8]">{counts[o.key]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
