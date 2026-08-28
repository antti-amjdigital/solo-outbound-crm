"use client"

import Link from "next/link"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const railTooltipClass =
  "rounded-lg border-0 bg-ink px-3 py-1.5 text-[13px] font-medium tracking-normal text-white shadow-[0_4px_14px_rgba(0,0,0,0.4)] [&>svg]:hidden"

type NavRailItemProps = {
  label: string
  active: boolean
  href?: string
  children: React.ReactNode
}

export function NavRailItem({ label, active, href, children }: NavRailItemProps) {
  const itemClass = cn(
    "relative flex size-10 items-center justify-center rounded-lg text-rail-dim",
    active && "bg-primary text-white",
    active &&
      "before:absolute before:top-2.5 before:bottom-2.5 before:-left-2.5 before:w-[3px] before:rounded-r before:bg-accent-hi before:content-['']",
  )

  const trigger = href ? (
    <Link
      href={href}
      prefetch
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={itemClass}
    >
      {children}
    </Link>
  ) : (
    <span aria-label={label} className={itemClass}>
      {children}
    </span>
  )

  return (
    <Tooltip>
      <TooltipTrigger delay={250} render={trigger} />
      <TooltipContent
        side="right"
        sideOffset={12}
        align="center"
        className={railTooltipClass}
      >
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
