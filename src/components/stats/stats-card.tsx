import { cn } from "@/lib/utils"

export function StatsCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "rounded-[12px] border border-stats-card-line bg-white px-6 py-[22px]",
        className,
      )}
    >
      {children}
    </section>
  )
}

export function StatsEmptyBody({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-sm text-stats-secondary">{children}</p>
}

/** Metric value: real numbers in ink, zeros recede. */
export function MetricNum({
  value,
  className,
  empty = false,
}: {
  value: string
  className?: string
  empty?: boolean
}) {
  return (
    <span
      className={cn(
        "tabular-nums",
        empty ? "text-stats-zero" : "text-stats-ink",
        className,
      )}
    >
      {value}
    </span>
  )
}
