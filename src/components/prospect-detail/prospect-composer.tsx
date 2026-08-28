"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  addTimelineNoteAction,
  logAdHocActivityAction,
} from "@/actions/prospects"
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
  const [tab, setTab] = useState("note")
  const [kind, setKind] = useState<ActivityKind>("call")
  const [body, setBody] = useState("")

  function save() {
    const trimmed = body.trim()
    start(async () => {
      const res =
        tab === "note"
          ? await addTimelineNoteAction(prospectId, trimmed)
          : await logAdHocActivityAction({
              prospectId,
              kind,
              note: trimmed || undefined,
            })
      if (!res.ok) toast.error(res.error)
      else {
        setBody("")
        toast.success(tab === "note" ? "Note added" : "Activity logged")
        router.refresh()
      }
    })
  }

  return (
    <div className="bg-background">
      <Tabs value={tab} onValueChange={(v) => setTab(v ?? "note")}>
        <TabsList variant="line" className="h-9 w-full justify-start gap-0">
          <TabsTrigger
            value="note"
            className="flex-none rounded-none px-1 text-sm data-active:text-primary"
          >
            Add note
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="flex-none rounded-none px-3 text-sm data-active:text-primary"
          >
            Add activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="note" className="pt-3">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Note, @name…"
            className="resize-none"
          />
          <div className="mt-2.5 flex justify-end">
            <Button size="sm" disabled={pending || !body.trim()} onClick={save}>
              Save note
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="pt-3">
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {ACTIVITY_KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  kind === k.id
                    ? "border-accent-line bg-accent-soft text-primary"
                    : "border-border bg-background text-dim hover:text-foreground",
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
            placeholder={
              kind === "meeting"
                ? "Meeting details (optional)…"
                : kind === "email"
                  ? "What did you send? (optional)…"
                  : "Call notes (optional)…"
            }
            className="resize-none"
          />
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="text-[11px] text-dim">
              {kind === "meeting"
                ? "Marks prospect as meeting booked and stops the sequence."
                : "Logged to history — does not complete the focus task."}
            </span>
            <Button size="sm" disabled={pending} onClick={save}>
              Save {kind}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
