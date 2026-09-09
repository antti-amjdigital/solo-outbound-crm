"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { logAdHocActivityAction } from "@/actions/prospects"
import { useModEnterSubmit } from "@/hooks/use-mod-enter"
import { cn } from "@/lib/utils"

type ActivityKind = "call" | "email" | "meeting"

const ACTIVITY_KINDS: { id: ActivityKind; label: string }[] = [
  { id: "call", label: "Call" },
  { id: "email", label: "Email" },
  { id: "meeting", label: "Meeting" },
]

export function LogActivityDialog({
  prospectId,
  open,
  onOpenChange,
}: {
  prospectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [kind, setKind] = useState<ActivityKind>("call")
  const [body, setBody] = useState("")

  function save() {
    if (pending) return
    start(async () => {
      const res = await logAdHocActivityAction({
        prospectId,
        kind,
        note: body.trim() || undefined,
      })
      if (!res.ok) toast.error(res.error)
      else {
        setBody("")
        onOpenChange(false)
        toast.success("Activity logged")
        router.refresh()
      }
    })
  }

  useModEnterSubmit(save, open)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setBody("")
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log activity</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          {ACTIVITY_KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                kind === k.id
                  ? "border-[#c7d2fe] bg-[#eef2ff] text-[#4f46e5]"
                  : "border-[#e8edf4] bg-white text-[#64748b] hover:text-[#0f172a]",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Notes…"
          className="resize-none text-[13px]"
        />
        {kind === "meeting" && (
          <p className="text-[11px] text-[#94a3b8]">
            Marks prospect as meeting booked and stops the sequence.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={pending} onClick={save}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
