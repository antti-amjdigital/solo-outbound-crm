import { StepType } from "@prisma/client"

export type DiffableStep = {
  key: string
  type: StepType
  label: string
  delayDays: number
  template: string | null
}

function normTemplate(t: string | null | undefined): string {
  return (t ?? "").trim()
}

function waitLabel(n: number): string {
  if (n === 0) return "0 days"
  if (n === 1) return "1 day"
  return `${n} days`
}

/**
 * Human-readable unsaved-change lines for the sticky save bar.
 * Keys identify the same logical step across baseline ↔ draft (db id or client key).
 */
export function diffSequenceSteps(
  baseline: DiffableStep[],
  draft: DiffableStep[],
): string[] {
  const changes: string[] = []
  const baseByKey = new Map(baseline.map((s) => [s.key, s]))
  const draftByKey = new Map(draft.map((s) => [s.key, s]))
  const baseOrder = baseline.map((s) => s.key)
  const draftOrder = draft.map((s) => s.key)

  for (const s of draft) {
    if (!baseByKey.has(s.key)) {
      changes.push(`added “${s.label || "Untitled"}”`)
    }
  }

  for (const s of baseline) {
    if (!draftByKey.has(s.key)) {
      changes.push(`removed “${s.label || "Untitled"}”`)
    }
  }

  for (const s of draft) {
    const prev = baseByKey.get(s.key)
    if (!prev) continue
    const name = s.label || prev.label || "Untitled"

    if (prev.label !== s.label) {
      changes.push(`renamed “${prev.label}” → “${s.label}”`)
    }
    if (prev.type !== s.type) {
      changes.push(`${name} type ${prev.type} → ${s.type}`)
    }
    if (prev.delayDays !== s.delayDays) {
      changes.push(
        `${name} wait ${waitLabel(prev.delayDays)} → ${waitLabel(s.delayDays)}`,
      )
    }
    if (normTemplate(prev.template) !== normTemplate(s.template)) {
      changes.push(
        normTemplate(s.template)
          ? `${name} template edited`
          : `${name} template cleared`,
      )
    }
  }

  const shared = draftOrder.filter((k) => baseByKey.has(k))
  const sharedBase = baseOrder.filter((k) => draftByKey.has(k))
  if (
    shared.length > 1 &&
    sharedBase.length === shared.length &&
    shared.some((k, i) => k !== sharedBase[i])
  ) {
    changes.push("steps reordered")
  }

  return changes
}
