"use client"

import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"
import type { Note } from "@prisma/client"
import { Pin, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  addNoteAction,
  deleteNoteAction,
  setNotePinnedAction,
} from "@/actions/notes"
import { useModEnterSubmit } from "@/hooks/use-mod-enter"
import { waitForUndo } from "@/lib/undo-toast"

const TZ = "Europe/Helsinki"

const HOVER_ICON_BTN =
  "flex size-7 items-center justify-center rounded-md text-[#94a3b8] opacity-0 transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f46e5]/30 group-hover:opacity-100 disabled:opacity-40"

function formatNoteTime(d: Date): string {
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  })
}

export function NotesSidebar({
  prospectId,
  notes,
}: {
  prospectId: string
  notes: Note[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [expanded, setExpanded] = useState(false)
  const [body, setBody] = useState("")
  const [pinned, setPinned] = useState(false)
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const suppressBlurRef = useRef(false)

  const hasPinned = notes.some((n) => n.pinned)
  const visible = notes.filter((n) => !n.pinned && !hiddenIds.has(n.id))

  function setHidden(noteId: string, on: boolean) {
    setHiddenIds((prev) => {
      const next = new Set(prev)
      if (on) next.add(noteId)
      else next.delete(noteId)
      return next
    })
  }

  function saveNote() {
    const trimmed = body.trim()
    if (!trimmed || pending) return
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

  function pinNote(noteId: string) {
    if (pending) return
    start(async () => {
      const res = await setNotePinnedAction(noteId, prospectId, true)
      if (!res.ok) toast.error(res.error)
      else {
        toast.success(hasPinned ? "Pinned — replaced previous" : "Note pinned")
        router.refresh()
      }
    })
  }

  /** Hide immediately; only delete once the Undo toast has passed. */
  function removeNote(noteId: string) {
    if (hiddenIds.has(noteId)) return
    setHidden(noteId, true)
    start(async () => {
      const commit = await waitForUndo("Note removed")
      if (!commit) {
        setHidden(noteId, false)
        return
      }
      const res = await deleteNoteAction(noteId, prospectId)
      if (!res.ok) {
        setHidden(noteId, false)
        toast.error(res.error)
      } else {
        router.refresh()
      }
    })
  }

  useModEnterSubmit(saveNote, expanded)

  function expand() {
    suppressBlurRef.current = true
    setExpanded(true)
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
      suppressBlurRef.current = false
    })
  }

  function collapseIfEmpty(relatedTarget: EventTarget | null) {
    if (suppressBlurRef.current) return
    if (
      !body.trim() &&
      !(
        relatedTarget instanceof Element &&
        relatedTarget.closest("[data-notes-composer]")
      )
    ) {
      setExpanded(false)
      setPinned(false)
    }
  }

  return (
    <div className="rounded-xl border border-[#e8edf4] bg-white px-4 py-3">
      <div className="mb-2 text-[13px] font-semibold text-[#0f172a]">Notes</div>

      {expanded ? (
        <div className="space-y-2" data-notes-composer>
          <Textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Add a note…"
            className="resize-none text-[13px]"
            onBlur={(e) => collapseIfEmpty(e.relatedTarget)}
          />
          <div className="flex items-center justify-between gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[#64748b]">
              <Checkbox
                checked={pinned}
                onCheckedChange={(v) => setPinned(v === true)}
              />
              {pinned && hasPinned ? "Pin (replaces current)" : "Pin"}
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
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={expand}
          className="flex h-[38px] w-full items-center rounded-lg border border-input bg-transparent px-2.5 text-left text-[13px] text-muted-foreground transition-colors hover:bg-[#f8fafc] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Add a note…
        </button>
      )}

      {visible.length > 0 ? (
        <ul className="mt-3 divide-y divide-[#f1f5f9] border-t border-[#f1f5f9]">
          {visible.map((note) => (
            <li key={note.id} className="group relative py-2.5 pr-14">
              <div className="absolute top-2 right-0 flex items-center">
                <button
                  type="button"
                  aria-label="Pin note"
                  disabled={pending}
                  onClick={() => pinNote(note.id)}
                  className={`${HOVER_ICON_BTN} hover:bg-[#eef2ff] hover:text-[#4f46e5]`}
                >
                  <Pin className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Remove note"
                  onClick={() => removeNote(note.id)}
                  className={`${HOVER_ICON_BTN} hover:bg-[#fef2f2] hover:text-[#dc2626]`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#1e293b]">
                {note.body.trim() || "Note"}
              </p>
              <time
                dateTime={note.createdAt.toISOString()}
                className="mt-1 block text-[11px] tabular-nums text-[#94a3b8]"
              >
                {formatNoteTime(note.createdAt)}
              </time>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
