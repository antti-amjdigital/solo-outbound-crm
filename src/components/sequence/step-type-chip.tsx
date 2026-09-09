import { StepType } from "@prisma/client"
import { TypeIcon } from "@/components/today/type-icon"
import { cn } from "@/lib/utils"

/** Indigo for outreach, teal for replies, gray for manual work. */
const CHIP: Record<StepType, string> = {
  CALL: "bg-seq-chip-indigo text-stats-indigo-700",
  EMAIL: "bg-seq-chip-indigo text-stats-indigo-700",
  LINKEDIN: "bg-seq-chip-indigo text-stats-indigo-700",
  EMAIL_REPLY: "bg-seq-teal-soft text-seq-teal",
  MANUAL: "bg-stats-track text-stats-secondary",
}

export function StepTypeChip({
  type,
  className,
}: {
  type: StepType
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex size-[30px] shrink-0 items-center justify-center rounded-lg",
        CHIP[type],
        className,
      )}
      aria-hidden
    >
      <TypeIcon type={type} variant="inline" className="text-current" />
    </span>
  )
}
