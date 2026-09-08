import { highlightSegments } from "@/lib/search"
import { cn } from "@/lib/utils"

export function HighlightText({
  text,
  query,
  className,
  boldClassName = "font-semibold text-[#0f172a]",
}: {
  text: string
  query: string
  className?: string
  boldClassName?: string
}) {
  const segments = highlightSegments(text, query)
  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.bold ? (
          <span key={i} className={boldClassName}>
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </span>
  )
}

export function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn(
        "size-4 fill-none stroke-current [stroke-width:2] [stroke-linecap:round] [stroke-linejoin:round]",
        className,
      )}
      aria-hidden
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

export function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn(
        "size-[15px] fill-none stroke-current [stroke-width:2] [stroke-linecap:round] [stroke-linejoin:round]",
        className,
      )}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

export function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn(
        "size-4 fill-none stroke-current [stroke-width:2] [stroke-linecap:round] [stroke-linejoin:round]",
        className,
      )}
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}
