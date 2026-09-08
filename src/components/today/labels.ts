import { CallOutcome, StepType } from "@prisma/client"

export const OUTCOME_OPTIONS: {
  value: CallOutcome
  label: string
  kbd: string
}[] = [
  { value: CallOutcome.NO_ANSWER, label: "No answer", kbd: "1" },
  { value: CallOutcome.VOICEMAIL, label: "Voicemail", kbd: "2" },
  { value: CallOutcome.GATEKEEPER, label: "Gatekeeper", kbd: "3" },
  { value: CallOutcome.WRONG_NUMBER, label: "Wrong number", kbd: "4" },
  { value: CallOutcome.CONNECTED, label: "Connected", kbd: "5" },
  { value: CallOutcome.CALLBACK_REQUESTED, label: "Callback", kbd: "6" },
  { value: CallOutcome.MEETING_BOOKED, label: "Booked", kbd: "7" },
  { value: CallOutcome.NOT_INTERESTED, label: "Not interested", kbd: "8" },
]

export const OUTCOME_GROUPS: {
  label: string
  values: CallOutcome[]
}[] = [
  {
    label: "Didn't reach",
    values: [
      CallOutcome.NO_ANSWER,
      CallOutcome.VOICEMAIL,
      CallOutcome.GATEKEEPER,
      CallOutcome.WRONG_NUMBER,
    ],
  },
  {
    label: "Reached",
    values: [
      CallOutcome.CONNECTED,
      CallOutcome.CALLBACK_REQUESTED,
      CallOutcome.MEETING_BOOKED,
      CallOutcome.NOT_INTERESTED,
    ],
  },
]

const OUTCOME_OPTION_BY_VALUE = Object.fromEntries(
  OUTCOME_OPTIONS.map((o) => [o.value, o]),
) as Record<CallOutcome, (typeof OUTCOME_OPTIONS)[number]>

export function outcomeOption(value: CallOutcome) {
  return OUTCOME_OPTION_BY_VALUE[value]
}

export const OUTCOME_LABEL: Record<CallOutcome, string> = {
  NO_ANSWER: "No answer",
  VOICEMAIL: "Voicemail",
  GATEKEEPER: "Gatekeeper",
  CONNECTED: "Connected",
  CALLBACK_REQUESTED: "Callback req.",
  MEETING_BOOKED: "Meeting booked",
  NOT_INTERESTED: "Not interested",
  WRONG_NUMBER: "Wrong number",
}

export function prospectDisplayName(p: {
  firstName: string
  lastName: string | null
}): string {
  return [p.firstName, p.lastName].filter(Boolean).join(" ")
}

export function contactForType(
  type: StepType,
  p: { phone: string | null; email: string | null; linkedin: string | null },
): { text: string; raw: string; href?: string; muted?: boolean } {
  if (type === StepType.CALL && p.phone) {
    return {
      text: formatPhoneDisplay(p.phone),
      raw: p.phone,
      href: `tel:${p.phone.replace(/\s+/g, "")}`,
    }
  }
  if ((type === StepType.EMAIL || type === StepType.EMAIL_REPLY) && p.email) {
    return { text: p.email, raw: p.email, muted: true }
  }
  if (type === StepType.LINKEDIN && p.linkedin) {
    const short = p.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com/i, "")
    return {
      text: short || p.linkedin,
      raw: p.linkedin,
      muted: true,
      href: p.linkedin,
    }
  }
  const fallback = p.phone ?? p.email ?? "—"
  return {
    text: p.phone ? formatPhoneDisplay(p.phone) : fallback,
    raw: p.phone ?? p.email ?? "",
    muted: !p.phone && !p.email,
  }
}

/** Display phone space-grouped (e.g. 050 408 1112). */
export function formatPhoneDisplay(phone: string): string {
  const raw = phone.replace(/\s+/g, "")
  if (!/^\+?\d+$/.test(raw)) return phone
  const plus = raw.startsWith("+") ? "+" : ""
  const digits = plus ? raw.slice(1) : raw
  if (digits.length < 6) return phone
  // 3 · 3 · rest (Finnish-style national numbers)
  return `${plus}${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`.trim()
}
