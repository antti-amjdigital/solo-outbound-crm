"use client"

import type { GlobalSearchNoteHit } from "@/lib/global-search-query"
import { DocumentIcon, HighlightText } from "@/components/global-search/search-ui-bits"
import { cn } from "@/lib/utils"

type Props = {
  hit: GlobalSearchNoteHit
  query: string
  active: boolean
  optionId: string
  onSelect: () => void
}

export function GlobalSearchNoteRow({
  hit,
  query,
  active,
  optionId,
  onSelect,
}: Props) {
  return (
    <li role="presentation">
      <button
        type="button"
        id={optionId}
        role="option"
        aria-selected={active}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-[9px] text-left transition-colors",
          active ? "bg-[#f5f7ff]" : "hover:bg-[#f8fafc]",
        )}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onSelect}
      >
        <span className="inline-flex size-[30px] shrink-0 items-center justify-center rounded-full bg-[#f1f5f9] text-[#64748b]">
          <DocumentIcon />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] text-[#94a3b8]">
            {hit.prospectName}
            <span> · note</span>
          </span>
          <span className="block truncate text-[13px] text-[#64748b]">
            <HighlightText text={hit.snippet} query={query} />
          </span>
        </span>
      </button>
    </li>
  )
}
