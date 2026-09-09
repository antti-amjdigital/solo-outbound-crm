import { Suspense } from "react"
import { GlobalSearch } from "@/components/global-search/global-search"
import { ProspectPanelSlot } from "@/components/prospect-detail/prospect-panel-slot"
import { AddTaskButton } from "@/components/today/add-task-button"
import { QueueFilters } from "@/components/today/queue-filters"
import { TodayQueue } from "@/components/today/today-queue"
import { Skeleton } from "@/components/ui/skeleton"
import { formatHeaderDate } from "@/lib/format-header-date"
import { getTodayQueue } from "@/lib/queries"

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const raw = await searchParams

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-[#e8edf4] bg-white">
        <div className="mx-auto flex max-w-[1020px] items-center gap-4 px-4 py-3">
          <h1 className="shrink-0 text-[22px] font-bold text-[#0f172a]">
            Tasks
          </h1>

          <GlobalSearch />

          <time
            dateTime={new Date().toISOString()}
            className="shrink-0 text-[13px] text-[#94a3b8]"
          >
            {formatHeaderDate()}
          </time>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto bg-[#f8fafc]">
        <div className="mx-auto max-w-[1020px] px-4 py-4">
          {/* Header streams immediately; only the queue waits on the database. */}
          <Suspense fallback={<QueueSkeleton />}>
            <TodayBody raw={raw} />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={null}>
        <ProspectPanelSlot raw={raw} />
      </Suspense>
    </div>
  )
}

async function TodayBody({
  raw,
}: {
  raw: Record<string, string | string[] | undefined>
}) {
  const { open, done, counts, filters, todayProgress } = await getTodayQueue(raw)

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <QueueFilters filters={filters} counts={counts} />
        <AddTaskButton />
      </div>

      <TodayQueue
        open={open}
        done={done}
        range={filters.range}
        todayProgress={todayProgress}
      />
    </>
  )
}

function QueueSkeleton() {
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="space-y-2 rounded-xl border border-[#e8edf4] bg-white p-4">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </>
  )
}
