"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { saveSequenceStepsAction } from "@/actions/sequences"
import { diffSequenceSteps } from "@/lib/sequence-diff"
import type { SequenceEditorData } from "@/lib/sequence-queries"
import { SaveBar } from "./save-bar"
import { SchedulePreview, SequenceMetaPanel } from "./schedule-preview"
import { StepList } from "./step-list"
import type { EditorStep } from "./types"

function toEditorSteps(data: SequenceEditorData): EditorStep[] {
  return data.steps.map((s) => ({
    key: s.id,
    type: s.type,
    label: s.label,
    delayDays: s.delayDays,
    template: s.template,
    stats: s.stats,
  }))
}

export function SequenceEditor({ data }: { data: SequenceEditorData }) {
  const router = useRouter()
  const [baseline, setBaseline] = useState(() => toEditorSteps(data))
  const [steps, setSteps] = useState(() => toEditorSteps(data))
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [anchor, setAnchor] = useState<"today" | "monday" | "friday">("today")
  const [pending, startTransition] = useTransition()

  const changes = useMemo(
    () => diffSequenceSteps(baseline, steps),
    [baseline, steps],
  )

  function discard() {
    setSteps(baseline.map((s) => ({ ...s })))
    setOpenKey(null)
  }

  function save() {
    startTransition(async () => {
      const res = await saveSequenceStepsAction({
        sequenceId: data.id,
        steps: steps.map((s) => ({
          type: s.type,
          label: s.label,
          delayDays: s.delayDays,
          template: s.template,
        })),
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("Sequence saved")
      setBaseline(steps.map((s) => ({ ...s })))
      router.refresh()
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex items-center gap-3.5 border-b border-border px-4 py-3">
          <h1 className="text-xl font-bold tracking-tight">{data.name}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
          <Badge
            className={
              data.isActive
                ? "rounded-md border-transparent bg-accent-soft px-1.5 text-[10px] font-bold tracking-wide text-primary uppercase"
                : "rounded-md border-transparent bg-secondary px-1.5 text-[10px] font-bold tracking-wide text-dim uppercase"
            }
          >
            {data.isActive ? "Active" : "Inactive"}
          </Badge>
          <span className="text-xs text-dim">
            {steps.length} step{steps.length === 1 ? "" : "s"} ·{" "}
            {data.enrolledAllTime} enrolled · {data.midSequenceCount}{" "}
            mid-sequence
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_308px]">
          <StepList
            steps={steps}
            openKey={openKey}
            midSequenceCount={data.midSequenceCount}
            onOpenKey={setOpenKey}
            onStepsChange={setSteps}
          />
          <aside className="border-t border-border p-4 lg:border-t-0 lg:border-l lg:pl-0">
            <SchedulePreview
              steps={steps}
              anchor={anchor}
              onAnchorChange={setAnchor}
            />
            <SequenceMetaPanel
              enrolledAllTime={data.enrolledAllTime}
              runningCount={data.runningCount}
              meetingsBooked={data.meetingsBooked}
              dialCount={data.dialCount}
            />
          </aside>
        </div>
      </div>

      <SaveBar
        changes={changes}
        saving={pending}
        onDiscard={discard}
        onSave={save}
      />
    </div>
  )
}
