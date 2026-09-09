"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { saveSequenceStepsAction } from "@/actions/sequences"
import { diffSequenceSteps } from "@/lib/sequence-diff"
import type { SequenceEditorData } from "@/lib/sequence-queries"
import { SaveBar } from "./save-bar"
import { SequenceHeader } from "./sequence-header"
import { StepList, type EditingState } from "./step-list"
import type { EditorStep } from "./types"

function toEditorSteps(data: SequenceEditorData): EditorStep[] {
  return data.steps.map((s) => ({
    key: s.id,
    type: s.type,
    label: s.label,
    delayDays: s.delayDays,
    template: s.template,
  }))
}

export function SequenceEditor({ data }: { data: SequenceEditorData }) {
  const router = useRouter()
  const [baseline, setBaseline] = useState(() => toEditorSteps(data))
  const [steps, setSteps] = useState(() => toEditorSteps(data))
  const [editing, setEditing] = useState<EditingState>(null)
  const [pending, startTransition] = useTransition()

  const dirty = useMemo(
    () => diffSequenceSteps(baseline, steps).length > 0,
    [baseline, steps],
  )

  function discard() {
    setSteps(baseline.map((s) => ({ ...s })))
    setEditing(null)
  }

  function save() {
    setEditing(null)
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
    <div className="flex min-h-0 flex-1 flex-col bg-stats-canvas">
      <SequenceHeader
        sequenceId={data.id}
        name={data.name}
        isActive={data.isActive}
        steps={steps}
        enrolledAllTime={data.enrolledAllTime}
        calendarToday={data.calendarToday}
        hasUnsavedChanges={dirty}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto w-full max-w-[1040px] overflow-hidden rounded-[12px] border border-stats-card-line bg-white">
          <StepList
            steps={steps}
            editing={editing}
            onEditingChange={setEditing}
            onStepsChange={setSteps}
          />
        </div>
      </div>

      <SaveBar dirty={dirty} saving={pending} onDiscard={discard} onSave={save} />
    </div>
  )
}
