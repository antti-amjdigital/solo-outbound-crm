"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ProspectStatus } from "@prisma/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { enrollProspectsAction } from "@/actions/enrollments"
import {
  deleteProspectsAction,
  setProspectStatusAction,
} from "@/actions/prospects"
import { STATUS_LABEL } from "@/lib/prospect-filters"

type Props = {
  selectedIds: string[]
  sequences: { id: string; name: string }[]
  onClear: () => void
  enrollOpen: boolean
  onEnrollOpenChange: (open: boolean) => void
}

const secondaryBtn =
  "h-[38px] rounded-lg border-stats-picker-line bg-white px-4 text-[13px] font-semibold text-stats-secondary hover:bg-stats-canvas"

export function BulkBar({
  selectedIds,
  sequences,
  onClear,
  enrollOpen,
  onEnrollOpenChange,
}: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [sequenceId, setSequenceId] = useState(sequences[0]?.id ?? "")
  const [spreadDays, setSpreadDays] = useState("1")

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    start(async () => {
      const res = await fn()
      if (!res.ok) toast.error(res.error ?? "Failed")
      else {
        toast.success(okMsg)
        onClear()
        onEnrollOpenChange(false)
        router.refresh()
      }
    })
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-stats-indigo-200 bg-[#eef2ff] px-4 py-2.5">
        <b className="text-[13px] font-semibold text-stats-indigo-700">
          {selectedIds.length} selected
        </b>
        <Button
          variant="outline"
          disabled={pending}
          className={secondaryBtn}
          onClick={() => onEnrollOpenChange(true)}
        >
          Enroll in sequence
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" disabled={pending} className={secondaryBtn} />
            }
          >
            Change status
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {Object.values(ProspectStatus).map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() =>
                  run(
                    () => setProspectStatusAction(selectedIds, s),
                    `Marked ${STATUS_LABEL[s]}`,
                  )
                }
              >
                {STATUS_LABEL[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="destructive"
          disabled={pending}
          className="h-[38px] rounded-lg px-4 text-[13px] font-semibold"
          onClick={() =>
            run(() => deleteProspectsAction(selectedIds), "Deleted")
          }
        >
          Delete
        </Button>
        <Button
          variant="ghost"
          className="ml-auto h-[38px] text-[13px] font-semibold text-stats-secondary"
          onClick={onClear}
        >
          Clear selection
        </Button>
      </div>

      <Dialog open={enrollOpen} onOpenChange={onEnrollOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enroll {selectedIds.length} prospects</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
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
            <label className="grid gap-1.5 text-xs font-medium">
              Spread over (business days)
              <Input
                type="number"
                min={1}
                max={30}
                value={spreadDays}
                onChange={(e) => setSpreadDays(e.target.value)}
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onEnrollOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || !sequenceId}
              className="bg-stats-indigo-700 hover:bg-stats-indigo-900"
              onClick={() => {
                run(async () => {
                  const res = await enrollProspectsAction({
                    prospectIds: selectedIds,
                    sequenceId,
                    spreadDays: Number(spreadDays) || 1,
                  })
                  return res
                }, `Enrolled ${selectedIds.length}`)
              }}
            >
              Enroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
