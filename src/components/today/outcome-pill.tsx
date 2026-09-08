import { CallOutcome } from "@prisma/client"
import { OUTCOME_LABEL } from "@/components/today/labels"
import { cn } from "@/lib/utils"

const OUTCOME_STYLES: Partial<
  Record<CallOutcome, { bg: string; border: string; text: string }>
> = {
  CONNECTED: { bg: "#ccfbf1", border: "#99f6e4", text: "#0f766e" },
  GATEKEEPER: { bg: "#fef3c7", border: "#fde68a", text: "#92400e" },
  MEETING_BOOKED: { bg: "#ccfbf1", border: "#99f6e4", text: "#0f766e" },
  CALLBACK_REQUESTED: { bg: "#eef2ff", border: "#c7d2fe", text: "#4f46e5" },
  NO_ANSWER: { bg: "#f1f5f9", border: "#e2e8f0", text: "#64748b" },
  VOICEMAIL: { bg: "#f1f5f9", border: "#e2e8f0", text: "#64748b" },
  NOT_INTERESTED: { bg: "#fef2f2", border: "#fecaca", text: "#dc2626" },
  WRONG_NUMBER: { bg: "#fef2f2", border: "#fecaca", text: "#dc2626" },
}

const DEFAULT_STYLE = { bg: "#f1f5f9", border: "#e2e8f0", text: "#64748b" }

export function OutcomePill({ outcome }: { outcome: CallOutcome | null }) {
  if (!outcome) {
    return <span className="text-[14px] text-[#cbd5e1]">—</span>
  }

  const style = OUTCOME_STYLES[outcome] ?? DEFAULT_STYLE

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[12px] font-medium",
      )}
      style={{
        backgroundColor: style.bg,
        borderColor: style.border,
        color: style.text,
      }}
    >
      <span className="truncate">{OUTCOME_LABEL[outcome]}</span>
    </span>
  )
}
