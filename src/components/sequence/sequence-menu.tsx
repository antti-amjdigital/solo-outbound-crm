"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  CopyIcon,
  MoreHorizontalIcon,
  PauseIcon,
  PlayIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"
import {
  deleteSequenceAction,
  duplicateSequenceAction,
  setSequenceActiveAction,
} from "@/actions/sequences"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { focusRing } from "./styles"

/** Header "⋯" — pause/resume, duplicate, delete (with confirmation). */
export function SequenceMenu({
  sequenceId,
  name,
  isActive,
}: {
  sequenceId: string
  name: string
  isActive: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)

  function toggleActive() {
    startTransition(async () => {
      const res = await setSequenceActiveAction({
        sequenceId,
        isActive: !isActive,
      })
      if (!res.ok) return void toast.error(res.error)
      toast.success(isActive ? "Sequence paused" : "Sequence resumed")
      router.refresh()
    })
  }

  function duplicate() {
    startTransition(async () => {
      const res = await duplicateSequenceAction({ sequenceId })
      if (!res.ok) return void toast.error(res.error)
      toast.success("Sequence duplicated")
      router.push(`/sequences/${res.id}`)
    })
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteSequenceAction({ sequenceId })
      if (!res.ok) return void toast.error(res.error)
      setConfirmDelete(false)
      toast.success("Sequence deleted")
      router.push("/sequences/default")
      router.refresh()
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Sequence actions"
          disabled={pending}
          className={cn(
            "flex size-[38px] items-center justify-center rounded-lg border border-stats-picker-line bg-white text-stats-secondary hover:bg-stats-canvas aria-expanded:bg-stats-canvas disabled:opacity-50",
            focusRing,
          )}
        >
          <MoreHorizontalIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem onClick={toggleActive}>
            {isActive ? <PauseIcon /> : <PlayIcon />}
            {isActive ? "Pause sequence" : "Resume sequence"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={duplicate}>
            <CopyIcon /> Duplicate sequence
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2Icon /> Delete sequence
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete “{name}”?</DialogTitle>
            <DialogDescription>
              The sequence and its steps are removed for good. Sequences that
              prospects have been enrolled in can&apos;t be deleted — pause
              those instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" disabled={pending} onClick={remove}>
              {pending ? "Deleting…" : "Delete sequence"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
