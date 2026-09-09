"use client"

import { useState } from "react"
import { ChevronDownIcon, MinusIcon, PlusIcon } from "lucide-react"
import { TypeIcon } from "@/components/today/type-icon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { StepRowProps } from "./step-row"
import { editControl, focusRing } from "./styles"
import { TemplatePanel } from "./template-panel"
import {
  STEP_TYPE_OPTIONS,
  contentNoun,
  hasContent,
  stepTypeLabel,
  waitText,
  waitUnit,
  type EditorStep,
} from "./types"

/** Keydown events that bubble (via React portals) out of an open popup. */
function fromPopup(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('[role="menu"], [role="listbox"], [role="dialog"]') !== null
  )
}

export function StepRowEdit({
  step,
  index,
  onClose,
  onChange,
  handle,
  initialShowContent = false,
}: StepRowProps & { handle: React.ReactNode }) {
  const [showContent, setShowContent] = useState(initialShowContent)
  const noun = contentNoun(step.type)
  const filled = hasContent(step.template)

  return (
    <div
      data-step-edit
      className="mx-3 my-1 rounded-[10px] border-[1.5px] border-stats-indigo-700 bg-white px-4 py-3.5 ring-3 ring-stats-indigo-700/10"
      onKeyDown={(e) => {
        if (e.key !== "Escape" || fromPopup(e.target)) return
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }}
    >
      <div className="flex items-center gap-3">
        {handle}
        <span className="text-xs font-semibold text-stats-muted tabular-nums">
          {index + 1}
        </span>

        <TypeSelect
          value={step.type}
          onChange={(type) => onChange({ type })}
        />

        <Input
          value={step.label}
          onChange={(e) => onChange({ label: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              onClose()
            }
          }}
          autoFocus
          aria-label="Step name"
          placeholder="Step name"
          className={cn(
            editControl,
            "flex-1 px-3 text-sm text-stats-ink focus-visible:border-stats-indigo-700 focus-visible:ring-stats-indigo-700/30",
          )}
        />

        <WaitStepper
          days={step.delayDays}
          index={index}
          onChange={(delayDays) => onChange({ delayDays })}
        />

        <button
          type="button"
          aria-expanded={showContent}
          onClick={() => setShowContent((v) => !v)}
          className={cn(
            editControl,
            "inline-flex shrink-0 items-center gap-1.5 px-3 font-semibold text-seq-button-ink hover:bg-stats-canvas",
            showContent && "bg-stats-canvas",
            focusRing,
          )}
        >
          {filled ? `Edit ${noun}` : `Add ${noun}`}
        </button>
      </div>

      {showContent && (
        <TemplatePanel
          type={step.type}
          template={step.template}
          onChange={(template) => onChange({ template })}
        />
      )}
    </div>
  )
}

function TypeSelect({
  value,
  onChange,
}: {
  value: EditorStep["type"]
  onChange: (type: EditorStep["type"]) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Step type"
        className={cn(
          editControl,
          "inline-flex shrink-0 items-center gap-2 px-3 font-semibold hover:bg-stats-canvas aria-expanded:bg-stats-canvas",
          focusRing,
        )}
      >
        <TypeIcon type={value} variant="inline" />
        {stepTypeLabel(value)}
        <ChevronDownIcon className="size-3 text-stats-muted" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-36">
        {STEP_TYPE_OPTIONS.map((o) => (
          <DropdownMenuItem key={o.value} onClick={() => onChange(o.value)}>
            <TypeIcon type={o.value} variant="inline" />
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function WaitStepper({
  days,
  index,
  onChange,
}: {
  days: number
  index: number
  onChange: (days: number) => void
}) {
  const stepButton = cn(
    "flex size-[26px] items-center justify-center rounded-md text-stats-secondary hover:bg-stats-track hover:text-stats-ink disabled:pointer-events-none disabled:opacity-40",
    focusRing,
  )

  return (
    <div
      role="group"
      aria-label="Wait before this step"
      className={cn(editControl, "inline-flex shrink-0 items-center gap-2.5 px-1.5")}
    >
      <button
        type="button"
        aria-label="Decrease wait"
        className={stepButton}
        disabled={days === 0}
        onClick={() => onChange(Math.max(0, days - 1))}
      >
        <MinusIcon className="size-3.5" />
      </button>
      <span className="min-w-[1ch] text-center font-semibold tabular-nums">
        {days}
      </span>
      <button
        type="button"
        aria-label="Increase wait"
        className={stepButton}
        onClick={() => onChange(days + 1)}
      >
        <PlusIcon className="size-3.5" />
      </button>
      <span className="pr-1 text-xs text-stats-muted">
        {days === 0 ? waitText(0, index) : waitUnit(days)}
      </span>
    </div>
  )
}
