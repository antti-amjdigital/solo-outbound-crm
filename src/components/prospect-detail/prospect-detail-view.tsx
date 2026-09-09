"use client"

import { useState } from "react"
import { ActivityType } from "@prisma/client"
import { prospectDisplayName } from "@/components/today/labels"
import { ContactCard } from "@/components/prospect-detail/contact-card"
import { AddTaskDialog } from "@/components/prospect-detail/add-task-dialog"
import { ProspectHeader } from "@/components/prospect-detail/prospect-header"
import { FocusPanel } from "@/components/prospect-detail/focus-panel"
import { HistoryPanel } from "@/components/prospect-detail/history-panel"
import { LogActivityDialog } from "@/components/prospect-detail/log-activity-dialog"
import { NotesSidebar } from "@/components/prospect-detail/notes-sidebar"
import { ProspectStatsBar } from "@/components/prospect-detail/prospect-stats-bar"
import { PinnedNoteSection } from "@/components/prospect-detail/pinned-note-section"
import type { ProspectDetail } from "@/lib/prospect-detail-query"

export function ProspectDetailView({ data }: { data: ProspectDetail }) {
  const [logOpenTaskId, setLogOpenTaskId] = useState<string | null>(null)
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [logActivityOpen, setLogActivityOpen] = useState(false)
  const name = prospectDisplayName(data.prospect)
  const historyWithoutNotes = data.history.filter(
    (a) => a.type !== ActivityType.NOTE,
  )

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
          <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-[330px] lg:overflow-y-auto">
            <ContactCard prospect={data.prospect} />
            <PinnedNoteSection
              prospectId={data.prospect.id}
              notes={data.notes}
            />
            <ProspectStatsBar data={data} />
            <NotesSidebar prospectId={data.prospect.id} notes={data.notes} />
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
            <FocusPanel
              data={data}
              logOpenTaskId={logOpenTaskId}
              onLogOpenTaskIdChange={setLogOpenTaskId}
              onAddTaskClick={() => setAddTaskOpen(true)}
            />
            <HistoryPanel
              prospectId={data.prospect.id}
              history={historyWithoutNotes}
              taskLabels={data.historyTaskLabels}
              source={data.prospect.source}
              onLogActivityClick={() => setLogActivityOpen(true)}
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
      <LogActivityDialog
        prospectId={data.prospect.id}
        open={logActivityOpen}
        onOpenChange={setLogActivityOpen}
      />
    </div>
  )
}
