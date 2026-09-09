"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckIcon, UserPlusIcon, XIcon } from "lucide-react"
import { toast } from "sonner"
import { enrollProspectsAction } from "@/actions/enrollments"
import {
  searchProspectsForTaskAction,
  type TaskProspectOption,
} from "@/actions/prospects"
import { prospectChipLabel } from "@/components/prospect-detail/add-task-prospect-picker"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useModEnterSubmit } from "@/hooks/use-mod-enter"
import { cn } from "@/lib/utils"
import { editControl, focusRing, primaryButton, secondaryButton } from "./styles"

export function EnrollProspectsDialog({
  sequenceId,
  sequenceName,
  hasUnsavedChanges,
}: {
  sequenceId: string
  sequenceName: string
  hasUnsavedChanges: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<TaskProspectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<TaskProspectOption[]>([])
  const [spreadDays, setSpreadDays] = useState("1")
  const [pending, start] = useTransition()
  const trimmed = query.trim()

  useEffect(() => {
    if (!trimmed) return
    const t = setTimeout(async () => {
      setLoading(true)
      const res = await searchProspectsForTaskAction(trimmed)
      setLoading(false)
      if (res.ok && "prospects" in res) setResults(res.prospects)
    }, 200)
    return () => clearTimeout(t)
  }, [trimmed])

  function reset() {
    setQuery("")
    setResults([])
    setSelected([])
    setSpreadDays("1")
  }

  function toggle(p: TaskProspectOption) {
    setSelected((prev) =>
      prev.some((s) => s.id === p.id)
        ? prev.filter((s) => s.id !== p.id)
        : [...prev, p],
    )
  }

  function enroll() {
    start(async () => {
      const res = await enrollProspectsAction({
        prospectIds: selected.map((s) => s.id),
        sequenceId,
        spreadDays: Number(spreadDays) || 1,
      })
      if (!res.ok) return void toast.error(res.error)
      toast.success(
        `Enrolled ${selected.length} prospect${selected.length === 1 ? "" : "s"} in ${sequenceName}`,
      )
      setOpen(false)
      reset()
      router.refresh()
    })
  }

  useModEnterSubmit(enroll, open && selected.length > 0 && !pending)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger
        render={<Button className={cn(primaryButton, focusRing)} />}
      >
        <UserPlusIcon className="size-4" />
        Enroll prospects
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enroll prospects in {sequenceName}</DialogTitle>
          <DialogDescription>
            First step is scheduled from today. Prospects already in a running
            sequence are skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-1">
          {selected.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Selected prospects">
              {selected.map((p) => (
                <li
                  key={p.id}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-stats-indigo-200 bg-seq-chip-indigo px-2.5 py-1 text-[13px] font-medium text-stats-indigo-900"
                >
                  <span className="truncate">{prospectChipLabel(p)}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${prospectChipLabel(p)}`}
                    className={cn(
                      "shrink-0 rounded-full p-0.5 hover:bg-stats-indigo-200/60",
                      focusRing,
                    )}
                    onClick={() => toggle(p)}
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            autoComplete="off"
            aria-label="Search prospects"
            placeholder="Search by name, company, or phone…"
            className={cn(editControl, "h-10 px-3 text-sm focus-visible:border-stats-indigo-700 focus-visible:ring-stats-indigo-700/30")}
          />

          <div
            aria-label="Search results"
            className="max-h-56 overflow-y-auto rounded-lg border border-stats-picker-line"
          >
            {!trimmed || loading || results.length === 0 ? (
              <p className="px-3 py-3 text-[13px] text-stats-muted">
                {!trimmed
                  ? "Type to search your prospects."
                  : loading
                    ? "Searching…"
                    : "No matches"}
              </p>
            ) : (
              results.map((p) => {
                const on = selected.some((s) => s.id === p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(p)}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] hover:bg-stats-canvas",
                      focusRing,
                      "focus-visible:ring-inset",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded border",
                        on
                          ? "border-stats-indigo-700 bg-stats-indigo-700 text-white"
                          : "border-stats-picker-line bg-white",
                      )}
                      aria-hidden
                    >
                      {on && <CheckIcon className="size-3" />}
                    </span>
                    <span className="truncate font-medium text-stats-ink">
                      {prospectChipLabel(p)}
                    </span>
                    {p.phone && (
                      <span className="ml-auto shrink-0 text-stats-muted tabular-nums">
                        {p.phone}
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>

          <label className="grid gap-1.5 text-xs font-medium text-stats-secondary">
            Spread over (business days)
            <Input
              type="number"
              min={1}
              max={30}
              value={spreadDays}
              onChange={(e) => setSpreadDays(e.target.value)}
              className={cn(editControl, "w-32 px-3 text-sm tabular-nums focus-visible:border-stats-indigo-700 focus-visible:ring-stats-indigo-700/30")}
            />
          </label>

          {hasUnsavedChanges && (
            <p className="text-xs text-warn">
              Unsaved step edits aren&apos;t used — enrollment runs the last saved version.
            </p>
          )}
        </div>

        <DialogFooter>
          <DialogClose
            disabled={pending}
            render={
              <Button
                variant="outline"
                className={cn(secondaryButton, focusRing)}
              />
            }
          >
            Cancel
          </DialogClose>
          <Button
            disabled={pending || selected.length === 0}
            className={cn(primaryButton, focusRing)}
            onClick={enroll}
          >
            {pending ? "Enrolling…" : `Enroll ${selected.length || ""}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
