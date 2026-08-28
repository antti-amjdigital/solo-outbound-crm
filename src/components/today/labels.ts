import { CallOutcome, StepType } from "@prisma/client"

export const OUTCOME_OPTIONS: {
  value: CallOutcome
  label: string
  kbd: string
}[] = [
  { value: CallOutcome.NO_ANSWER, label: "No answer", kbd: "1" },
  { value: CallOutcome.VOICEMAIL, label: "Voicemail", kbd: "2" },
  { value: CallOutcome.GATEKEEPER, label: "Gatekeeper", kbd: "3" },
  { value: CallOutcome.CONNECTED, label: "Connected", kbd: "4" },
  { value: CallOutcome.CALLBACK_REQUESTED, label: "Callback", kbd: "5" },
  { value: CallOutcome.MEETING_BOOKED, label: "Booked", kbd: "6" },
  { value: CallOutcome.NOT_INTERESTED, label: "Not interested", kbd: "7" },
  { value: CallOutcome.WRONG_NUMBER, label: "Wrong number", kbd: "8" },
]

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
): { text: string; href?: string; muted?: boolean } {
  if (type === StepType.CALL && p.phone) {
    return { text: p.phone, href: `tel:${p.phone.replace(/\s+/g, "")}` }
  }
  if ((type === StepType.EMAIL || type === StepType.EMAIL_REPLY) && p.email) {
    return { text: p.email, muted: true }
  }
  if (type === StepType.LINKEDIN && p.linkedin) {
    const short = p.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com/i, "")
    return { text: short || p.linkedin, muted: true, href: p.linkedin }
  }
  return { text: p.phone ?? p.email ?? "—", muted: !p.phone && !p.email }
}
