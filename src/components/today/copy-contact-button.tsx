"use client"

import { useState } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type Props = {
  value: string
  label?: string
}

export function CopyContactButton({ value, label = "Copy" }: Props) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value.replace(/\s+/g, ""))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <TooltipProvider delay={0}>
      <Tooltip open={copied}>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label={label}
              className="inline-flex size-6 shrink-0 items-center justify-center rounded text-[#94a3b8] opacity-0 transition-opacity group-hover/contact:opacity-100 group-hover/row:opacity-100 hover:bg-[#f1f5f9] hover:text-[#64748b] focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[#4f46e5]/30 focus-visible:outline-none data-[copied]:opacity-100"
              data-copied={copied ? "" : undefined}
              onClick={(e) => {
                e.stopPropagation()
                void copy()
              }}
            />
          }
        >
          <svg
            viewBox="0 0 24 24"
            className="size-3.5 fill-none stroke-current [stroke-width:2] [stroke-linecap:round] [stroke-linejoin:round]"
            aria-hidden
          >
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </TooltipTrigger>
        <TooltipContent className="bg-[#0f172a] text-white">
          Copied
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
