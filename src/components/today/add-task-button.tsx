"use client"

import { useState } from "react"
import { AddTaskDialog } from "@/components/prospect-detail/add-task-dialog"

export function AddTaskButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-[38px] shrink-0 items-center rounded-lg bg-[#4f46e5] px-4 text-[13px] font-medium text-white hover:bg-[#4338ca] focus-visible:ring-2 focus-visible:ring-[#4f46e5]/40 focus-visible:outline-none"
      >
        Add task
      </button>
      <AddTaskDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
