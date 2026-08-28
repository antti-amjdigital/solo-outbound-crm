"use client"

import { CheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SaveBar({
  changes,
  saving,
  onDiscard,
  onSave,
}: {
  changes: string[]
  saving: boolean
  onDiscard: () => void
  onSave: () => void
}) {
  const dirty = changes.length > 0

  return (
    <div className="z-10 flex shrink-0 items-center justify-between gap-3 border-t border-accent-line bg-accent-soft px-4 py-2.5 shadow-[0_-4px_14px_rgba(16,23,42,0.09)]">
      <div className="flex min-w-0 items-center gap-2.5 text-xs">
        <span
          className={
            dirty
              ? "size-2 shrink-0 rounded-full bg-primary"
              : "size-2 shrink-0 rounded-full bg-dim/40"
          }
        />
        {dirty ? (
          <>
            <b className="shrink-0 text-ink">
              {changes.length} unsaved change{changes.length === 1 ? "" : "s"}
            </b>
            <span className="truncate text-dim">{changes.join(" · ")}</span>
          </>
        ) : (
          <span className="text-dim">All changes saved</span>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={!dirty || saving}
          onClick={onDiscard}
        >
          Discard
        </Button>
        <Button
          type="button"
          size="lg"
          disabled={!dirty || saving}
          onClick={onSave}
        >
          <CheckIcon className="size-3.5" />
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  )
}
