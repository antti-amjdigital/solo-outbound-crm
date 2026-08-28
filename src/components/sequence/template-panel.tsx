"use client"

import { StepType } from "@prisma/client"
import { ChevronUpIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MERGE_TAGS } from "./types"

export function TemplatePanel({
  type,
  template,
  onChange,
  onCollapse,
}: {
  type: StepType
  template: string | null
  onChange: (template: string) => void
  onCollapse: () => void
}) {
  const isEmail = type === StepType.EMAIL || type === StepType.EMAIL_REPLY

  return (
    <div className="col-span-full mt-2.5 border-t border-line-soft pt-3">
      <p className="mb-2 text-[11px] text-dim">
        {isEmail ? "Email template" : "Script"}{" "}
        <span className="text-dim/80">— copied when you open this task</span>
      </p>
      <Textarea
        value={template ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[88px] text-xs"
        placeholder={
          isEmail ? "Subject: …\n\nHei {{first_name}},…" : "Talking points…"
        }
      />
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-dim">Click to insert</span>
        {MERGE_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onChange(`${template ?? ""}${tag}`)}
            className="rounded border border-accent-line bg-accent-soft px-1.5 py-0.5 font-mono text-[11px] text-primary"
          >
            {tag}
          </button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={onCollapse}
        >
          Collapse <ChevronUpIcon className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
