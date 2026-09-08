import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  MetricNum,
  StatsCard,
  StatsEmptyBody,
} from "@/components/stats/stats-card"
import type { FunnelStages } from "@/lib/stats-constants"
import { statsHref, type StatsFilters } from "@/lib/stats-filters"

const STAGE_FILLS = [
  "var(--stats-indigo-200)",
  "var(--stats-indigo-300)",
  "var(--stats-indigo-400)",
  "var(--stats-indigo-700)",
] as const

const CONV_LABELS = ["reached", "connected", "booked"] as const

type Props = {
  stages: FunnelStages
  sequenceName: string | null
  sequences: { id: string; name: string }[]
  filters: StatsFilters
}

export function FunnelChart({
  stages,
  sequenceName,
  sequences,
  filters,
}: Props) {
  const rows = [
    { label: "Enrolled", count: stages.enrolled },
    { label: "Contacted", count: stages.contacted },
    { label: "Connected", count: stages.connected },
    { label: "Meeting booked", count: stages.meetings },
  ]
  const empty = stages.enrolled === 0 || sequences.length === 0
  const base = Math.max(stages.enrolled, 1)
  const overallPct =
    stages.enrolled === 0
      ? 0
      : (stages.meetings / stages.enrolled) * 100
  const pickerLabel = sequenceName ?? sequences[0]?.name ?? "Sequence"

  return (
    <StatsCard>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-stats-ink">Sequence funnel</h2>
          <p className="mt-0.5 text-[13px] text-stats-muted">
            From enrollment to booked meeting
          </p>
        </div>
        {sequences.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-[34px] gap-1.5 rounded-lg border-stats-picker-line bg-white px-3 font-normal text-stats-ink shadow-none hover:bg-stats-canvas"
                />
              }
            >
              {pickerLabel}
              <ChevronDown className="size-3.5 text-stats-muted" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {sequences.map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  render={
                    <Link href={statsHref(filters, { sequenceId: s.id })} />
                  }
                >
                  {s.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {empty ? (
        <StatsEmptyBody>
          Enroll prospects in a sequence to see the funnel
        </StatsEmptyBody>
      ) : (
        <>
          <div
            className="flex flex-col"
            role="img"
            aria-label={rows
              .map((r) => `${r.label}: ${r.count}`)
              .join(", ")}
          >
            {rows.map((row, i) => {
              const widthPct = (row.count / base) * 100
              const prev = i === 0 ? null : rows[i - 1].count
              const conv =
                prev == null || prev === 0
                  ? null
                  : Math.round((row.count / prev) * 100)
              return (
                <div key={row.label}>
                  {i > 0 && conv != null && (
                    <p className="py-1.5 pl-[122px] text-[11px] text-stats-muted">
                      ↓ {conv}% {CONV_LABELS[i - 1]}
                    </p>
                  )}
                  <div className="grid grid-cols-[110px_1fr_auto] items-center gap-3">
                    <span className="truncate text-[13px] text-stats-secondary">
                      {row.label}
                    </span>
                    <svg
                      className="h-[22px] w-full"
                      viewBox="0 0 100 22"
                      preserveAspectRatio="none"
                      aria-hidden
                    >
                      <rect
                        width="100"
                        height="22"
                        rx="6"
                        fill="var(--stats-track)"
                      />
                      <rect
                        width={Math.min(100, Math.max(0, widthPct))}
                        height="22"
                        rx="6"
                        fill={STAGE_FILLS[i]}
                      />
                    </svg>
                    <MetricNum
                      value={String(row.count)}
                      empty={row.count === 0}
                      className="min-w-[2rem] text-right text-[13px] font-bold"
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <p className="mt-5 text-xs text-stats-muted">
            Overall: {stages.meetings} of {stages.enrolled} enrolled became
            meetings —{" "}
            <span className="font-semibold text-stats-secondary tabular-nums">
              {overallPct % 1 === 0
                ? `${overallPct}%`
                : `${overallPct.toFixed(1)}%`}
            </span>
          </p>
        </>
      )}
    </StatsCard>
  )
}
