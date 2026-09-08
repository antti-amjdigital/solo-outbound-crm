"use client"

import { SearchIcon } from "@/components/global-search/search-ui-bits"
import { cn } from "@/lib/utils"

type Props = {
  query: string
  active: boolean
  optionId: string
  onSelect: () => void
}

export function GlobalSearchFooter({
  query,
  active,
  optionId,
  onSelect,
}: Props) {
  return (
    <li role="presentation" className="sticky bottom-0">
      <button
        type="button"
        id={optionId}
        role="option"
        aria-selected={active}
        className={cn(
          "flex w-full items-center gap-2 border-t border-[#eef1f6] bg-[#fbfcfe] px-4 py-2.5 text-left transition-colors",
          active ? "bg-[#f5f7ff]" : "hover:bg-[#f8fafc]",
        )}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onSelect}
      >
        <SearchIcon className="size-4 text-[#4f46e5]" />
        <span className="text-[13px] font-semibold text-[#4f46e5]">
          All results for &ldquo;{query}&rdquo;
        </span>
      </button>
    </li>
  )
}
