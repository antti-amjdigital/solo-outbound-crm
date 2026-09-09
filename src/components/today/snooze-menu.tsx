"use client"

import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  addBusinessDays,
  appToday,
  formatCalendarDate,
  toCalendarDate,
} from "@/lib/dates"
import { nextMonday } from "@/lib/queue-filters"

type Props = {
  taskId: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSnooze: (taskId: string, dueDate: string) => void
}

function weekday(date: Date): string {
  return date.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })
}

export function SnoozeMenu({ taskId, open, onOpenChange, onSnooze }: Props) {
  const [pickOpen, setPickOpen] = useState(false)
  // "+N days" means business days: a snoozed task never lands on a weekend.
  const today = appToday()
  const presets: { label: string; date: Date }[] = [
    { label: "+1 day", date: addBusinessDays(today, 1) },
    { label: "+3 days", date: addBusinessDays(today, 3) },
    { label: "Next Monday", date: nextMonday(today) },
  ]

  function snoozeTo(date: Date) {
    onSnooze(taskId, formatCalendarDate(toCalendarDate(date)))
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="inline-flex items-center text-[13px] text-[#64748b] hover:text-[#1e293b] focus-visible:ring-2 focus-visible:ring-[#4f46e5]/30 focus-visible:outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          }
        >
          Snooze ▾
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="min-w-40"
          onClick={(e) => e.stopPropagation()}
        >
          {presets.map((p) => (
            <DropdownMenuItem
              key={p.label}
              className="justify-between gap-4"
              onClick={() => snoozeTo(p.date)}
            >
              {p.label}
              {p.label !== "Next Monday" ? (
                <span className="text-[11px] text-[#94a3b8]">{weekday(p.date)}</span>
              ) : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setPickOpen(true)}>
            Pick a date…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover open={pickOpen} onOpenChange={setPickOpen}>
        <PopoverTrigger render={<span className="sr-only" />} />
        <PopoverContent
          align="end"
          className="w-auto p-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Calendar
            mode="single"
            onSelect={(d) => {
              if (!d) return
              setPickOpen(false)
              snoozeTo(d)
            }}
          />
        </PopoverContent>
      </Popover>
    </>
  )
}
