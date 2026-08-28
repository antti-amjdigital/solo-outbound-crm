import { Suspense } from "react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ConsistencyHeatmap } from "@/components/stats/heatmap"
import { DialsConnectChart } from "@/components/stats/dials-chart"
import { FunnelChart } from "@/components/stats/funnel-chart"
import { KpiRow } from "@/components/stats/kpi-row"
import { MeetingsDonut } from "@/components/stats/meetings-donut"
import { PickupGauge } from "@/components/stats/pickup-gauge"
import { StatsFiltersBar } from "@/components/stats/stats-filters"
import { StepRanks } from "@/components/stats/step-ranks"
import { getStatsDashboard } from "@/lib/stats-dashboard"
import { formatCalendarDate } from "@/lib/dates"

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const raw = await searchParams

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3.5 border-b border-border px-4 py-3">
        <h1 className="text-xl font-bold tracking-tight">Stats</h1>
        <form action="/prospects" method="get" className="mx-auto w-full max-w-md">
          <Input
            name="q"
            placeholder="Search prospects, companies, numbers…"
            className="h-8 bg-surface text-xs"
          />
        </form>
      </div>

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
  const rangeLabel = `${formatCalendarDate(data.range.fromDay)} → ${formatCalendarDate(data.range.toDay)}`

  return (
    <>
      <StatsFiltersBar
        filters={data.filters}
        sequences={data.sequences}
        rangeLabel={rangeLabel}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-auto bg-surface p-3.5">
        <KpiRow
          current={data.current}
          previous={data.previous}
          weekdays={data.weekdays}
          dialSpark={data.dialSpark}
          connectSpark={data.connectSpark}
          meetingSpark={data.meetingSpark}
          dialsPerMeetingSpark={data.dialsPerMeetingSpark}
        />

        <div className="grid gap-3.5 lg:grid-cols-[1.9fr_1fr]">
          <DialsConnectChart weekly={data.weekly} />
          <PickupGauge pickup={data.pickup} rates={data.current} />
        </div>

        <div className="grid gap-3.5 lg:grid-cols-[1.9fr_1fr]">
          <FunnelChart
            funnel={data.funnel}
            sequenceName={data.sequenceName}
            enrolled={data.enrolledForFunnel}
          />
          <MeetingsDonut
            meetingsByStep={data.meetingsByStep}
            total={data.current.meetingsBooked}
          />
        </div>

        <div className="grid gap-3.5 lg:grid-cols-[1.9fr_1fr]">
          <ConsistencyHeatmap cells={data.heatmap} />
          <StepRanks ranks={data.ranks} />
        </div>
      </div>
    </>
  )
}

function StatsSkeleton() {
  return (
    <div className="space-y-3.5 bg-surface p-3.5">
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}
