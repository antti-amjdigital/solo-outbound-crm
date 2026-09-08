"use client"

import { CallOutcome } from "@prisma/client"
import { OUTCOME_GROUPS, outcomeOption } from "@/components/today/labels"
import { cn } from "@/lib/utils"

const GROUP_LABEL =
  "text-[11px] font-bold tracking-[0.8px] text-[#94a3b8] uppercase"

const PILL =
  "inline-flex h-8 items-center rounded-full border border-[#e2e8f0] bg-white px-3.5 text-[13px] text-[#475569] transition-colors hover:bg-[#f8fafc] focus-visible:outline-none"

const PILL_SELECTED =
  "border-[#c7d2fe] bg-[#eef2ff] font-semibold text-[#4f46e5]"

type Props = {
  value: CallOutcome | null
  onChange: (value: CallOutcome) => void
}

export function OutcomeGroupsSection({ value, onChange }: Props) {
  return (
    <>
      {OUTCOME_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-2">
          <span className={GROUP_LABEL}>{group.label}</span>
          <div className="flex flex-wrap gap-2">
            {group.values.map((outcome) => {
              const opt = outcomeOption(outcome)
              return (
                <button
                  key={outcome}
                  type="button"
                  className={cn(PILL, value === outcome && PILL_SELECTED)}
                  onClick={() => onChange(outcome)}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
}
