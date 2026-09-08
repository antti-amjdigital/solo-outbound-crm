"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { StepType } from "@prisma/client"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { CopyContactButton } from "@/components/today/copy-contact-button"
import { TypeIcon } from "@/components/today/type-icon"
import {
  formatPhoneDisplay,
  prospectDisplayName,
} from "@/components/today/labels"
import { StatusPill } from "@/components/prospects/status-pill"
import { AddProspectDialog } from "@/components/prospects/add-prospect-dialog"
import {
  formatRelativeDue,
  type ProspectListRow,
} from "@/lib/prospect-queries"
import { cn } from "@/lib/utils"

const TYPE_SHORT: Record<StepType, string> = {
  CALL: "Call",
  EMAIL: "Email",
  EMAIL_REPLY: "Reply",
  LINKEDIN: "LinkedIn",
  MANUAL: "Task",
}

function nextTaskLabel(task: NonNullable<ProspectListRow["nextTask"]>): string {
  const type = TYPE_SHORT[task.type]
  if (task.overdueDays > 0) return `${type} · overdue ${task.overdueDays}d`
  const rel = formatRelativeDue(task.dueDate)
  if (rel === "Today") return `${type} today`
  if (rel === "Tomorrow") return `${type} tomorrow`
  if (rel.startsWith("Overdue")) return `${type} · ${rel.toLowerCase()}`
  return `${type} ${rel}`
}

function formatActivity(row: ProspectListRow): {
  text: string
  empty: boolean
} {
  if (!row.lastActivityAt && row.dials === 0) {
    return { text: "—", empty: true }
  }
  const date = row.lastActivityAt
    ? row.lastActivityAt.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        timeZone: "Europe/Helsinki",
      })
    : null
  const dials =
    row.dials === 0 ? "—" : `${row.dials} dial${row.dials === 1 ? "" : "s"}`
  if (!date) return { text: dials, empty: false }
  return { text: `${dials} · ${date}`, empty: false }
}

type Props = {
  row: ProspectListRow
  selected: boolean
  onToggle: (checked: boolean) => void
  onEnroll: () => void
}

export function ProspectRow({ row, selected, onToggle, onEnroll }: Props) {
  const router = useRouter()
  const name = prospectDisplayName(row)
  const activity = formatActivity(row)
  const overdue = (row.nextTask?.overdueDays ?? 0) > 0

  return (
    <div
      role="row"
      tabIndex={0}
      className={cn(
        "group/row grid h-16 cursor-pointer grid-cols-[40px_1.5fr_1.1fr_1fr_0.8fr_1.1fr_1fr_0.9fr] items-center gap-3.5 border-t border-[#f5f7fa] px-5 outline-none first:border-t-0 hover:bg-stats-canvas focus-visible:bg-stats-canvas focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stats-indigo-700/30",
        selected && "bg-[#eef2ff]/40",
      )}
      onClick={() => router.push(`/prospects/${row.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          router.push(`/prospects/${row.id}`)
        }
      }}
    >
      <div
        role="cell"
        className="flex items-center"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onToggle(Boolean(v))}
          aria-label={`Select ${name}`}
        />
      </div>

      <div role="cell" className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[14px] font-semibold text-[#1e293b]">
          {name}
        </span>
        {row.title ? (
          <span className="truncate text-[12px] text-stats-muted">
            {row.title}
          </span>
        ) : null}
      </div>

      <div role="cell" className="truncate text-[14px] text-stats-secondary">
        {row.company ?? "—"}
      </div>

      <div
        role="cell"
        className="group/contact flex min-w-0 items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {row.phone ? (
          <>
            <span className="truncate text-[14px] font-medium text-[#1e293b] tabular-nums">
              {formatPhoneDisplay(row.phone)}
            </span>
            <CopyContactButton value={row.phone} label="Copy phone number" />
          </>
        ) : (
          <span className="text-stats-zero">—</span>
        )}
      </div>

      <div role="cell">
        <StatusPill status={row.status} />
      </div>

      <div role="cell" className="min-w-0 truncate text-[14px]">
        {row.sequenceName ? (
          <span>
            <span className="text-stats-secondary">{row.sequenceName}</span>
            {row.stepOrder && row.stepTotal ? (
              <span className="text-stats-muted">
                {" "}
                · step {row.stepOrder}/{row.stepTotal}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-stats-muted">Not enrolled</span>
        )}
      </div>

      <div
        role="cell"
        className="min-w-0"
        onClick={(e) => {
          if (!row.nextTask) e.stopPropagation()
        }}
      >
        {row.nextTask ? (
          <span
            className={cn(
              "inline-flex items-center gap-2 text-[13px]",
              overdue
                ? "font-semibold text-[#dc2626]"
                : "font-medium text-[#1e293b]",
            )}
          >
            <TypeIcon
              type={row.nextTask.type}
              variant="inline"
              className={overdue ? "text-[#dc2626]" : "text-stats-indigo-600"}
            />
            <span className="truncate">{nextTaskLabel(row.nextTask)}</span>
          </span>
        ) : (
          <Button
            variant="outline"
            className="h-[30px] rounded-lg border-stats-picker-line bg-white px-3 text-[13px] font-semibold text-stats-secondary hover:bg-stats-canvas"
            onClick={(e) => {
              e.stopPropagation()
              onEnroll()
            }}
          >
            Enroll
          </Button>
        )}
      </div>

      <div
        role="cell"
        className={cn(
          "text-right text-[13px] tabular-nums",
          activity.empty ? "text-stats-zero" : "text-stats-muted",
        )}
      >
        {activity.text}
      </div>
    </div>
  )
}

export function EmptyProspects({
  kind,
}: {
  kind: "none" | "filtered"
}) {
  if (kind === "none") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-5 py-16">
        <p className="text-[14px] text-stats-secondary">No prospects yet</p>
        <div className="flex items-center gap-2.5">
          <AddProspectDialog />
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/import" />}
            className="h-[38px] gap-2 rounded-lg border-stats-picker-line bg-white px-4 text-[13px] font-semibold text-stats-secondary"
          >
            Import CSV
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center gap-3 px-5 py-16">
      <p className="text-[14px] text-stats-secondary">No matches</p>
      <Link
        href="/prospects"
        className="text-[13px] font-semibold text-stats-indigo-700 hover:underline focus-visible:ring-2 focus-visible:ring-stats-indigo-700/30 focus-visible:outline-none"
      >
        Clear filters
      </Link>
    </div>
  )
}
