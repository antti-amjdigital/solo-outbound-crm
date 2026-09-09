"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  GripVerticalIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { StepRowEdit } from "./step-row-edit"
import { StepTypeChip } from "./step-type-chip"
import { focusRing } from "./styles"
import {
  contentNoun,
  hasContent,
  waitText,
  type EditorStep,
} from "./types"

export type StepRowProps = {
  step: EditorStep
  index: number
  count: number
  editing: boolean
  /** When entering edit mode, start with the script/template panel expanded. */
  initialShowContent?: boolean
  /** Open edit mode; `showContent` also expands the script/template panel. */
  onOpen: (showContent?: boolean) => void
  onClose: () => void
  onChange: (patch: Partial<EditorStep>) => void
  onMove: (direction: -1 | 1) => void
  onDelete: () => void
}

/** Sortable wrapper: renders the quiet read row, or the inset edit card. */
export function StepRow(props: StepRowProps) {
  const { step, index, editing } = props
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: step.key })

  const handle = (
    <button
      type="button"
      aria-label={`Drag to reorder step ${index + 1}`}
      className={cn(
        "flex size-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-stats-zero hover:text-stats-muted active:cursor-grabbing",
        focusRing,
      )}
      {...attributes}
      {...listeners}
      onClick={(e) => e.stopPropagation()}
    >
      <GripVerticalIcon className="size-4" />
    </button>
  )

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "relative z-10 bg-white shadow-md")}
    >
      {editing ? (
        <StepRowEdit {...props} handle={handle} />
      ) : (
        <ReadRow {...props} handle={handle} />
      )}
    </div>
  )
}

function ReadRow({
  step,
  index,
  count,
  onOpen,
  onMove,
  onDelete,
  handle,
}: StepRowProps & { handle: React.ReactNode }) {
  const noun = contentNoun(step.type)
  const filled = hasContent(step.template)

  return (
    <div
      role="button"
      tabIndex={0}
      data-step-row={step.key}
      aria-label={`Edit step ${index + 1}: ${step.label || "Untitled step"}`}
      className={cn(
        "grid min-h-[54px] cursor-pointer grid-cols-[44px_30px_minmax(0,1fr)_150px_130px_28px] items-center gap-3 px-4 py-3 hover:bg-stats-canvas focus-visible:bg-stats-canvas",
        focusRing,
        "focus-visible:ring-inset",
      )}
      onClick={(e) => {
        // Menu items live in a portal: they bubble here in React but not in the DOM.
        if (!e.currentTarget.contains(e.target as Node)) return
        onOpen()
      }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen()
        }
      }}
    >
      <div className="flex items-center gap-2">
        {handle}
        <span className="text-xs font-semibold text-stats-muted tabular-nums">
          {index + 1}
        </span>
      </div>

      <StepTypeChip type={step.type} />

      <span
        className={cn(
          "truncate text-sm font-semibold",
          step.label ? "text-seq-name-ink" : "text-stats-muted italic",
        )}
      >
        {step.label || "Untitled step"}
      </span>

      <span className="text-[13px] text-stats-secondary">
        {waitText(step.delayDays, index)}
      </span>

      <button
        type="button"
        className={cn(
          "w-fit rounded text-left text-[13px] hover:underline",
          filled
            ? "text-stats-muted"
            : "font-medium text-stats-indigo-700",
          focusRing,
        )}
        onClick={(e) => {
          e.stopPropagation()
          onOpen(true)
        }}
      >
        {filled
          ? `${noun[0].toUpperCase()}${noun.slice(1)} added`
          : `Add ${noun}`}
      </button>

      <StepMenu
        index={index}
        count={count}
        onMove={onMove}
        onDelete={onDelete}
      />
    </div>
  )
}

export function StepMenu({
  index,
  count,
  onMove,
  onDelete,
}: {
  index: number
  count: number
  onMove: (direction: -1 | 1) => void
  onDelete: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Step ${index + 1} actions`}
        className={cn(
          "flex size-7 items-center justify-center rounded-md text-stats-muted hover:bg-stats-track hover:text-stats-secondary aria-expanded:bg-stats-track aria-expanded:text-stats-secondary",
          focusRing,
        )}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <MoreHorizontalIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuItem disabled={index === 0} onClick={() => onMove(-1)}>
          <ArrowUpIcon /> Move up
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={index === count - 1}
          onClick={() => onMove(1)}
        >
          <ArrowDownIcon /> Move down
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2Icon /> Delete step
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
