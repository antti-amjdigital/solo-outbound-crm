"use client"

import { useEffect } from "react"
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
import { PlusIcon } from "lucide-react"
import { StepType } from "@prisma/client"
import { cn } from "@/lib/utils"
import { StepRow } from "./step-row"
import { focusRing } from "./styles"
import { newStepKey, type EditorStep } from "./types"

export type EditingState = { key: string; showContent: boolean } | null

/** Anything a click can land on that should NOT collapse the open edit row. */
const KEEP_OPEN_SELECTOR =
  '[data-step-edit], [role="menu"], [role="listbox"], [role="dialog"], [data-sonner-toaster]'

export function StepList({
  steps,
  editing,
  onEditingChange,
  onStepsChange,
}: {
  steps: EditorStep[]
  editing: EditingState
  onEditingChange: (editing: EditingState) => void
  onStepsChange: (steps: EditorStep[]) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // Click anywhere outside the open edit card collapses it back to read mode.
  useEffect(() => {
    if (!editing) return
    function onPointerDown(e: PointerEvent) {
      const target = e.target
      if (target instanceof Element && target.closest(KEEP_OPEN_SELECTOR)) return
      onEditingChange(null)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [editing, onEditingChange])

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

  function moveAt(key: string, direction: -1 | 1) {
    const from = steps.findIndex((s) => s.key === key)
    const to = from + direction
    if (from < 0 || to < 0 || to >= steps.length) return
    onStepsChange(arrayMove(steps, from, to))
  }

  function deleteAt(key: string) {
    onStepsChange(steps.filter((s) => s.key !== key))
    if (editing?.key === key) onEditingChange(null)
  }

  /** Close edit mode and hand focus back to the row so Esc doesn't drop focus. */
  function closeEditing(key: string) {
    onEditingChange(null)
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`[data-step-row="${key}"]`)
        ?.focus()
    })
  }

  function addStep() {
    const key = newStepKey()
    onStepsChange([
      ...steps,
      {
        key,
        type: StepType.CALL,
        label: "",
        delayDays: steps.length === 0 ? 0 : 1,
        template: null,
      },
    ])
    onEditingChange({ key, showContent: false })
  }

  return (
    <div>
      <DndContext
        id="sequence-steps"
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
              count={steps.length}
              editing={editing?.key === step.key}
              initialShowContent={
                editing?.key === step.key ? editing.showContent : false
              }
              onOpen={(showContent = false) =>
                onEditingChange({ key: step.key, showContent })
              }
              onClose={() => closeEditing(step.key)}
              onChange={(patch) => updateAt(step.key, patch)}
              onMove={(direction) => moveAt(step.key, direction)}
              onDelete={() => deleteAt(step.key)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {steps.length === 0 && (
        <p className="px-4 py-6 text-center text-[13px] text-stats-muted">
          No steps yet. Add the first touch below.
        </p>
      )}

      <button
        type="button"
        onClick={addStep}
        className={cn(
          "flex w-full items-center gap-2 border-t border-stats-grid px-4 py-3.5 text-[13px] font-semibold text-stats-indigo-700 hover:bg-stats-canvas",
          focusRing,
          "focus-visible:ring-inset",
        )}
      >
        <PlusIcon className="size-3.5" />
        Add step
      </button>
    </div>
  )
}
