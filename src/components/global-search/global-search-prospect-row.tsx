"use client"

import type { GlobalSearchProspectHit } from "@/lib/global-search-query"
import { prospectDisplayName, prospectInitials } from "@/lib/search"
import { formatPhoneDisplay } from "@/components/today/labels"
import { HighlightText } from "@/components/global-search/search-ui-bits"
import { cn } from "@/lib/utils"

type Props = {
  hit: GlobalSearchProspectHit
  query: string
  active: boolean
  optionId: string
  onSelect: () => void
}

export function GlobalSearchProspectRow({
  hit,
  query,
  active,
  optionId,
  onSelect,
}: Props) {
  const name = prospectDisplayName(hit)
  const subParts = [hit.company, hit.phone ? formatPhoneDisplay(hit.phone) : null]
    .filter(Boolean)
    .join(" · ")

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
        <span className="inline-flex size-[30px] shrink-0 items-center justify-center rounded-full bg-[#eef2ff] text-[12px] font-bold text-[#4f46e5]">
          {prospectInitials(hit)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] text-[#1e293b]">
            <HighlightText text={name} query={query} />
            {hit.title && (
              <>
                <span className="text-[#94a3b8]"> · </span>
                <HighlightText
                  text={hit.title}
                  query={query}
                  boldClassName="font-semibold text-[#0f172a]"
                />
              </>
            )}
          </span>
          {subParts && (
            <span className="block truncate text-[12.5px] text-[#64748b]">
              {hit.company && (
                <HighlightText text={hit.company} query={query} />
              )}
              {hit.company && hit.phone && (
                <span className="text-[#64748b]"> · </span>
              )}
              {hit.phone && (
                <span className="tabular-nums">
                  <HighlightText
                    text={formatPhoneDisplay(hit.phone)}
                    query={query}
                  />
                </span>
              )}
              {!hit.company && hit.email && (
                <HighlightText text={hit.email} query={query} />
              )}
            </span>
          )}
        </span>
        {hit.taskTag && (
          <span
            className={cn(
              "shrink-0 text-[12px]",
              hit.taskTagOverdue ? "text-[#dc2626]" : "text-[#94a3b8]",
            )}
          >
            {hit.taskTag}
          </span>
        )}
      </button>
    </li>
  )
}
