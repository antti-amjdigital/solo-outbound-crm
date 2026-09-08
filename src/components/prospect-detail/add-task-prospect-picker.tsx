"use client"

import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import {
  searchProspectsForTaskAction,
  type TaskProspectOption,
} from "@/actions/prospects"
import { cn } from "@/lib/utils"

const FIELD =
  "h-11 w-full rounded-[10px] border border-[#e2e8f0] bg-[#fbfcfe] px-3 text-[14px] text-[#0f172a] outline-none placeholder:text-[#94a3b8] focus-visible:border-[#4f46e5] focus-visible:ring-[3px] focus-visible:ring-[rgba(79,70,229,0.12)]"

export function prospectChipLabel(p: TaskProspectOption): string {
  const name = [p.firstName, p.lastName].filter(Boolean).join(" ")
  return p.company ? `${name} · ${p.company}` : name
}

export function AddTaskProspectPicker({
  selected,
  onSelect,
}: {
  selected: TaskProspectOption | null
  onSelect: (p: TaskProspectOption | null) => void
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<TaskProspectOption[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const t = setTimeout(async () => {
      setLoading(true)
      const res = await searchProspectsForTaskAction(query)
      setLoading(false)
      if (res.ok && "prospects" in res) setResults(res.prospects)
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  if (selected) {
    return (
      <div
        className={cn(FIELD, "flex items-center gap-2")}
        aria-label="Prospect"
      >
        <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#c7d2fe] bg-[#eef2ff] px-2.5 py-1 text-[13px] font-medium text-[#4338ca]">
          <span className="truncate">{prospectChipLabel(selected)}</span>
          <button
            type="button"
            aria-label="Clear prospect"
            className="shrink-0 rounded-full p-0.5 hover:bg-[#c7d2fe]/60"
            onClick={() => onSelect(null)}
          >
            <X className="size-3.5" strokeWidth={2} />
          </button>
        </span>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search by name, company, or phone…"
        className={FIELD}
        autoComplete="off"
        aria-label="Prospect"
      />
      {open && query.trim() && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-[10px] border border-[#e2e8f0] bg-white py-1 shadow-lg"
        >
          {loading && (
            <li className="px-3 py-2 text-[13px] text-[#94a3b8]">Searching…</li>
          )}
          {!loading && results.length === 0 && (
            <li className="px-3 py-2 text-[13px] text-[#94a3b8]">No matches</li>
          )}
          {results.map((p) => (
            <li key={p.id} role="option">
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-[13px] hover:bg-[#f8fafc]"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(p)
                  setQuery("")
                  setOpen(false)
                }}
              >
                <span className="font-medium text-[#0f172a]">
                  {prospectChipLabel(p)}
                </span>
                {p.phone && (
                  <span className="ml-2 text-[#94a3b8]">{p.phone}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
