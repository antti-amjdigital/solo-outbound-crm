import { Prisma } from "@prisma/client"

import { normalizePhone } from "./normalize-phone"

export { normalizePhone }

export function foldForSearch(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
}

export function shouldSearch(q: string): boolean {
  const trimmed = q.trim()
  if (!trimmed) return false
  const digits = normalizePhone(trimmed)
  const compact = trimmed.replace(/\s+/g, "")
  if (/^[\d+]+$/.test(compact)) {
    return digits.length >= 3
  }
  return trimmed.length >= 2
}

export function textContains(hay: string, needle: string): boolean {
  return foldForSearch(hay).includes(foldForSearch(needle))
}

export function findFoldedMatch(
  text: string,
  query: string,
): { start: number; end: number } | null {
  const foldedQuery = foldForSearch(query.trim())
  if (!foldedQuery) return null

  let folded = ""
  const map: number[] = []
  for (let i = 0; i < text.length; i++) {
    const foldedCh = foldForSearch(text[i]!)
    for (let j = 0; j < foldedCh.length; j++) {
      map.push(i)
      folded += foldedCh[j]
    }
  }
  const idx = folded.indexOf(foldedQuery)
  if (idx === -1) return null
  return {
    start: map[idx]!,
    end: map[idx + foldedQuery.length - 1]! + 1,
  }
}

export type HighlightSegment = { text: string; bold: boolean }

export function highlightSegments(text: string, query: string): HighlightSegment[] {
  const match = findFoldedMatch(text, query)
  if (!match) return [{ text, bold: false }]
  return [
    { text: text.slice(0, match.start), bold: false },
    { text: text.slice(match.start, match.end), bold: true },
    { text: text.slice(match.end), bold: false },
  ].filter((s) => s.text.length > 0)
}

function textFieldOr(field: string, q: string, folded: string): Prisma.ProspectWhereInput[] {
  const branches: Prisma.ProspectWhereInput[] = [
    { [field]: { contains: q, mode: "insensitive" } } as Prisma.ProspectWhereInput,
  ]
  if (folded !== q.toLowerCase()) {
    branches.push({
      [field]: { contains: folded, mode: "insensitive" },
    } as Prisma.ProspectWhereInput)
  }
  return branches
}

export function buildProspectSearchWhere(q: string): Prisma.ProspectWhereInput {
  const trimmed = q.trim()
  const tokens = trimmed.split(/\s+/).filter(Boolean)
  if (tokens.length > 1) {
    return {
      AND: tokens.map((token) => buildProspectSearchWhere(token)),
    }
  }

  const folded = foldForSearch(trimmed)
  const textFields = ["firstName", "lastName", "company", "email", "phone"] as const

  const OR: Prisma.ProspectWhereInput[] = textFields.flatMap((f) =>
    textFieldOr(f, trimmed, folded),
  )

  OR.push(
    { notes: { some: { body: { contains: trimmed, mode: "insensitive" } } } },
    { activities: { some: { note: { contains: trimmed, mode: "insensitive" } } } },
  )
  if (folded !== trimmed.toLowerCase()) {
    OR.push(
      { notes: { some: { body: { contains: folded, mode: "insensitive" } } } },
      {
        activities: {
          some: { note: { contains: folded, mode: "insensitive" } },
        },
      },
    )
  }

  return { OR }
}

export function prospectDisplayName(p: {
  firstName: string
  lastName: string | null
}): string {
  return [p.firstName, p.lastName].filter(Boolean).join(" ")
}

export function prospectInitials(p: {
  firstName: string
  lastName: string | null
}): string {
  const first = p.firstName.trim()[0] ?? ""
  const last = p.lastName?.trim()[0] ?? ""
  return (first + last).toUpperCase() || "?"
}
