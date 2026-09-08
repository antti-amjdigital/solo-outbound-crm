"use client"

import { useState } from "react"
import { prospectDisplayName } from "@/components/today/labels"
import { ContactCard } from "@/components/prospect-detail/contact-card"
import { AddTaskDialog } from "@/components/prospect-detail/add-task-dialog"
import { ProspectHeader } from "@/components/prospect-detail/prospect-header"
import { ProspectComposer } from "@/components/prospect-detail/prospect-composer"
import { FocusPanel } from "@/components/prospect-detail/focus-panel"
import { HistoryPanel } from "@/components/prospect-detail/history-panel"
import { ProspectStatsBar } from "@/components/prospect-detail/prospect-stats-bar"
import { PinnedNoteSection } from "@/components/prospect-detail/pinned-note-section"
import type { ProspectDetail } from "@/lib/prospect-detail-query"

export function ProspectDetailView({ data }: { data: ProspectDetail }) {
  const [logOpenTaskId, setLogOpenTaskId] = useState<string | null>(null)
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [enrollOpen, setEnrollOpen] = useState(false)
  const name = prospectDisplayName(data.prospect)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ProspectHeader
        data={data}
        name={name}
        enrollOpen={enrollOpen}
        onEnrollOpenChange={setEnrollOpen}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f8fafc] px-8 py-6">
        <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:overflow-hidden">
          <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-[330px]">
            <ContactCard prospect={data.prospect} />
            <PinnedNoteSection
              prospectId={data.prospect.id}
              notes={data.notes}
            />
            <ProspectStatsBar data={data} />
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
            <div className="shrink-0">
              <FocusPanel
                data={data}
                logOpenTaskId={logOpenTaskId}
                onLogOpenTaskIdChange={setLogOpenTaskId}
                onAddTaskClick={() => setAddTaskOpen(true)}
              />
            </div>
            <div className="shrink-0">
              <ProspectComposer prospectId={data.prospect.id} />
            </div>
            <HistoryPanel
              prospectId={data.prospect.id}
              history={data.history}
              taskLabels={data.historyTaskLabels}
              counts={data.historyCounts}
              filter={data.historyFilter}
              source={data.prospect.source}
            />
          </div>
        </div>
      </div>

      <AddTaskDialog
        open={addTaskOpen}
        onOpenChange={setAddTaskOpen}
        initialProspect={{
          id: data.prospect.id,
          firstName: data.prospect.firstName,
          lastName: data.prospect.lastName,
          company: data.prospect.company,
          phone: data.prospect.phone,
        }}
      />
    </div>
  )
}
