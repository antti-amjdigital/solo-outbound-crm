"use client"

import type { ReactNode } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const GUTTER_ICON =
  "size-4 shrink-0 stroke-current text-[#94a3b8] [stroke-width:2]"

function GutterIcon({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className="flex items-center justify-center"
            tabIndex={-1}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  )
}

export function AddTaskFieldRow({
  icon,
  iconTitle,
  iconAlign = "center",
  iconHeight = 38,
  children,
}: {
  icon?: ReactNode
  iconTitle?: string
  iconAlign?: "center" | "top"
  iconHeight?: 38 | 44
  children: ReactNode
}) {
  return (
    <>
      <div
        className={cn(
          "flex w-6 shrink-0 justify-center",
          iconAlign === "top"
            ? "items-start pt-[11px]"
            : cn("items-center", iconHeight === 44 ? "h-11" : "h-[38px]"),
        )}
      >
        {icon && iconTitle ? (
          <GutterIcon title={iconTitle}>{icon}</GutterIcon>
        ) : null}
      </div>
      <div className="min-w-0">{children}</div>
    </>
  )
}

export { GUTTER_ICON }
