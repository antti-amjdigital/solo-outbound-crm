"use client"

import { StepType } from "@prisma/client"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { focusRing } from "./styles"
import { MERGE_TAGS, contentNoun } from "./types"

export function TemplatePanel({
  type,
  template,
  onChange,
}: {
  type: StepType
  template: string | null
  onChange: (template: string) => void
}) {
  const isEmail = type === StepType.EMAIL || type === StepType.EMAIL_REPLY
  const noun = contentNoun(type)
  const title = `${noun[0].toUpperCase()}${noun.slice(1)}`

  return (
    <div className="mt-3.5 border-t border-stats-grid pt-3.5">
      <p className="mb-2 text-xs text-stats-muted">
        {title} — copied to the clipboard when you open this task
      </p>
      <Textarea
        value={template ?? ""}
        onChange={(e) => onChange(e.target.value)}
        aria-label={title}
        className="min-h-[96px] rounded-lg border-stats-picker-line text-[13px] text-stats-ink focus-visible:border-stats-indigo-700 focus-visible:ring-stats-indigo-700/30"
        placeholder={
          isEmail ? "Subject: …\n\nHei {{first_name}},…" : "Talking points…"
        }
      />
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-stats-muted">Insert</span>
        {MERGE_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onChange(`${template ?? ""}${tag}`)}
            className={cn(
              "rounded-md border border-stats-indigo-200 bg-seq-chip-indigo px-1.5 py-0.5 font-mono text-[11px] text-stats-indigo-700 tabular-nums hover:bg-stats-indigo-200/40",
              focusRing,
            )}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  )
}
