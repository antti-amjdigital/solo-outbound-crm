"use client"

import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "crm:recent-searches"
const MAX_RECENTS = 5

function readRecents(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === "string")
      : []
  } catch {
    return []
  }
}

function writeRecents(items: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function useRecentSearches() {
  const [recents, setRecents] = useState<string[]>([])

  useEffect(() => {
    setRecents(readRecents())
  }, [])

  const addRecent = useCallback((query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return
    setRecents((prev) => {
      const lower = trimmed.toLowerCase()
      const next = [
        trimmed,
        ...prev.filter((r) => r.toLowerCase() !== lower),
      ].slice(0, MAX_RECENTS)
      writeRecents(next)
      return next
    })
  }, [])

  const removeRecent = useCallback((query: string) => {
    setRecents((prev) => {
      const next = prev.filter((r) => r !== query)
      writeRecents(next)
      return next
    })
  }, [])

  const clearRecents = useCallback(() => {
    writeRecents([])
    setRecents([])
  }, [])

  return { recents, addRecent, removeRecent, clearRecents }
}
