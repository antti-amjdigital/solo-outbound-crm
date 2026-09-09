"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Pin } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  setNotePinnedAction,
  upsertPinnedNoteAction,
} from "@/actions/notes"
import { useModEnterSubmit } from "@/hooks/use-mod-enter"
import type { Note } from "@prisma/client"

const LINK_BTN = "text-[12px] font-medium text-[#4f46e5] hover:underline"

export function PinnedNoteSection({
  prospectId,
  notes,
}: {
  prospectId: string
  notes: Note[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [editing, setEditing] = useState(false)
  const pinned = notes.find((n) => n.pinned)
  const [body, setBody] = useState(pinned?.body ?? "")

  function save() {
    if (!pinned || pending) return
    start(async () => {
      const res = await upsertPinnedNoteAction(prospectId, body, pinned.id)
      if (!res.ok) toast.error(res.error)
      else {
        setEditing(false)
        toast.success("Saved")
        router.refresh()
      }
    })
  }

  function unpin() {
    if (!pinned || pending) return
    start(async () => {
      const res = await setNotePinnedAction(pinned.id, prospectId, false)
      if (!res.ok) toast.error(res.error)
      else {
        toast.success("Unpinned — kept in Notes")
        router.refresh()
      }
    })
  }

  useModEnterSubmit(save, editing)

  if (!pinned) return null

  return (
    <div className="rounded-xl border border-[#e8edf4] bg-white px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#0f172a]">
          <Pin className="size-3.5 text-[#94a3b8]" />
          Pinned
        </span>
        <div className="flex items-center gap-3">
          {!editing ? (
            <button
              type="button"
              className={LINK_BTN}
              disabled={pending}
              onClick={unpin}
            >
              Unpin
            </button>
          ) : null}
          <button
            type="button"
            className={LINK_BTN}
            onClick={() => {
              if (editing) {
                setBody(pinned.body)
                setEditing(false)
              } else {
                setBody(pinned.body)
                setEditing(true)
              }
            }}
          >
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>
      </div>
      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="text-[13px]"
          />
          <Button size="sm" disabled={pending} onClick={save}>
            Save
          </Button>
        </div>
      ) : (
        <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#1e293b]">
          {pinned.body}
        </div>
      )}
    </div>
  )
}
