import { ProspectStatus } from "@prisma/client"
import { Badge } from "@/components/ui/badge"
import { STATUS_LABEL } from "@/lib/prospect-filters"
import { cn } from "@/lib/utils"

const STYLES: Record<ProspectStatus, string> = {
  NEW: "bg-secondary text-dim border-transparent",
  ACTIVE: "bg-accent-soft text-primary border-transparent",
  MEETING_BOOKED: "bg-good-soft text-good border-transparent",
  WON: "bg-good-soft text-good border-transparent",
  DEAD: "bg-bad-soft text-bad border-transparent",
  PAUSED: "bg-secondary text-dim border-transparent",
}

export function StatusPill({ status }: { status: ProspectStatus }) {
  return (
    <Badge
      className={cn(
        "rounded-md px-1.5 text-[10px] font-bold tracking-wide uppercase",
        STYLES[status],
      )}
    >
      {STATUS_LABEL[status]}
    </Badge>
  )
}
