"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ActivityType, CallOutcome, type Activity } from "@prisma/client"
import { toast } from "sonner"
import { updateLoggedActivityAction } from "@/actions/prospects"
import { OUTCOME_LABEL, OUTCOME_OPTIONS } from "@/components/today/labels"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useModEnterSubmit } from "@/hooks/use-mod-enter"

export function HistoryActivityEditDialog({
  activity,
  prospectId,
  title,
  open,
  onOpenChange,
}: {
  activity: Activity
  prospectId: string
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const isCall = activity.type === ActivityType.CALL
  const [note, setNote] = useState(activity.note ?? "")
  const [outcome, setOutcome] = useState<CallOutcome | null>(
    activity.outcome ?? null,
  )

  function save() {
    if (pending) return
    if (isCall && activity.outcome && !outcome) {
      toast.error("Pick an outcome")
      return
    }
    start(async () => {
      const res = await updateLoggedActivityAction({
        activityId: activity.id,
        prospectId,
        note,
        outcome: isCall ? (outcome ?? undefined) : undefined,
      })
      if (!res.ok) toast.error(res.error)
      else {
        onOpenChange(false)
        toast.success("Activity updated")
        router.refresh()
      }
    })
  }

  useModEnterSubmit(save, open && !pending)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit activity</DialogTitle>
        </DialogHeader>
        <p className="text-[13px] text-[#64748b]">{title}</p>
        {isCall && (
          <label className="grid gap-1.5 text-xs font-medium text-[#64748b]">
            Outcome
            <Select
              value={outcome ?? ""}
              onValueChange={(v) => setOutcome((v as CallOutcome) || null)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick outcome">
                  {outcome ? OUTCOME_LABEL[outcome] : "Pick outcome"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {OUTCOME_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          autoFocus
          rows={4}
          aria-label="Note"
          placeholder="Notes…"
          className="resize-none text-[13px]"
        />
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            disabled={pending || (isCall && Boolean(activity.outcome) && !outcome)}
            onClick={save}
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
