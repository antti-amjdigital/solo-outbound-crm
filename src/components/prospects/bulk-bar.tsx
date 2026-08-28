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
}

export function BulkBar({ selectedIds, sequences, onClear }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [sequenceId, setSequenceId] = useState(sequences[0]?.id ?? "")
  const [spreadDays, setSpreadDays] = useState("1")

  if (selectedIds.length === 0) return null

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    start(async () => {
      const res = await fn()
      if (!res.ok) toast.error(res.error ?? "Failed")
      else {
        toast.success(okMsg)
        onClear()
        router.refresh()
      }
    })
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-accent-line bg-accent-soft/70 px-4 py-2">
        <b className="text-sm">{selectedIds.length} selected</b>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => setEnrollOpen(true)}
        >
          Enroll in sequence
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button size="sm" variant="outline" disabled={pending} />}
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
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() =>
            run(() => deleteProspectsAction(selectedIds), "Deleted")
          }
        >
          Delete
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          onClick={onClear}
        >
          Clear selection
        </Button>
      </div>

      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enroll {selectedIds.length} prospects</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <label className="grid gap-1.5 text-xs font-medium">
              Sequence
              <Select value={sequenceId} onValueChange={(v) => setSequenceId(v ?? "")}>
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
            <Button variant="outline" onClick={() => setEnrollOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || !sequenceId}
              onClick={() => {
                run(async () => {
                  const res = await enrollProspectsAction({
                    prospectIds: selectedIds,
                    sequenceId,
                    spreadDays: Number(spreadDays) || 1,
                  })
                  if (res.ok) setEnrollOpen(false)
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
