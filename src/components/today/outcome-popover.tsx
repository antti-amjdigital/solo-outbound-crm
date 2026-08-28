"use client"

import { useState } from "react"
import { useHotkeys } from "react-hotkeys-hook"
import { CallOutcome, StepType } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { OUTCOME_OPTIONS } from "@/components/today/labels"
import {
  addBusinessDays,
  appToday,
  formatCalendarDate,
  toCalendarDate,
} from "@/lib/dates"
import { cn } from "@/lib/utils"

const OUTCOME_BY_KBD = Object.fromEntries(
  OUTCOME_OPTIONS.map((o) => [o.kbd, o.value]),
) as Record<string, CallOutcome>

type Props = {
  taskId: string
  taskType: StepType
  prospectName: string
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
  prospectName,
  open,
  onOpenChange,
  onComplete,
}: Props) {
  const [outcome, setOutcome] = useState<CallOutcome | null>(null)
  const [note, setNote] = useState("")
  const [callbackDate, setCallbackDate] = useState<Date>(
    () => addBusinessDays(appToday(), 2),
  )

  const isCall = taskType === StepType.CALL
  const needsCallback = outcome === CallOutcome.CALLBACK_REQUESTED

  function save() {
    if (isCall && !outcome) return
    onComplete({
      taskId,
      outcome: outcome ?? undefined,
      note: note.trim() || undefined,
      nextDueDate:
        outcome === CallOutcome.CALLBACK_REQUESTED
          ? formatCalendarDate(toCalendarDate(callbackDate))
          : undefined,
    })
    setOutcome(null)
    setNote("")
    onOpenChange(false)
  }

  useHotkeys(
    "1,2,3,4,5,6,7,8",
    (e) => {
      if (!isCall) return
      const next = OUTCOME_BY_KBD[e.key]
      if (!next) return
      e.preventDefault()
      setOutcome(next)
    },
    { enabled: open && isCall },
    [open, isCall],
  )

  useHotkeys(
    "enter",
    (e) => {
      if (isCall && !outcome) return
      e.preventDefault()
      save()
    },
    { enabled: open },
    [open, outcome, note, callbackDate],
  )

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Log outcome"
            className={cn(
              "inline-flex size-[18px] items-center justify-center rounded-full border-[1.5px] border-border",
              open && "border-primary text-primary",
            )}
            onClick={(e) => e.stopPropagation()}
          />
        }
      />
      <PopoverContent
        align="start"
        side="bottom"
        className="w-[320px] gap-2 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[13px] font-semibold">
          {isCall ? `Outcome — ${prospectName}` : `Complete — ${prospectName}`}
        </div>

        {isCall ? (
          <div className="grid grid-cols-2 gap-1.5">
            {OUTCOME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setOutcome(opt.value)}
                className={cn(
                  "flex items-center justify-between rounded-md border border-border bg-surface px-2.5 py-2 text-left text-xs",
                  outcome === opt.value &&
                    "border-accent-line bg-accent-soft font-semibold text-primary",
                )}
              >
                {opt.label}
                <kbd className="rounded border border-border bg-background px-1 text-[10px] text-dim">
                  {opt.kbd}
                </kbd>
              </button>
            ))}
          </div>
        ) : null}

        {needsCallback ? (
          <Calendar
            mode="single"
            selected={callbackDate}
            onSelect={(d) => d && setCallbackDate(toCalendarDate(d))}
            className="rounded-md border border-border"
          />
        ) : null}

        <Textarea
          placeholder="Add a note…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-9 text-xs"
          rows={2}
        />

        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-dim">Saves & moves on</span>
          <Button size="sm" disabled={isCall && !outcome} onClick={save}>
            Save ⏎
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
