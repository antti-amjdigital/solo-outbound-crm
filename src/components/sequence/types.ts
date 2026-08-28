import { StepType } from "@prisma/client"
import type { StepStats } from "@/lib/sequence-queries"

export type EditorStep = {
  key: string
  type: StepType
  label: string
  delayDays: number
  template: string | null
  /** Per-step stats from the last saved version; null for newly added rows. */
  stats: StepStats | null
}

export const STEP_TYPE_OPTIONS: { value: StepType; label: string }[] = [
  { value: StepType.EMAIL, label: "Email" },
  { value: StepType.CALL, label: "Call" },
  { value: StepType.EMAIL_REPLY, label: "Reply" },
  { value: StepType.LINKEDIN, label: "LinkedIn" },
  { value: StepType.MANUAL, label: "Manual" },
]

export const MERGE_TAGS = [
  "{{first_name}}",
  "{{last_name}}",
  "{{company}}",
  "{{title}}",
] as const

export function waitLabel(days: number): string {
  if (days === 0) return "Start"
  if (days === 1) return "1 business day"
  return `${days} business days`
}

export function newStepKey(): string {
  return `new-${crypto.randomUUID()}`
}
