"use client"

import { useRouter } from "next/navigation"
import { CallOutcome, StepType } from "@prisma/client"
import { toast } from "sonner"
import { OutcomePopover } from "@/components/today/outcome-popover"
import { SnoozeMenu } from "@/components/today/snooze-menu"
import { TypeIcon } from "@/components/today/type-icon"
import { OUTCOME_LABEL } from "@/components/today/labels"
import { completeTaskAction, snoozeTaskAction } from "@/actions/tasks"
import { formatRelativeDue } from "@/lib/prospect-queries"
import type { ProspectDetail } from "@/lib/prospect-detail-query"
import { cn } from "@/lib/utils"

export function FocusPanel({
  data,
  logOpen,
  onLogOpenChange,
}: {
  data: ProspectDetail
  logOpen: boolean
  onLogOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const task = data.openTask

  if (!task) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-6 text-center text-sm text-dim">
        No open task — enroll or wait for the next step.
      </div>
    )
  }

  const dueLabel = formatRelativeDue(task.dueDate)
  const overdue = dueLabel.startsWith("Overdue")
  const last = data.lastCallOutcome
  const pinned = data.notes[0]?.body

  async function complete(input: {
    taskId: string
    outcome?: CallOutcome
    note?: string
    nextDueDate?: string
  }) {
    onLogOpenChange(false)
    const res = await completeTaskAction(input)
    if (!res.ok) toast.error(res.error)
    else {
      toast.success("Logged")
      router.refresh()
    }
  }

  async function snooze(taskId: string, dueDate: string) {
    const res = await snoozeTaskAction({ taskId, dueDate })
    if (!res.ok) toast.error(res.error)
    else {
      toast.success("Snoozed")
      router.refresh()
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-accent-line bg-accent-soft/40">
      <div className="flex items-center justify-between border-b border-accent-line/60 px-3.5 py-2 text-[11px] font-semibold tracking-wide text-dim uppercase">
        <span>Focus · next action</span>
        {data.enrollment && (
          <span className="font-normal tracking-normal normal-case">
            Step {task.stepOrder ?? "—"} of {data.enrollment.stepTotal}
          </span>
        )}
      </div>
      <div className="px-3.5 py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <TypeIcon type={task.type} />
          <span className="text-sm font-bold">{task.label}</span>
          <span
            className={cn(
              "rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-primary",
              overdue && "bg-bad-soft text-bad",
            )}
          >
            due {dueLabel.toLowerCase()}
          </span>
          {task.type === StepType.CALL && data.prospect.phone && (
            <a
              href={`tel:${data.prospect.phone.replace(/\s+/g, "")}`}
              className="font-mono text-[11px] text-primary hover:underline"
            >
              {data.prospect.phone}
            </a>
          )}
          <span className="ml-auto flex gap-1.5">
            <SnoozeMenu taskId={task.id} onSnooze={snooze} />
            <OutcomePopover
              taskId={task.id}
              taskType={task.type}
              prospectName={[data.prospect.firstName, data.prospect.lastName]
                .filter(Boolean)
                .join(" ")}
              open={logOpen}
              onOpenChange={onLogOpenChange}
              onComplete={complete}
            />
          </span>
        </div>
        {(last || pinned) && (
          <div className="mt-3 rounded-md border-l-2 border-primary/40 bg-background/80 px-3 py-2 text-[12.5px] leading-relaxed">
            <div className="mb-1 text-[10px] font-semibold tracking-wide text-dim uppercase">
              Before you dial
            </div>
            {last && (
              <>
                Last outcome was{" "}
                <b>
                  {OUTCOME_LABEL[last.outcome as CallOutcome] ?? last.outcome}
                </b>{" "}
                on{" "}
                {last.occurredAt.toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Europe/Helsinki",
                })}
                .
              </>
            )}
            {pinned && (
              <>
                {last ? " " : null}
                Pinned: {pinned.split("\n")[0]}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
