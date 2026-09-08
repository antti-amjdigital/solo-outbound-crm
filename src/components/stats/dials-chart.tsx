import { WEEKLY_DIAL_TARGET } from "@/lib/stats-constants"
import type { CallRates, WeekPoint } from "@/lib/stats"
import {
  MetricNum,
  StatsCard,
  StatsEmptyBody,
} from "@/components/stats/stats-card"
import { WeeklyDialsChart } from "@/components/stats/weekly-dials-chart"

type Props = {
  weekly: WeekPoint[]
  current: CallRates
  weekdays: number
}

function fmtPct(n: number | null): string {
  if (n == null) return "0%"
  return `${Math.round(n * 100)}%`
}

export function CallActivityCard({ weekly, current, weekdays }: Props) {
  const periodEmpty = current.dials === 0
  const chartEmpty = weekly.every((w) => w.dials === 0)
  const dialsPerDay = weekdays === 0 ? 0 : current.dials / weekdays
  const target = WEEKLY_DIAL_TARGET

  return (
    <StatsCard>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-stats-ink">Call activity</h2>
          <p className="mt-0.5 text-[13px] text-stats-muted">
            Last 12 weeks · target {target} dials / week
          </p>
        </div>
        <div className="flex items-center gap-3.5 pt-0.5 text-[12px] text-stats-secondary">
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block size-2.5 rounded-[3px] bg-stats-indigo-200" />
            Dials
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block size-2.5 rounded-[3px] bg-stats-indigo-700" />
            Connects
          </span>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-baseline gap-9">
        <Figure
          value={String(current.dials)}
          label="Dials this period"
          hero
          empty={periodEmpty}
        />
        <Figure
          value={String(current.connectedIsh)}
          label="Connects"
          empty={periodEmpty}
        />
        <Figure
          value={fmtPct(current.connectRate)}
          label="Connect rate"
          empty={periodEmpty}
        />
        <Figure
          value={dialsPerDay.toFixed(1)}
          label="Dials / working day"
          empty={periodEmpty}
        />
      </div>

      {chartEmpty ? (
        <StatsEmptyBody>No dials logged this period yet</StatsEmptyBody>
      ) : (
        <WeeklyDialsChart weekly={weekly} />
      )}
    </StatsCard>
  )
}

function Figure({
  value,
  label,
  hero,
  empty,
}: {
  value: string
  label: string
  hero?: boolean
  empty: boolean
}) {
  return (
    <div className="flex flex-col">
      <MetricNum
        value={value}
        empty={empty}
        className={
          hero
            ? "text-[30px] leading-none font-bold"
            : "text-xl leading-none font-semibold"
        }
      />
      <span className="mt-1.5 text-xs text-stats-secondary">{label}</span>
    </div>
  )
}
