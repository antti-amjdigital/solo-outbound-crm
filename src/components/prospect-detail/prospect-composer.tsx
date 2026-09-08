"use client"

import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { addNoteAction, logAdHocActivityAction } from "@/actions/prospects"
import { cn } from "@/lib/utils"

type ActivityKind = "call" | "email" | "meeting"

const ACTIVITY_KINDS: { id: ActivityKind; label: string }[] = [
  { id: "call", label: "Call" },
  { id: "email", label: "Email" },
  { id: "meeting", label: "Meeting" },
]

export function ProspectComposer({ prospectId }: { prospectId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [expanded, setExpanded] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [kind, setKind] = useState<ActivityKind>("call")
  const [body, setBody] = useState("")
  const [pinned, setPinned] = useState(false)
  const [activityBody, setActivityBody] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function saveNote() {
    const trimmed = body.trim()
    if (!trimmed) return
    start(async () => {
      const res = await addNoteAction(prospectId, trimmed, { pinned })
      if (!res.ok) toast.error(res.error)
      else {
        setBody("")
        setPinned(false)
        setExpanded(false)
        toast.success(pinned ? "Note pinned" : "Note added")
        router.refresh()
      }
    })
  }

  function saveActivity() {
    start(async () => {
      const res = await logAdHocActivityAction({
        prospectId,
        kind,
        note: activityBody.trim() || undefined,
      })
      if (!res.ok) toast.error(res.error)
      else {
        setActivityBody("")
        setActivityOpen(false)
        toast.success("Activity logged")
        router.refresh()
      }
    })
  }

  function expand() {
    setExpanded(true)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  function collapseIfEmpty(relatedTarget: EventTarget | null) {
    if (!body.trim() && !(relatedTarget instanceof Element && relatedTarget.closest("[data-composer]"))) {
      setExpanded(false)
      setPinned(false)
    }
  }

  return (
    <>
      <div className="flex items-start gap-2">
        {expanded ? (
          <div className="min-w-0 flex-1 space-y-2">
            <Textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder="Add a note…"
              className="resize-none text-[13px]"
              onBlur={(e) => collapseIfEmpty(e.relatedTarget)}
            />
            <div
              className="flex items-center justify-between gap-2"
              data-composer
            >
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#64748b]">
                <Checkbox
                  checked={pinned}
                  onCheckedChange={(v) => setPinned(v === true)}
                />
                Pin to profile
              </label>
              <Button
                size="sm"
                disabled={pending || !body.trim()}
                onClick={saveNote}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <Input
            ref={inputRef}
            readOnly
            onFocus={expand}
            placeholder="Add a note…"
            className="h-[38px] flex-1 cursor-text text-[13px]"
          />
        )}
        {!expanded && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-[38px] shrink-0"
            onClick={() => setActivityOpen(true)}
          >
            + Log activity
          </Button>
        )}
      </div>

      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
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
            value={activityBody}
            onChange={(e) => setActivityBody(e.target.value)}
            rows={3}
            placeholder={
              kind === "meeting"
                ? "Meeting details (optional)…"
                : kind === "email"
                  ? "What did you send? (optional)…"
                  : "Call notes (optional)…"
            }
            className="resize-none text-[13px]"
          />
          <p className="text-[11px] text-[#94a3b8]">
            {kind === "meeting"
              ? "Marks prospect as meeting booked and stops the sequence."
              : "Logged to history — does not complete the focus task."}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivityOpen(false)}>
              Cancel
            </Button>
            <Button disabled={pending} onClick={saveActivity}>
              Save {kind}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
