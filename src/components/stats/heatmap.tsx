import type { HeatCell } from "@/lib/stats"

const SCALE = [
  "bg-line-soft",
  "bg-accent-line",
  "bg-accent-hi/50",
  "bg-accent-hi",
  "bg-primary",
] as const

function level(dials: number, max: number): number {
  if (dials === 0 || max === 0) return 0
  const t = dials / max
  if (t <= 0.25) return 1
  if (t <= 0.5) return 2
  if (t <= 0.75) return 3
  return 4
}

export function ConsistencyHeatmap({ cells }: { cells: HeatCell[] }) {
  const max = Math.max(...cells.map((c) => c.dials), 0)
  const weeks = 13
  const cols = Array.from({ length: weeks }, (_, w) =>
    cells.filter((c) => c.weekIndex === w).sort((a, b) => a.weekday - b.weekday),
  )

  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(16,23,42,0.04)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[13.5px] font-bold">Calling consistency</h3>
          <div className="mt-0.5 text-[11.5px] text-dim">
            Dials per weekday, last 13 weeks
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11.5px] text-dim">
          <span>Less</span>
          <span className="flex gap-0.5">
            {SCALE.map((c) => (
              <i key={c} className={`inline-block size-2.5 rounded-sm ${c}`} />
            ))}
          </span>
          <span>More</span>
        </div>
      </div>
      <div className="flex items-start">
        <div className="mr-1.5 flex flex-col gap-0.5 text-[9.5px] text-dim">
          {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
            <span key={d} className="flex h-[15px] items-center leading-none">
              {d}
            </span>
          ))}
        </div>
        <div className="flex gap-0.5 overflow-x-auto">
          {cols.map((col, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {col.map((cell) => (
                <span
                  key={`${cell.weekIndex}-${cell.weekday}`}
                  title={`W${wi + 1} · ${cell.dials} dials`}
                  className={`size-[15px] rounded-sm ${SCALE[level(cell.dials, max)]}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-dim">
        Pale columns are days you didn&apos;t prospect. Absence never shows up as a
        bad rate — only as a gap.
      </p>
    </div>
  )
}
