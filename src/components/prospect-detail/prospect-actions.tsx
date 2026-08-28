"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { ProspectStatus } from "@prisma/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
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
import { enrollProspectsAction } from "@/actions/enrollments"
import {
  setProspectStatusAction,
  theyRepliedAction,
} from "@/actions/prospects"
import { STATUS_LABEL } from "@/lib/prospect-filters"

type Props = {
  prospectId: string
  sequences: { id: string; name: string }[]
}

export function ProspectActions({ prospectId, sequences }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [sequenceId, setSequenceId] = useState(sequences[0]?.id ?? "")

  function refresh(msg: string) {
    toast.success(msg)
    router.refresh()
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await theyRepliedAction(prospectId)
            if (!res.ok) toast.error(res.error)
            else refresh("Marked reply — enrollment paused")
          })
        }
      >
        They replied
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button size="sm" variant="outline" />}>
          Status
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {Object.values(ProspectStatus).map((s) => (
            <DropdownMenuItem
              key={s}
              onClick={() =>
                start(async () => {
                  const res = await setProspectStatusAction([prospectId], s)
                  if (!res.ok) toast.error(res.error)
                  else refresh(`Status → ${STATUS_LABEL[s]}`)
                })
              }
            >
              {STATUS_LABEL[s]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        size="sm"
        variant="outline"
        className="ml-auto"
        onClick={() => setEnrollOpen(true)}
      >
        Enroll / change
      </Button>

      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enroll in sequence</DialogTitle>
          </DialogHeader>
          <label className="grid gap-1.5 text-xs font-medium">
            Sequence
            <Select
              value={sequenceId}
              onValueChange={(v) => setSequenceId(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick sequence">
                  {sequences.find((s) => s.id === sequenceId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {sequences.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <p className="text-[11px] text-dim">
            Fails if they already have a running enrollment.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || !sequenceId}
              onClick={() =>
                start(async () => {
                  const res = await enrollProspectsAction({
                    prospectIds: [prospectId],
                    sequenceId,
                    spreadDays: 1,
                  })
                  if (!res.ok) toast.error(res.error)
                  else {
                    setEnrollOpen(false)
                    refresh("Enrolled")
                  }
                })
              }
            >
              Enroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
