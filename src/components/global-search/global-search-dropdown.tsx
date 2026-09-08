"use client"

import type { GlobalSearchResult } from "@/lib/global-search-query"
import { GlobalSearchFooter } from "@/components/global-search/global-search-footer"
import { GlobalSearchNoteRow } from "@/components/global-search/global-search-note-row"
import { GlobalSearchProspectRow } from "@/components/global-search/global-search-prospect-row"
import { GlobalSearchRecentRow } from "@/components/global-search/global-search-recent-row"
import { GlobalSearchSection } from "@/components/global-search/global-search-section"

const EMPTY: GlobalSearchResult = {
  prospects: [],
  notes: [],
  totals: { prospects: 0, notes: 0 },
}

type NavItem =
  | { kind: "recent"; index: number; query: string }
  | { kind: "prospect"; index: number }
  | { kind: "note"; index: number }
  | { kind: "footer" }

export function buildNavItems(
  mode: "recents" | "results",
  recents: string[],
  results: GlobalSearchResult,
): NavItem[] {
  if (mode === "recents") {
    return recents.map((query, index) => ({ kind: "recent" as const, index, query }))
  }
  const items: NavItem[] = []
  results.prospects.forEach((_, index) => items.push({ kind: "prospect", index }))
  results.notes.forEach((_, index) => items.push({ kind: "note", index }))
  if (results.prospects.length > 0 || results.notes.length > 0) {
    items.push({ kind: "footer" })
  }
  return items
}

type DropdownProps = {
  open: boolean
  query: string
  loading: boolean
  mode: "recents" | "results" | "idle"
  recents: string[]
  results: GlobalSearchResult
  activeIndex: number
  listboxId: string
  onRecentSelect: (q: string) => void
  onRecentRemove: (q: string) => void
  onClearRecents: () => void
  onProspectSelect: (id: string) => void
  onNoteSelect: (prospectId: string) => void
  onAllResults: () => void
}

export function GlobalSearchDropdown({
  open,
  query,
  loading,
  mode,
  recents,
  results,
  activeIndex,
  listboxId,
  onRecentSelect,
  onRecentRemove,
  onClearRecents,
  onProspectSelect,
  onNoteSelect,
  onAllResults,
}: DropdownProps) {
  if (!open || mode === "idle") return null

  let optionCounter = 0

  return (
    <div
      className="absolute top-[calc(100%+8px)] z-50 w-full overflow-hidden rounded-[12px] border border-[#e2e8f0] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.16)]"
    >
      <ul
        id={listboxId}
        role="listbox"
        aria-label="Search results"
        aria-busy={mode === "results" && loading}
        className="max-h-[min(420px,70vh)] overflow-y-auto py-1"
      >
        {mode === "recents" && (
          <>
            <li role="presentation">
              <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
                <span className="text-[11px] font-bold tracking-[0.8px] text-[#94a3b8] uppercase">
                  Recent
                </span>
                <button
                  type="button"
                  className="text-[12px] font-semibold text-[#4f46e5] hover:underline"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={onClearRecents}
                >
                  Clear all
                </button>
              </div>
            </li>
            {recents.map((recent, i) => {
              const idx = optionCounter++
              return (
                <GlobalSearchRecentRow
                  key={recent}
                  query={recent}
                  active={activeIndex === idx}
                  optionId={`${listboxId}-option-${idx}`}
                  onSelect={() => onRecentSelect(recent)}
                  onRemove={() => onRecentRemove(recent)}
                />
              )
            })}
          </>
        )}

        {mode === "results" &&
          !loading &&
          results.prospects.length === 0 &&
          results.notes.length === 0 && (
          <li className="px-4 py-3 text-[14px] text-[#64748b]">
            No matches for &ldquo;{query}&rdquo;
          </li>
        )}

        {mode === "results" && results.prospects.length > 0 && (
          <>
            <GlobalSearchSection label="Prospects" />
            {results.prospects.map((hit) => {
              const idx = optionCounter++
              return (
                <GlobalSearchProspectRow
                  key={hit.id}
                  hit={hit}
                  query={query}
                  active={activeIndex === idx}
                  optionId={`${listboxId}-option-${idx}`}
                  onSelect={() => onProspectSelect(hit.id)}
                />
              )
            })}
          </>
        )}

        {mode === "results" && results.notes.length > 0 && (
          <>
            {results.prospects.length > 0 && (
              <li role="presentation" aria-hidden>
                <div className="mx-4 my-1 border-t border-[#eef1f6]" />
              </li>
            )}
            <GlobalSearchSection label="Notes" />
            {results.notes.map((hit) => {
              const idx = optionCounter++
              return (
                <GlobalSearchNoteRow
                  key={`${hit.source}-${hit.id}`}
                  hit={hit}
                  query={query}
                  active={activeIndex === idx}
                  optionId={`${listboxId}-option-${idx}`}
                  onSelect={() => onNoteSelect(hit.prospectId)}
                />
              )
            })}
          </>
        )}

        {mode === "results" &&
          (results.prospects.length > 0 || results.notes.length > 0) && (
            <GlobalSearchFooter
              query={query}
              active={activeIndex === optionCounter}
              optionId={`${listboxId}-option-${optionCounter}`}
              onSelect={onAllResults}
            />
          )}
      </ul>
    </div>
  )
}

export { EMPTY as EMPTY_SEARCH_RESULTS }
