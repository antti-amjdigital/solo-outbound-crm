"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { focusRing, primaryButton, secondaryButton } from "./styles"

/**
 * Sits at the bottom of the editor column (inside <main>), so it never
 * overlaps the nav rail. Exactly two states: saved, or unsaved with actions.
 */
export function SaveBar({
  dirty,
  saving,
  onDiscard,
  onSave,
}: {
  dirty: boolean
  saving: boolean
  onDiscard: () => void
  onSave: () => void
}) {
  return (
    <div className="flex min-h-[66px] shrink-0 items-center gap-3 border-t border-stats-card-line bg-white px-8 py-3.5">
      {dirty ? (
        <>
          <span className="text-[13px] text-stats-secondary">Unsaved changes</span>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              disabled={saving}
              onClick={onDiscard}
              className={cn(secondaryButton, focusRing)}
            >
              Discard
            </Button>
            <Button
              disabled={saving}
              onClick={onSave}
              className={cn(primaryButton, focusRing)}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </>
      ) : (
        <span className="text-[13px] text-stats-muted">All changes saved</span>
      )}
    </div>
  )
}
