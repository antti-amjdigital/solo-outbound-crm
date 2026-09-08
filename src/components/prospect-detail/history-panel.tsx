import { HistoryFilter as HistoryFilterMenu } from "@/components/prospect-detail/history-filter"
import { HistoryList } from "@/components/prospect-detail/history-list"
import type { HistoryFilter } from "@/lib/prospect-filters"
import { type Activity } from "@prisma/client"

export function HistoryPanel({
  prospectId,
  history,
  taskLabels,
  counts,
  filter,
  source,
}: {
  prospectId: string
  history: Activity[]
  taskLabels: Record<string, string>
  counts: Record<HistoryFilter, number>
  filter: HistoryFilter
  source: string | null
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#e8edf4] bg-white px-4 py-3">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <span className="text-[15px] font-bold text-[#0f172a]">History</span>
        <HistoryFilterMenu
          prospectId={prospectId}
          filter={filter}
          counts={counts}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <HistoryList
          history={history}
          source={source}
          taskLabels={taskLabels}
        />
      </div>
    </div>
  )
}
