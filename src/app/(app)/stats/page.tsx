import { Suspense } from "react"
import { GlobalSearch } from "@/components/global-search/global-search"
import { Skeleton } from "@/components/ui/skeleton"
import { CallActivityCard } from "@/components/stats/dials-chart"
import { FunnelChart } from "@/components/stats/funnel-chart"
import { OutcomesMeetingsCard } from "@/components/stats/outcomes-card"
import { StatsPeriodFilter } from "@/components/stats/stats-filters"
import { getStatsDashboard } from "@/lib/stats-dashboard"
import { parseStatsFilters, resolvePeriod } from "@/lib/stats-filters"

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

function formatShortRange(fromDay: Date, toDay: Date): string {
  const a = `${fromDay.getUTCDate()} ${MONTHS[fromDay.getUTCMonth()]}`
  const b = `${toDay.getUTCDate()} ${MONTHS[toDay.getUTCMonth()]}`
  return `${a} → ${b}`
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const raw = await searchParams
  const filters = parseStatsFilters(raw)
  const range = resolvePeriod(filters)
  const rangeLabel = formatShortRange(range.fromDay, range.toDay)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="grid shrink-0 grid-cols-[1fr_minmax(0,28rem)_1fr] items-center gap-3 border-b border-stats-card-line bg-white px-8 py-3">
        <h1 className="text-xl font-bold tracking-tight text-stats-ink">
          Stats
        </h1>
        <div className="flex justify-center">
          <GlobalSearch className="w-full max-w-md" />
        </div>
        <div className="flex justify-end">
          <StatsPeriodFilter filters={filters} rangeLabel={rangeLabel} />
        </div>
      </header>

      <Suspense fallback={<StatsSkeleton />}>
        <StatsBody raw={raw} />
      </Suspense>
    </div>
  )
}

async function StatsBody({
  raw,
}: {
  raw: Record<string, string | string[] | undefined>
}) {
  const data = await getStatsDashboard(raw)

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-stats-canvas px-8 py-6">
      <div className="grid gap-5 lg:grid-cols-[1.9fr_1fr]">
        <div className="flex flex-col gap-5">
          <CallActivityCard
            weekly={data.weekly}
            current={data.current}
            weekdays={data.weekdays}
          />
          <FunnelChart
            stages={data.funnelStages}
            sequenceName={data.sequenceName}
            sequences={data.sequences}
            filters={data.filters}
          />
        </div>
        <OutcomesMeetingsCard
          pickup={data.pickup}
          rates={data.current}
          meetingsByStep={data.meetingsByStep}
        />
      </div>
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid gap-5 bg-stats-canvas px-8 py-6 lg:grid-cols-[1.9fr_1fr]">
      <div className="flex flex-col gap-5">
        <Skeleton className="h-80 rounded-[12px]" />
        <Skeleton className="h-64 rounded-[12px]" />
      </div>
      <Skeleton className="h-[28rem] rounded-[12px]" />
    </div>
  )
}
