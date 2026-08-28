"use client"

import { useState } from "react"
import { prospectDisplayName } from "@/components/today/labels"
import { StatusPill } from "@/components/prospects/status-pill"
import { ProspectActions } from "@/components/prospect-detail/prospect-actions"
import { ProspectComposer } from "@/components/prospect-detail/prospect-composer"
import { DetailSidePanels } from "@/components/prospect-detail/detail-side-panels"
import { FocusPanel } from "@/components/prospect-detail/focus-panel"
import { HistoryPanel } from "@/components/prospect-detail/history-panel"
import type { ProspectDetail } from "@/lib/prospect-detail-query"

export function ProspectDetailView({ data }: { data: ProspectDetail }) {
  const [logOpen, setLogOpen] = useState(false)
  const name = prospectDisplayName(data.prospect)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <h1 className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
          {name}
          <StatusPill status={data.prospect.status} />
        </h1>
        {data.prospect.company && (
          <span className="text-sm text-dim">{data.prospect.company}</span>
        )}
      </div>

      <div className="border-b border-border px-4 py-3">
        <ProspectComposer prospectId={data.prospect.id} />
      </div>

      <div className="border-b border-border px-4 py-3">
        <HistoryPanel
          prospectId={data.prospect.id}
          history={data.history}
          counts={data.historyCounts}
          filter={data.historyFilter}
        />
      </div>

      <ProspectActions
        prospectId={data.prospect.id}
        sequences={data.sequences}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4 lg:flex-row lg:items-start">
        <DetailSidePanels data={data} />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <FocusPanel
            data={data}
            logOpen={logOpen}
            onLogOpenChange={setLogOpen}
          />
        </div>
      </div>
    </div>
  )
}
