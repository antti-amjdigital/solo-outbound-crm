"use client"

import { cn } from "@/lib/utils"
import { ClockIcon } from "@/components/global-search/search-ui-bits"

type Props = {
  query: string
  active: boolean
  optionId: string
  onSelect: () => void
  onRemove: () => void
}

export function GlobalSearchRecentRow({
  query,
  active,
  optionId,
  onSelect,
  onRemove,
}: Props) {
  const digitsOnly = /^[\d+\s-]+$/.test(query)

  return (
    <li role="presentation">
      <div
        id={optionId}
        role="option"
        aria-selected={active}
        className={cn(
          "group flex items-center gap-2.5 px-4 py-[9px] transition-colors",
          active ? "bg-[#f5f7ff]" : "hover:bg-[#f8fafc]",
        )}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onSelect}
        >
          <ClockIcon className="shrink-0 text-[#94a3b8]" />
          <span
            className={cn(
              "truncate text-[14px] text-[#1e293b]",
              digitsOnly && "tabular-nums",
            )}
          >
            {query}
          </span>
        </button>
        <button
          type="button"
          aria-label={`Remove ${query}`}
          className="shrink-0 px-1 text-[13px] text-[#cbd5e1] opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:text-[#94a3b8] focus:opacity-100"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          ×
        </button>
      </div>
    </li>
  )
}
