"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Props = {
  open: boolean
  count: number
  pending: boolean
  onOpenChange: (open: boolean) => void
  onDelete: () => void
  onMarkDead: () => void
}

/** Confirmation before a hard delete — history and notes go with the prospect. */
export function DeleteProspectsDialog({
  open,
  count,
  pending,
  onOpenChange,
  onDelete,
  onMarkDead,
}: Props) {
  const noun = count === 1 ? "prospect" : "prospects"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Delete {count} {noun}?
          </DialogTitle>
          <DialogDescription>
            Their call history, notes and open tasks are deleted with them.
            This can&apos;t be undone. If they asked not to be contacted,
            marking them Dead keeps the record so they aren&apos;t re-imported.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            disabled={pending}
            className="h-[38px] rounded-lg border-stats-picker-line bg-white px-4 text-[13px] font-semibold text-stats-secondary hover:bg-stats-canvas"
            onClick={onMarkDead}
          >
            Mark Dead instead
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" disabled={pending} onClick={onDelete}>
              Delete {count}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
