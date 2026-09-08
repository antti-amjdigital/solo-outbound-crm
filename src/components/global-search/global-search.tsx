"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useHotkeys } from "react-hotkeys-hook"
import { globalSearchAction } from "@/actions/search"
import {
  buildNavItems,
  EMPTY_SEARCH_RESULTS,
  GlobalSearchDropdown,
} from "@/components/global-search/global-search-dropdown"
import { SearchIcon } from "@/components/global-search/search-ui-bits"
import { useRecentSearches } from "@/hooks/use-recent-searches"
import { shouldSearch } from "@/lib/search"
import { cn } from "@/lib/utils"

type Props = {
  defaultQuery?: string
  className?: string
}

export function GlobalSearch({ defaultQuery = "", className }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const requestId = useRef(0)

  const [query, setQuery] = useState(defaultQuery)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(EMPTY_SEARCH_RESULTS)
  const [activeIndex, setActiveIndex] = useState(0)

  const { recents, addRecent, removeRecent, clearRecents } = useRecentSearches()

  const trimmed = query.trim()
  const searching = shouldSearch(trimmed)
  const mode =
    open && !trimmed && recents.length > 0
      ? "recents"
      : open && trimmed && searching
        ? "results"
        : "idle"

  const listboxId = "global-search-listbox"

  useHotkeys(
    "/",
    (e) => {
      e.preventDefault()
      inputRef.current?.focus()
      inputRef.current?.select()
      setOpen(true)
    },
    { enableOnFormTags: false },
    [],
  )

  useEffect(() => {
    if (!open || !searching) {
      setResults(EMPTY_SEARCH_RESULTS)
      setLoading(false)
      return
    }

    const id = ++requestId.current
    setLoading(true)

    const timer = setTimeout(async () => {
      const res = await globalSearchAction(trimmed)
      if (id !== requestId.current) return
      setLoading(false)
      if (res.ok && "prospects" in res) {
        setResults({
          prospects: res.prospects,
          notes: res.notes,
          totals: res.totals,
        })
        setActiveIndex(0)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [trimmed, searching, open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  const navigateToProspect = useCallback(
    (id: string, recordQuery: string) => {
      addRecent(recordQuery)
      setOpen(false)
      router.push(`/prospects/${id}`)
    },
    [addRecent, router],
  )

  const navigateToNotes = useCallback(
    (prospectId: string, recordQuery: string) => {
      addRecent(recordQuery)
      setOpen(false)
      router.push(`/prospects/${prospectId}?history=notes`)
    },
    [addRecent, router],
  )

  const navigateToAllResults = useCallback(
    (q: string) => {
      addRecent(q)
      setOpen(false)
      router.push(`/prospects?q=${encodeURIComponent(q)}`)
    },
    [addRecent, router],
  )

  const activateItem = useCallback(
    (index: number) => {
      const items = buildNavItems(
        mode === "recents" ? "recents" : "results",
        recents,
        results,
      )
      const item = items[index]
      if (!item) {
        if (mode === "results" && trimmed) navigateToAllResults(trimmed)
        return
      }
      if (item.kind === "recent") {
        setQuery(item.query)
        setActiveIndex(0)
        return
      }
      if (item.kind === "prospect") {
        const hit = results.prospects[item.index]
        if (hit) navigateToProspect(hit.id, trimmed)
        return
      }
      if (item.kind === "note") {
        const hit = results.notes[item.index]
        if (hit) navigateToNotes(hit.prospectId, trimmed)
        return
      }
      if (item.kind === "footer") navigateToAllResults(trimmed)
    },
    [
      mode,
      recents,
      results,
      trimmed,
      navigateToAllResults,
      navigateToProspect,
      navigateToNotes,
    ],
  )

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const items = buildNavItems(
      mode === "recents" ? "recents" : "results",
      recents,
      results,
    )

    if (e.key === "Escape") {
      e.preventDefault()
      setOpen(false)
      inputRef.current?.blur()
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (items.length === 0) return
      setActiveIndex((i) => (i + 1) % items.length)
      return
    }

    if (e.key === "ArrowUp") {
      e.preventDefault()
      if (items.length === 0) return
      setActiveIndex((i) => (i - 1 + items.length) % items.length)
      return
    }

    if (e.key === "Enter") {
      e.preventDefault()
      if (mode === "idle") return
      activateItem(activeIndex)
    }
  }

  const showDropdown = mode !== "idle"

  return (
    <div ref={rootRef} className={cn("relative mx-auto w-full max-w-[520px]", className)}>
      <span className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-[#94a3b8]">
        <SearchIcon />
      </span>
      <input
        ref={inputRef}
        id="global-search"
        type="search"
        value={query}
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={showDropdown ? listboxId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={
          showDropdown && activeIndex >= 0
            ? `${listboxId}-option-${activeIndex}`
            : undefined
        }
        placeholder="Search prospects, companies, numbers… (/)"
        className={cn(
          "h-9 w-full rounded-lg border border-[#e2e8f0] bg-white pr-9 pl-9 text-[13px] text-[#0f172a] outline-none placeholder:text-[#94a3b8]",
          open &&
            "border-[#4f46e5] ring-[3px] ring-[rgba(79,70,229,0.12)]",
        )}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActiveIndex(0)
        }}
        onFocus={() => {
          if (!trimmed && recents.length === 0) return
          setOpen(true)
        }}
        onKeyDown={onKeyDown}
      />
      {trimmed && (
        <button
          type="button"
          aria-label="Clear search"
          className="absolute top-1/2 right-3 -translate-y-1/2 text-[#cbd5e1] hover:text-[#94a3b8]"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setQuery("")
            setActiveIndex(0)
            inputRef.current?.focus()
          }}
        >
          ×
        </button>
      )}

      <GlobalSearchDropdown
        open={showDropdown}
        query={trimmed}
        loading={loading}
        mode={mode}
        recents={recents}
        results={results}
        activeIndex={activeIndex}
        listboxId={listboxId}
        onRecentSelect={(q) => {
          setQuery(q)
          setActiveIndex(0)
        }}
        onRecentRemove={removeRecent}
        onClearRecents={clearRecents}
        onProspectSelect={(id) => navigateToProspect(id, trimmed)}
        onNoteSelect={(id) => navigateToNotes(id, trimmed)}
        onAllResults={() => navigateToAllResults(trimmed)}
      />
    </div>
  )
}
