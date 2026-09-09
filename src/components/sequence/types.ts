import { StepType } from "@prisma/client"

export type EditorStep = {
  key: string
  type: StepType
  label: string
  delayDays: number
  template: string | null
}

export const STEP_TYPE_OPTIONS: { value: StepType; label: string }[] = [
  { value: StepType.EMAIL, label: "Email" },
  { value: StepType.CALL, label: "Call" },
  { value: StepType.EMAIL_REPLY, label: "Reply" },
  { value: StepType.LINKEDIN, label: "LinkedIn" },
  { value: StepType.MANUAL, label: "Manual" },
]

export function stepTypeLabel(type: StepType): string {
  return STEP_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type
}

export const MERGE_TAGS = [
  "{{first_name}}",
  "{{last_name}}",
  "{{company}}",
  "{{title}}",
] as const

/** Read-mode wait column: "starts immediately" / "same day" / "+N business days". */
export function waitText(days: number, index: number): string {
  if (days === 0) return index === 0 ? "starts immediately" : "same day"
  if (days === 1) return "+1 business day"
  return `+${days} business days`
}

/** Unit shown inside the edit-mode stepper, after the number. */
export function waitUnit(days: number): string {
  return days === 1 ? "business day wait" : "business days wait"
}

/** What a step's attached text is called — scripts for calls, templates for email. */
export function contentNoun(type: StepType): "script" | "template" | "content" {
  if (type === StepType.CALL) return "script"
  if (type === StepType.EMAIL || type === StepType.EMAIL_REPLY) return "template"
  return "content"
}

export function hasContent(template: string | null): boolean {
  return Boolean(template?.trim())
}

export function newStepKey(): string {
  return `new-${crypto.randomUUID()}`
}
