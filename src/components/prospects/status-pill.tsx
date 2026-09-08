import { ProspectStatus } from "@prisma/client"
import { STATUS_LABEL } from "@/lib/prospect-filters"
import { cn } from "@/lib/utils"

const STYLES: Record<ProspectStatus, string> = {
  NEW: "border-[#c7d2fe] bg-[#eef2ff] text-stats-indigo-700",
  ACTIVE: "border-stats-indigo-200 bg-[#eef2ff] text-stats-indigo-700",
  MEETING_BOOKED: "border-[#bbf7d0] bg-good-soft text-good",
  WON: "border-[#bbf7d0] bg-good-soft text-good",
  DEAD: "border-[#fecaca] bg-bad-soft text-bad",
  PAUSED: "border-stats-picker-line bg-stats-track text-stats-secondary",
}

export function StatusPill({ status }: { status: ProspectStatus }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full border px-2.5 text-[12px] font-semibold",
        STYLES[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
