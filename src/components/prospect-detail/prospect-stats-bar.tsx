import type { ProspectDetail } from "@/lib/prospect-detail-query"
import { cn } from "@/lib/utils"

function StatCell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center py-4 text-center not-first:border-l not-first:border-[#f1f5f9]">
      <span
        className={cn(
          "text-[19px] font-semibold tabular-nums",
          value === 0 ? "text-[#cbd5e1]" : "text-[#0f172a]",
        )}
      >
        {value}
      </span>
      <span className="mt-0.5 text-[12px] text-[#64748b]">{label}</span>
    </div>
  )
}

export function ProspectStatsBar({ data }: { data: ProspectDetail }) {
  const { dials, connects, emails } = data

  return (
    <div className="flex rounded-xl border border-[#e8edf4] bg-white">
      <StatCell value={dials} label="Dials" />
      <StatCell value={emails} label="Emails" />
      <StatCell value={connects} label="Connects" />
    </div>
  )
}
