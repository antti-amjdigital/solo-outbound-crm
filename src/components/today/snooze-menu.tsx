"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
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
  appToday,
  formatCalendarDate,
  toCalendarDate,
} from "@/lib/dates"
import { addCalendarDays, nextMonday } from "@/lib/queue-filters"

type Props = {
  taskId: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSnooze: (taskId: string, dueDate: string) => void
}

export function SnoozeMenu({ taskId, open, onOpenChange, onSnooze }: Props) {
  const [pickOpen, setPickOpen] = useState(false)

  function snoozeTo(date: Date) {
    onSnooze(taskId, formatCalendarDate(toCalendarDate(date)))
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
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
          <DropdownMenuItem onClick={() => snoozeTo(addCalendarDays(appToday(), 1))}>
            +1 day
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => snoozeTo(addCalendarDays(appToday(), 3))}>
            +3 days
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => snoozeTo(nextMonday())}>
            Next Monday
          </DropdownMenuItem>
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
