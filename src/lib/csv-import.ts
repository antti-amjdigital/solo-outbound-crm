/** Shared CSV import types and pure helpers (client + server). */

import { normalizePhone } from "./normalize-phone"

export { normalizePhone }

export type ProspectField =
  | "firstName"
  | "lastName"
  | "company"
  | "title"
  | "email"
  | "phone"
  | "linkedin"
  | "source"
  | "timezone"
  | "skip"

export type FieldMapping = Record<string, ProspectField>

export type ImportRow = {
  firstName: string
  lastName?: string
  company?: string
  title?: string
  email?: string
  phone?: string
  linkedin?: string
  source?: string
  timezone?: string
}

export type ClassifiedRow =
  | { status: "new"; row: ImportRow; index: number }
  | { status: "duplicate"; row: ImportRow; index: number; reason: string }
  | { status: "missing_phone"; row: ImportRow; index: number }
  | { status: "invalid"; row: ImportRow; index: number; reason: string }

export type ImportPreview = {
  newCount: number
  duplicateCount: number
  missingPhoneCount: number
  invalidCount: number
  rows: ClassifiedRow[]
  toCreate: ImportRow[]
}

export const FIELD_LABELS: Record<ProspectField, string> = {
  firstName: "First name",
  lastName: "Last name",
  company: "Company",
  title: "Title",
  email: "Email",
  phone: "Phone",
  linkedin: "LinkedIn",
  source: "Source",
  timezone: "Timezone",
  skip: "— skip —",
}

const HEADER_HINTS: { field: ProspectField; patterns: RegExp[] }[] = [
  { field: "firstName", patterns: [/^first\s*name$/i, /^firstname$/i, /^etunimi$/i, /^first$/i] },
  { field: "lastName", patterns: [/^last\s*name$/i, /^lastname$/i, /^sukunimi$/i, /^last$/i] },
  { field: "company", patterns: [/^company$/i, /^yritys$/i, /^organisation$/i, /^organization$/i] },
  { field: "title", patterns: [/^title$/i, /^job\s*title$/i, /^titteli$/i, /^role$/i] },
  { field: "email", patterns: [/^e-?mail$/i, /^sähköposti$/i, /^sahkoposti$/i] },
  { field: "phone", patterns: [/^phone$/i, /^mobile$/i, /^tel$/i, /^puhelin$/i, /^number$/i] },
  { field: "linkedin", patterns: [/^linkedin$/i, /^li\s*url$/i] },
  { field: "source", patterns: [/^source$/i, /^lähde$/i, /^lahde$/i] },
  { field: "timezone", patterns: [/^time\s*zone$/i, /^timezone$/i, /^tz$/i] },
]

export function guessMapping(headers: string[]): FieldMapping {
  const used = new Set<ProspectField>()
  const mapping: FieldMapping = {}
  for (const h of headers) {
    let matched: ProspectField = "skip"
    for (const hint of HEADER_HINTS) {
      if (used.has(hint.field)) continue
      if (hint.patterns.some((p) => p.test(h.trim()))) {
        matched = hint.field
        used.add(hint.field)
        break
      }
    }
    // Combined "name" column → firstName
    if (matched === "skip" && /^name$/i.test(h.trim()) && !used.has("firstName")) {
      matched = "firstName"
      used.add("firstName")
    }
    mapping[h] = matched
  }
  return mapping
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function applyMapping(
  headers: string[],
  dataRows: string[][],
  mapping: FieldMapping,
): ImportRow[] {
  return dataRows.map((cells) => {
    const row: ImportRow = { firstName: "" }
    headers.forEach((h, i) => {
      const field = mapping[h] ?? "skip"
      if (field === "skip") return
      const val = (cells[i] ?? "").trim()
      if (!val) return
      if (field === "firstName") {
        // If mapping a full name column, split on first space
        if (!row.firstName && val.includes(" ") && !mappingHas(mapping, "lastName")) {
          const [first, ...rest] = val.split(/\s+/)
          row.firstName = first
          row.lastName = rest.join(" ")
        } else {
          row.firstName = val
        }
      } else {
        row[field] = val
      }
    })
    return row
  })
}

function mappingHas(mapping: FieldMapping, field: ProspectField): boolean {
  return Object.values(mapping).includes(field)
}

export function classifyRows(
  rows: ImportRow[],
  existingKeys: Set<string>,
): ImportPreview {
  const fileSeen = new Set<string>()
  const classified: ClassifiedRow[] = []
  const toCreate: ImportRow[] = []

  rows.forEach((row, index) => {
    if (!row.firstName.trim()) {
      classified.push({ status: "invalid", row, index, reason: "Missing first name" })
      return
    }
    const email = row.email ? normalizeEmail(row.email) : ""
    const phone = row.phone ? normalizePhone(row.phone) : ""
    const keys = [email && `e:${email}`, phone && `p:${phone}`].filter(Boolean) as string[]
    const dupKey = keys.find((k) => fileSeen.has(k) || existingKeys.has(k))
    if (dupKey) {
      classified.push({
        status: "duplicate",
        row,
        index,
        reason: existingKeys.has(dupKey) ? "Already in database" : "Duplicate in file",
      })
      return
    }
    for (const k of keys) fileSeen.add(k)
    const prepared: ImportRow = {
      ...row,
      firstName: row.firstName.trim(),
      email: email || undefined,
      phone: row.phone?.trim() || undefined,
      source: row.source?.trim() || "csv-import",
    }
    classified.push(
      phone
        ? { status: "new", row: prepared, index }
        : { status: "missing_phone", row: prepared, index },
    )
    toCreate.push(prepared)
  })

  return {
    newCount: classified.filter((r) => r.status === "new").length,
    duplicateCount: classified.filter((r) => r.status === "duplicate").length,
    missingPhoneCount: classified.filter((r) => r.status === "missing_phone").length,
    invalidCount: classified.filter((r) => r.status === "invalid").length,
    rows: classified,
    toCreate,
  }
}
