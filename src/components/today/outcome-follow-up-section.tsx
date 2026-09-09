"use client"

import { useState } from "react"
import { CallOutcome } from "@prisma/client"
import { Calendar as CalendarPicker } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  addBusinessDays,
  appToday,
  formatCalendarDate,
  toCalendarDate,
} from "@/lib/dates"
import { nextMonday } from "@/lib/queue-filters"
import { cn } from "@/lib/utils"

export type FollowUpChoice = "none" | "tomorrow" | "in3days" | "nextweek" | "pick"

const OPTIONS: { value: FollowUpChoice; label: string }[] = [
  { value: "none", label: "None" },
  { value: "tomorrow", label: "Next day" },
  { value: "in3days", label: "In 3 days" },
  { value: "nextweek", label: "Next week" },
  { value: "pick", label: "Pick date…" },
]

/** Short weekday hint so "Next day" on a Friday visibly reads "Mon". */
export function weekdayHint(choice: FollowUpChoice, pickedDate: Date): string | null {
  if (choice === "none" || choice === "pick") return null
  return followUpToDate(choice, pickedDate).toLocaleDateString("en-GB", {
    weekday: "short",
    timeZone: "UTC",
  })
}

const DATE_RECT =
  "inline-flex h-8 items-center rounded-lg border border-[#e2e8f0] bg-white px-3 text-[13px] text-[#475569] transition-colors hover:bg-[#f8fafc] focus-visible:outline-none"

const DATE_RECT_SELECTED =
  "border-[1.5px] border-[#4f46e5] bg-white font-semibold text-[#4f46e5] shadow-[0_0_0_3px_rgba(79,70,229,0.10)]"

export function defaultFollowUp(outcome: CallOutcome): FollowUpChoice {
  if (
    outcome === CallOutcome.MEETING_BOOKED ||
    outcome === CallOutcome.NOT_INTERESTED ||
    outcome === CallOutcome.WRONG_NUMBER
  ) {
    return "none"
  }
  return "in3days"
}

export function followUpToDate(
  choice: FollowUpChoice,
  pickedDate: Date,
): Date {
  // "+N days" always means business days — a follow-up must never land on a
  // weekend (SPEC §7).
  const today = appToday()
  switch (choice) {
    case "tomorrow":
      return addBusinessDays(today, 1)
    case "in3days":
      return addBusinessDays(today, 3)
    case "nextweek":
      return nextMonday()
    case "pick":
      return toCalendarDate(pickedDate)
    default:
      return today
  }
}

export function followUpToIso(
  choice: FollowUpChoice,
  pickedDate: Date,
): string | undefined {
  if (choice === "none") return undefined
  return formatCalendarDate(followUpToDate(choice, pickedDate))
}

export function resolveNextDueDate(
  outcome: CallOutcome | null,
  followUp: FollowUpChoice | null,
  pickedDate: Date,
  hasActiveSequence: boolean,
): string | undefined {
  if (!outcome) return undefined
  if (hasActiveSequence) {
    if (outcome === CallOutcome.CALLBACK_REQUESTED) {
      return followUpToIso("in3days", pickedDate)
    }
    return undefined
  }
  const effective = followUp ?? defaultFollowUp(outcome)
  return followUpToIso(effective, pickedDate)
}

function CalendarLabelIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3 shrink-0 stroke-current text-[#94a3b8] [stroke-width:2] [fill:none]"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

type Props = {
  value: FollowUpChoice | null
  pickedDate: Date
  onChange: (value: FollowUpChoice) => void
  onPickDate: (date: Date) => void
}

export function OutcomeFollowUpSection({
  value,
  pickedDate,
  onChange,
  onPickDate,
}: Props) {
  const [pickOpen, setPickOpen] = useState(false)
  const hint = (choice: FollowUpChoice) => weekdayHint(choice, pickedDate)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <CalendarLabelIcon />
        <span className="text-[11px] font-bold tracking-[0.8px] text-[#94a3b8] uppercase">
          Next follow-up
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) =>
          opt.value === "pick" ? (
            <Popover key={opt.value} open={pickOpen} onOpenChange={setPickOpen}>
              <PopoverTrigger
                render={
                  <button
                    type="button"
                    className={cn(
                      DATE_RECT,
                      value === "pick" && DATE_RECT_SELECTED,
                    )}
                    onClick={() => onChange("pick")}
                  />
                }
              >
                {opt.label}
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-auto p-2"
                onClick={(e) => e.stopPropagation()}
              >
                <CalendarPicker
                  mode="single"
                  selected={pickedDate}
                  onSelect={(d) => {
                    if (!d) return
                    onPickDate(toCalendarDate(d))
                    onChange("pick")
                    setPickOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
          ) : (
            <button
              key={opt.value}
              type="button"
              className={cn(
                DATE_RECT,
                "gap-1.5",
                value === opt.value && DATE_RECT_SELECTED,
              )}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
              {hint(opt.value) ? (
                <span
                  className={cn(
                    "text-[11px] font-normal",
                    value === opt.value ? "text-[#4f46e5]/70" : "text-[#94a3b8]",
                  )}
                >
                  {hint(opt.value)}
                </span>
              ) : null}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
