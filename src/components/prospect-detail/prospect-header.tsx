"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { ProspectStatus } from "@prisma/client"
import { ChevronDown, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  pauseEnrollmentAction,
  resumeEnrollmentAction,
  stopEnrollmentAction,
} from "@/actions/enrollments"
import {
  setProspectStatusAction,
  theyRepliedAction,
} from "@/actions/prospects"
import { useModEnterSubmit } from "@/hooks/use-mod-enter"
import {
  REMOVE_FROM_SEQUENCE_LABEL,
  STATUS_LABEL,
} from "@/lib/prospect-filters"
import type { ProspectDetail } from "@/lib/prospect-detail-query"

function prospectInitials(firstName: string, lastName: string | null): string {
  const first = firstName.charAt(0).toUpperCase()
  const last = lastName?.charAt(0).toUpperCase() ?? ""
  return first + last
}

function addedMeta(prospect: ProspectDetail["prospect"]): string {
  const source =
    prospect.source === "manual" || !prospect.source
      ? "manually"
      : prospect.source
  const date = prospect.createdAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Helsinki",
  })
  return `Added ${source} · ${date}`
}

type Props = {
  data: ProspectDetail
  name: string
  enrollOpen: boolean
  onEnrollOpenChange: (open: boolean) => void
}

export function ProspectHeader({
  data,
  name,
  enrollOpen,
  onEnrollOpenChange,
}: Props) {
  const { prospect, sequences, enrollment } = data
  const router = useRouter()
  const [pending, start] = useTransition()
  const [sequenceId, setSequenceId] = useState(sequences[0]?.id ?? "")

  function refresh(msg: string) {
    toast.success(msg)
    router.refresh()
  }

  function runEnrollmentAction(
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okMsg: string,
  ) {
    start(async () => {
      const res = await fn()
      if (!res.ok) toast.error(res.error)
      else refresh(okMsg)
    })
  }

  const enrolled = enrollment != null

  function enroll() {
    if (pending || !sequenceId) return
    start(async () => {
      const res = await enrollProspectsAction({
        prospectIds: [prospect.id],
        sequenceId,
        spreadDays: 1,
      })
      if (!res.ok) toast.error(res.error)
      else {
        onEnrollOpenChange(false)
        refresh("Enrolled")
      }
    })
  }

  useModEnterSubmit(enroll, enrollOpen)

  return (
    <>
      <header className="flex shrink-0 items-center justify-between border-b border-[#e8edf4] bg-white px-8 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#eef2ff] text-sm font-semibold text-[#4f46e5]"
            aria-hidden
          >
            {prospectInitials(prospect.firstName, prospect.lastName)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[20px] font-bold text-[#0f172a]">{name}</h1>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      className="inline-flex items-center gap-0.5 rounded-full border border-[#c7d2fe] bg-[#eef2ff] px-2 py-0.5 text-[11px] font-semibold text-[#4f46e5]"
                    />
                  }
                >
                  {STATUS_LABEL[prospect.status]}
                  <ChevronDown className="size-3 opacity-70" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {Object.values(ProspectStatus).map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() =>
                        start(async () => {
                          const res = await setProspectStatusAction(
                            [prospect.id],
                            s,
                          )
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
            </div>
            <p className="text-[13px] text-[#94a3b8]">{addedMeta(prospect)}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="More actions"
                  className="flex size-[38px] items-center justify-center rounded-md border border-[#e2e8f0] text-[#64748b] transition-colors hover:bg-[#f8fafc] hover:text-[#0f172a]"
                />
              }
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEnrollOpenChange(true)}>
                {enrolled ? "Change sequence" : "Enroll in sequence"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {enrollment?.state === "RUNNING" && (
                <DropdownMenuItem
                  onClick={() =>
                    runEnrollmentAction(
                      () => pauseEnrollmentAction(enrollment.id),
                      "Paused",
                    )
                  }
                >
                  Pause sequence
                </DropdownMenuItem>
              )}
              {enrollment?.state === "PAUSED" && (
                <DropdownMenuItem
                  onClick={() =>
                    runEnrollmentAction(
                      () => resumeEnrollmentAction(enrollment.id),
                      "Resumed",
                    )
                  }
                >
                  Resume sequence
                </DropdownMenuItem>
              )}
              {enrollment && enrollment.state !== "FINISHED" && (
                <DropdownMenuItem
                  onClick={() =>
                    runEnrollmentAction(
                      () => stopEnrollmentAction(enrollment.id),
                      "Stopped",
                    )
                  }
                >
                  Stop sequence
                </DropdownMenuItem>
              )}
              {(enrollment?.state === "RUNNING" ||
                enrollment?.state === "PAUSED") && <DropdownMenuSeparator />}
              <DropdownMenuItem
                variant="destructive"
                disabled={pending || !enrolled}
                onClick={() =>
                  start(async () => {
                    const res = await theyRepliedAction(prospect.id)
                    if (!res.ok) toast.error(res.error)
                    else refresh("Removed from sequence")
                  })
                }
              >
                {REMOVE_FROM_SEQUENCE_LABEL}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Dialog open={enrollOpen} onOpenChange={onEnrollOpenChange}>
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
            <Button variant="outline" onClick={() => onEnrollOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || !sequenceId}
              onClick={enroll}
            >
              Enroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
