import type { StepRank } from "@/lib/stats"

export function StepRanks({ ranks }: { ranks: StepRank[] }) {
  const max = Math.max(...ranks.map((r) => r.per100), 0.0001)

  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(16,23,42,0.04)]">
      <div className="mb-2">
        <h3 className="text-[13.5px] font-bold">Best performing steps</h3>
        <div className="mt-0.5 text-[11.5px] text-dim">
          Meetings booked per 100 tasks
        </div>
      </div>
      {ranks.length === 0 && (
        <p className="text-sm text-dim">No step activity in this period.</p>
      )}
      {ranks.map((r, i) => (
        <div
          key={r.order}
          className="grid grid-cols-[20px_1fr_46px] items-center gap-2.5 border-b border-line-soft py-2 text-[12.5px] last:border-0"
        >
          <span className="flex size-5 items-center justify-center rounded-md border border-border bg-surface text-[10.5px] font-bold text-dim">
            {i + 1}
          </span>
          <span>
            {r.label}
            <svg
              className="mt-1 h-1.5 w-full"
              viewBox="0 0 100 6"
              preserveAspectRatio="none"
              aria-hidden
            >
              <rect width="100" height="6" rx="3" className="fill-line-soft" />
              <rect
                width={(r.per100 / max) * 100}
                height="6"
                rx="3"
                className={
                  i === 0
                    ? "fill-good"
                    : i === 1
                      ? "fill-primary"
                      : i === 2
                        ? "fill-accent-hi"
                        : "fill-accent-line"
                }
              />
            </svg>
          </span>
          <b className="text-right tabular-nums">{r.per100.toFixed(1)}</b>
        </div>
      ))}
      <p className="mt-3 text-[11px] leading-relaxed text-dim">
        Late steps often convert better per task — the people still in the sequence
        haven&apos;t said no. Invisible in the raw funnel.
      </p>
    </div>
  )
}
