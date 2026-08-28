import { ProspectStatus } from "@prisma/client"

export type ProspectSort =
  | "name"
  | "company"
  | "status"
  | "last"
  | "dials"
  | "created"

export type ProspectListFilters = {
  status: ProspectStatus | "all"
  sequenceId: string | "all" | "none"
  source: string | "all"
  openTask: "all" | "yes" | "no"
  q: string
  sort: ProspectSort
  dir: "asc" | "desc"
  page: number
  pageSize: number
}

export type HistoryFilter = "all" | "calls" | "emails" | "notes" | "changes"

const STATUSES = Object.values(ProspectStatus)
const SORTS: ProspectSort[] = ["name", "company", "status", "last", "dials", "created"]
const HISTORY: HistoryFilter[] = ["all", "calls", "emails", "notes", "changes"]

function one(
  raw: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = raw[key]
  return Array.isArray(v) ? v[0] : v
}

export function parseProspectFilters(
  raw: Record<string, string | string[] | undefined>,
): ProspectListFilters {
  const statusRaw = one(raw, "status") ?? "all"
  const sortRaw = one(raw, "sort") ?? "name"
  const dirRaw = one(raw, "dir") ?? "asc"
  const openRaw = one(raw, "openTask") ?? "all"
  const page = Math.max(1, Number(one(raw, "page") ?? "1") || 1)
  const pageSizeRaw = Number(one(raw, "pageSize") ?? "50") || 50
  const pageSize = [25, 50, 100].includes(pageSizeRaw) ? pageSizeRaw : 50

  return {
    status: STATUSES.includes(statusRaw as ProspectStatus)
      ? (statusRaw as ProspectStatus)
      : "all",
    sequenceId: one(raw, "sequence") ?? "all",
    source: one(raw, "source") ?? "all",
    openTask:
      openRaw === "yes" || openRaw === "no" ? openRaw : "all",
    q: one(raw, "q")?.trim() ?? "",
    sort: SORTS.includes(sortRaw as ProspectSort)
      ? (sortRaw as ProspectSort)
      : "name",
    dir: dirRaw === "desc" ? "desc" : "asc",
    page,
    pageSize,
  }
}

export function parseHistoryFilter(
  raw: Record<string, string | string[] | undefined>,
): HistoryFilter {
  const h = one(raw, "history") ?? "all"
  return HISTORY.includes(h as HistoryFilter) ? (h as HistoryFilter) : "all"
}

export function prospectsHref(
  base: Record<string, string | undefined>,
  patch: Record<string, string | undefined>,
): string {
  const merged = { ...base, ...patch }
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(merged)) {
    if (v && v.length > 0 && v !== "all" && !(k === "page" && v === "1")) {
      if (k === "pageSize" && v === "50") continue
      if (k === "sort" && v === "name") continue
      if (k === "dir" && v === "asc") continue
      sp.set(k, v)
    }
  }
  const qs = sp.toString()
  return qs ? `/prospects?${qs}` : "/prospects"
}

export function activeFilterCount(f: ProspectListFilters): number {
  let n = 0
  if (f.status !== "all") n += 1
  if (f.sequenceId !== "all") n += 1
  if (f.source !== "all") n += 1
  if (f.openTask !== "all") n += 1
  return n
}

export const STATUS_LABEL: Record<ProspectStatus, string> = {
  NEW: "NEW",
  ACTIVE: "ACTIVE",
  MEETING_BOOKED: "BOOKED",
  WON: "WON",
  DEAD: "DEAD",
  PAUSED: "PAUSED",
}
