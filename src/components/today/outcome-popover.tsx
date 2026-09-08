"use client"

import { useEffect, useRef, useState } from "react"
import { useHotkeys } from "react-hotkeys-hook"
import { CallOutcome, StepType } from "@prisma/client"
import {
  OUTCOME_OPTIONS,
} from "@/components/today/labels"
import { OutcomeGroupsSection } from "@/components/today/outcome-groups-section"
import {
  defaultFollowUp,
  OutcomeFollowUpSection,
  resolveNextDueDate,
  type FollowUpChoice,
} from "@/components/today/outcome-follow-up-section"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { appToday } from "@/lib/dates"
import { addCalendarDays } from "@/lib/queue-filters"
import { cn } from "@/lib/utils"

const OUTCOME_BY_KBD = Object.fromEntries(
  OUTCOME_OPTIONS.map((o) => [o.kbd, o.value]),
) as Record<string, CallOutcome>

type Props = {
  taskId: string
  taskType: StepType
  hasActiveSequence?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: (input: {
    taskId: string
    outcome?: CallOutcome
    note?: string
    nextDueDate?: string
  }) => void
}

export function OutcomePopover({
  taskId,
  taskType,
  hasActiveSequence = false,
  open,
  onOpenChange,
  onComplete,
}: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const [outcome, setOutcome] = useState<CallOutcome | null>(null)
  const [note, setNote] = useState("")
  const [noteExpanded, setNoteExpanded] = useState(false)
  const [followUp, setFollowUp] = useState<FollowUpChoice | null>(null)
  const [followUpManual, setFollowUpManual] = useState(false)
  const [pickedDate, setPickedDate] = useState(() =>
    addCalendarDays(appToday(), 3),
  )

  const isCall = taskType === StepType.CALL
  const showFollowUp = isCall && !hasActiveSequence

  function reset() {
    setOutcome(null)
    setNote("")
    setNoteExpanded(false)
    setFollowUp(null)
    setFollowUpManual(false)
    setPickedDate(addCalendarDays(appToday(), 3))
  }

  function selectOutcome(next: CallOutcome) {
    setOutcome(next)
    if (showFollowUp && !followUpManual) {
      setFollowUp(defaultFollowUp(next))
    }
  }

  function save() {
    if (isCall && !outcome) return
    onComplete({
      taskId,
      outcome: outcome ?? undefined,
      note: note.trim() || undefined,
      nextDueDate: resolveNextDueDate(
        outcome,
        followUp,
        pickedDate,
        hasActiveSequence,
      ),
    })
    reset()
    onOpenChange(false)
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset()
      triggerRef.current?.focus()
    }
    onOpenChange(next)
  }

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return

    const focusables = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    first?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        handleOpenChange(false)
        return
      }
      if (e.key !== "Tab" || focusables.length === 0) return
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else if (document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }

    dialog.addEventListener("keydown", onKeyDown)
    return () => dialog.removeEventListener("keydown", onKeyDown)
  }, [open])

  useHotkeys(
    "1,2,3,4,5,6,7,8",
    (e) => {
      if (!isCall) return
      const next = OUTCOME_BY_KBD[e.key]
      if (!next) return
      e.preventDefault()
      selectOutcome(next)
    },
    { enabled: open && isCall },
    [open, isCall, followUpManual, showFollowUp],
  )

  useHotkeys(
    "enter",
    (e) => {
      if (isCall && !outcome) return
      e.preventDefault()
      save()
    },
    { enabled: open },
    [open, outcome, note, followUp, pickedDate, hasActiveSequence],
  )

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <button
            ref={triggerRef}
            type="button"
            aria-label="Log outcome"
            aria-expanded={open}
            className={cn(
              "inline-flex size-5 items-center justify-center rounded-full border-2 border-[#cbd5e1] bg-white focus-visible:ring-2 focus-visible:ring-[#4f46e5]/30 focus-visible:outline-none",
              open && "border-[#4f46e5]",
            )}
            onClick={(e) => e.stopPropagation()}
          />
        }
      />
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        className="w-[440px] gap-4 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.16)] ring-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={isCall ? "Log call outcome" : "Complete task"}
          className="flex flex-col gap-4"
        >
          {isCall ? (
            <>
              <OutcomeGroupsSection value={outcome} onChange={selectOutcome} />

              {showFollowUp ? (
                <>
                  <div className="-mx-5 h-px bg-[#eef1f6]" />
                  <OutcomeFollowUpSection
                    value={followUp}
                    pickedDate={pickedDate}
                    onChange={(next) => {
                      setFollowUpManual(true)
                      setFollowUp(next)
                    }}
                    onPickDate={setPickedDate}
                  />
                </>
              ) : null}
            </>
          ) : null}

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onFocus={() => setNoteExpanded(true)}
            rows={noteExpanded ? 3 : 1}
            placeholder="Add a note (optional)"
            className={cn(
              "w-full resize-none rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-[13px] text-[#0f172a] placeholder:text-[#94a3b8] focus-visible:border-[#4f46e5] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(79,70,229,0.10)]",
              noteExpanded ? "min-h-[72px]" : "h-[38px] min-h-[38px]",
            )}
          />

          <div className="flex items-center justify-between">
            <button
              type="button"
              className="text-[13px] text-[#64748b] hover:text-[#475569] focus-visible:outline-none"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isCall && !outcome}
              className="inline-flex h-9 items-center rounded-lg bg-[#4f46e5] px-4 text-[13px] font-semibold text-white hover:bg-[#4338ca] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f46e5]/30"
              onClick={save}
            >
              Save & complete
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
