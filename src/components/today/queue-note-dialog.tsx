"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { addTimelineNoteAction } from "@/actions/notes"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useModEnterSubmit } from "@/hooks/use-mod-enter"

type Props = {
  open: boolean
  prospectId: string | null
  prospectName: string
  onOpenChange: (open: boolean) => void
}

export function QueueNoteDialog({
  open,
  prospectId,
  prospectName,
  onOpenChange,
}: Props) {
  const [note, setNote] = useState("")
  const [pending, startTransition] = useTransition()

  function save() {
    if (!prospectId || !note.trim()) return
    startTransition(async () => {
      const result = await addTimelineNoteAction(prospectId, note)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Note added")
      setNote("")
      onOpenChange(false)
    })
  }

  useModEnterSubmit(save, open)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setNote("")
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Note — {prospectName}</DialogTitle>
        </DialogHeader>
        <Textarea
          autoFocus
          placeholder="Add a note…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-24 text-sm"
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={save} disabled={pending || !note.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
