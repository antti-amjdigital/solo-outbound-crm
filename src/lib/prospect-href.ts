import type { HistoryFilter } from "@/lib/prospect-filters"
import { parseHistoryFilter } from "@/lib/prospect-filters"

function one(
  raw: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = raw[key]
  return Array.isArray(v) ? v[0] : v
}

function toSearchParams(
  from?: URLSearchParams | Record<string, string | string[] | undefined> | string,
): URLSearchParams {
  if (!from) return new URLSearchParams()
  if (typeof from === "string") {
    return new URLSearchParams(from.startsWith("?") ? from.slice(1) : from)
  }
  if (from instanceof URLSearchParams) {
    return new URLSearchParams(from.toString())
  }
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(from)) {
    const value = Array.isArray(v) ? v[0] : v
    if (value) sp.set(k, value)
  }
  return sp
}

export function parseProspectPanelId(
  raw: Record<string, string | string[] | undefined>,
): string | undefined {
  const id = one(raw, "p")?.trim()
  return id || undefined
}

type PanelHrefOpts = {
  /** Current page path — panel opens over this page. Defaults to `/prospects`. */
  pathname?: string
  search?: URLSearchParams | Record<string, string | string[] | undefined> | string
  history?: HistoryFilter
}

/** `pathname?p=<id>&…` — keeps the current page as the background. */
export function prospectPanelHref(id: string, opts?: PanelHrefOpts): string {
  const pathname = opts?.pathname || "/prospects"
  const sp = toSearchParams(opts?.search)
  sp.set("p", id)
  if (opts?.history && opts.history !== "all") {
    sp.set("history", opts.history)
  } else {
    sp.delete("history")
  }
  return `${pathname}?${sp.toString()}`
}

/** Same page with panel closed (drops `p` and `history`). */
export function closeProspectPanelHref(opts: {
  pathname: string
  search?: URLSearchParams | Record<string, string | string[] | undefined> | string
}): string {
  const sp = toSearchParams(opts.search)
  sp.delete("p")
  sp.delete("history")
  const qs = sp.toString()
  return qs ? `${opts.pathname}?${qs}` : opts.pathname
}

/** Redirect target for legacy `/prospects/[id]` URLs. */
export function prospectPanelRedirectHref(
  id: string,
  raw: Record<string, string | string[] | undefined>,
): string {
  const history = parseHistoryFilter(raw)
  return prospectPanelHref(id, {
    pathname: "/prospects",
    history: history === "all" ? undefined : history,
  })
}
