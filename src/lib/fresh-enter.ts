import { useState } from "react"

/** Window after create/complete during which a row should play an enter animation. */
const FRESH_MS = 4_000

function toTime(at: Date | string | null | undefined): number | null {
  if (!at) return null
  const t = at instanceof Date ? at.getTime() : new Date(at).getTime()
  return Number.isFinite(t) ? t : null
}

/** True once on mount if `at` is within the fresh window (for enter animations). */
export function useFreshEnter(at: Date | string | null | undefined): boolean {
  return useState(() => {
    const t = toTime(at)
    return t != null && Date.now() - t < FRESH_MS
  })[0]
}
