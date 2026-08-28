"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { StepType } from "@prisma/client"
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  GripVerticalIcon,
  MoreHorizontalIcon,
  PlusIcon,
} from "lucide-react"
import { TypeIcon } from "@/components/today/type-icon"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { TemplatePanel } from "./template-panel"
import { STEP_TYPE_OPTIONS, type EditorStep } from "./types"

export function StepRow({
  step,
  index,
  open,
  onToggleOpen,
  onChange,
  onDelete,
}: {
  step: EditorStep
  index: number
  open: boolean
  onToggleOpen: () => void
  onChange: (patch: Partial<EditorStep>) => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: step.key })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const hasTemplate = Boolean(step.template?.trim())
  const isEmail =
    step.type === StepType.EMAIL || step.type === StepType.EMAIL_REPLY

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "mb-2 grid grid-cols-[20px_26px_128px_minmax(0,1fr)_128px_112px_24px] items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5",
        open && "border-primary shadow-[0_0_0_3px_var(--accent-soft)]",
        isDragging && "opacity-60 shadow-md",
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-dim/70 hover:text-dim"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-4" />
      </button>

      <span className="flex size-6 items-center justify-center rounded-md border border-border bg-surface font-mono text-[11px] font-bold text-dim">
        {index + 1}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-8 w-full items-center gap-1.5 rounded-md border border-border bg-background px-2 text-xs outline-none">
          <TypeIcon type={step.type} />
          <span className="truncate">
            {STEP_TYPE_OPTIONS.find((o) => o.value === step.type)?.label}
          </span>
          <ChevronDownIcon className="ml-auto size-3.5 shrink-0 text-dim" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-36">
          {STEP_TYPE_OPTIONS.map((o) => (
            <DropdownMenuItem
              key={o.value}
              onClick={() => onChange({ type: o.value })}
            >
              <TypeIcon type={o.value} />
              {o.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="min-w-0">
        <Input
          value={step.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="h-8 text-xs"
          placeholder="Task name"
        />
      </div>

      <div className="inline-flex h-9 overflow-hidden rounded-md border border-border bg-background">
        <button
          type="button"
          className="flex w-6 items-center justify-center bg-surface text-sm text-dim hover:text-ink"
          onClick={() =>
            onChange({ delayDays: Math.max(0, step.delayDays - 1) })
          }
          aria-label="Decrease wait"
        >
          −
        </button>
        <span
          className="flex min-w-[78px] flex-1 flex-col items-center justify-center px-1.5 leading-none"
          aria-label={
            step.delayDays === 0
              ? "Start immediately, no wait"
              : `${step.delayDays} business day${step.delayDays === 1 ? "" : "s"}`
          }
        >
          <span className="text-[15px] font-semibold tabular-nums tracking-tight text-ink">
            {step.delayDays}
          </span>
          <span className="mt-0.5 text-[9px] font-medium text-dim">
            {step.delayDays === 0
              ? "start now"
              : step.delayDays === 1
                ? "business day"
                : "business days"}
          </span>
        </span>
        <button
          type="button"
          className="flex w-6 items-center justify-center bg-surface text-sm text-dim hover:text-ink"
          onClick={() => onChange({ delayDays: step.delayDays + 1 })}
          aria-label="Increase wait"
        >
          +
        </button>
      </div>

      <Button
        type="button"
        size="sm"
        variant={open ? "default" : hasTemplate ? "outline" : "ghost"}
        className={cn(
          "justify-center",
          !open && !hasTemplate && "border border-dashed border-border text-dim",
          !open && hasTemplate && "border-accent-line text-primary",
        )}
        onClick={onToggleOpen}
      >
        {open ? (
          <>
            Template <ChevronUpIcon className="size-3.5" />
          </>
        ) : hasTemplate ? (
          <>
            <CheckIcon className="size-3" /> Template
          </>
        ) : (
          <>
            <PlusIcon className="size-3" /> Add {isEmail ? "template" : "script"}
          </>
        )}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex size-6 items-center justify-center rounded text-dim hover:bg-muted hover:text-ink"
          aria-label="Step actions"
        >
          <MoreHorizontalIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            Delete step
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {open && (
        <TemplatePanel
          type={step.type}
          template={step.template}
          onChange={(template) => onChange({ template })}
          onCollapse={onToggleOpen}
        />
      )}
    </div>
  )
}
