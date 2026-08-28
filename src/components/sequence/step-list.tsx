"use client"

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { AlertTriangleIcon, PlusIcon } from "lucide-react"
import { StepType } from "@prisma/client"
import { StepRow } from "./step-row"
import { newStepKey, type EditorStep } from "./types"

export function StepList({
  steps,
  openKey,
  midSequenceCount,
  onOpenKey,
  onStepsChange,
}: {
  steps: EditorStep[]
  openKey: string | null
  midSequenceCount: number
  onOpenKey: (key: string | null) => void
  onStepsChange: (steps: EditorStep[]) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = steps.findIndex((s) => s.key === active.id)
    const newIndex = steps.findIndex((s) => s.key === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onStepsChange(arrayMove(steps, oldIndex, newIndex))
  }

  function updateAt(key: string, patch: Partial<EditorStep>) {
    onStepsChange(steps.map((s) => (s.key === key ? { ...s, ...patch } : s)))
  }

  function deleteAt(key: string) {
    onStepsChange(steps.filter((s) => s.key !== key))
    if (openKey === key) onOpenKey(null)
  }

  function addStep() {
    const key = newStepKey()
    onStepsChange([
      ...steps,
      {
        key,
        type: StepType.CALL,
        label: "New step",
        delayDays: 1,
        template: null,
        stats: null,
      },
    ])
    onOpenKey(key)
  }

  return (
    <div className="min-w-0 p-4">
      {midSequenceCount > 0 && (
        <div className="mb-3 flex gap-2.5 rounded-[5px] border border-warn-line bg-warn-soft px-3.5 py-2.5 text-xs text-warn">
          <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
          <span>
            <b className="text-ink">
              {midSequenceCount} prospect
              {midSequenceCount === 1 ? " is" : "s are"} mid-sequence.
            </b>{" "}
            Changes apply to their next step onward; steps they&apos;ve already
            passed won&apos;t be re-run.
          </span>
        </div>
      )}

      <div className="mb-1.5 grid grid-cols-[20px_26px_128px_minmax(0,1fr)_128px_112px_24px] gap-2.5 px-3 text-[10.5px] font-bold tracking-wide text-dim uppercase">
        <span />
        <span />
        <span>Type</span>
        <span>Task name</span>
        <span>Wait before</span>
        <span>Content</span>
        <span />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={steps.map((s) => s.key)}
          strategy={verticalListSortingStrategy}
        >
          {steps.map((step, i) => (
            <StepRow
              key={step.key}
              step={step}
              index={i}
              open={openKey === step.key}
              onToggleOpen={() =>
                onOpenKey(openKey === step.key ? null : step.key)
              }
              onChange={(patch) => updateAt(step.key, patch)}
              onDelete={() => deleteAt(step.key)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={addStep}
        className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border bg-surface px-3 py-2.5 text-xs text-dim hover:border-primary/40 hover:text-ink"
      >
        <PlusIcon className="size-3.5" /> Add step
      </button>
    </div>
  )
}
