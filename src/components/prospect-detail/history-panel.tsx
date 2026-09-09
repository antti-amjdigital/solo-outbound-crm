"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HistoryList } from "@/components/prospect-detail/history-list"
import { type Activity } from "@prisma/client"

export function HistoryPanel({
  prospectId,
  history,
  taskLabels,
  source,
  onLogActivityClick,
}: {
  prospectId: string
  history: Activity[]
  taskLabels: Record<string, string>
  source: string | null
  onLogActivityClick: () => void
}) {
  return (
    <div className="rounded-xl border border-[#e8edf4] bg-white px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[15px] font-bold text-[#0f172a]">History</span>
        <Button
          size="sm"
          variant="outline"
          className="border-[#e2e8f0] bg-white text-[#0f172a] hover:bg-[#f8fafc]"
          onClick={onLogActivityClick}
        >
          <Plus className="size-3.5" />
          Log activity
        </Button>
      </div>
      <HistoryList
        prospectId={prospectId}
        history={history}
        source={source}
        taskLabels={taskLabels}
      />
    </div>
  )
}
