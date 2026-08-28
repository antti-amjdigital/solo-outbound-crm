const DONUT = [
  "var(--accent-brand)",
  "var(--accent-hi)",
  "var(--accent-line)",
  "var(--good)",
  "var(--primary)",
  "var(--chart-2)",
]
const SWATCH = [
  "bg-primary",
  "bg-accent-hi",
  "bg-accent-line",
  "bg-good",
  "bg-primary",
  "bg-accent-hi",
]

export function MeetingsDonut({
  meetingsByStep,
  total,
}: {
  meetingsByStep: { order: number; label: string; booked: number }[]
  total: number
}) {
  const R = 52
  const C = 2 * Math.PI * R
  let offset = 0
  const segs = meetingsByStep.map((s, i) => {
    const len = total === 0 ? 0 : (s.booked / total) * C
    const seg = {
      ...s,
      color: DONUT[i % DONUT.length],
      swatch: SWATCH[i % SWATCH.length],
      len,
      offset,
    }
    offset += len
    return seg
  })

  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(16,23,42,0.04)]">
      <div className="mb-2">
        <h3 className="text-[13.5px] font-bold">Where meetings come from</h3>
        <div className="mt-0.5 text-[11.5px] text-dim">{total} booked</div>
      </div>
      <svg
        viewBox="0 0 150 150"
        className="mx-auto block w-full max-w-[172px]"
        aria-hidden
      >
        <g transform="rotate(-90 75 75)" fill="none" strokeWidth={24}>
          {total === 0 ? (
            <circle cx="75" cy="75" r={R} stroke="#EFF1F4" />
          ) : (
            segs.map((s) => (
              <circle
                key={s.order}
                cx="75"
                cy="75"
                r={R}
                stroke={s.color}
                strokeDasharray={`${s.len} ${C}`}
                strokeDashoffset={-s.offset}
              />
            ))
          )}
        </g>
        <text
          x="75"
          y="72"
          textAnchor="middle"
          fontSize="24"
          fontWeight="700"
          fill="#1A1F28"
        >
          {total}
        </text>
        <text x="75" y="88" textAnchor="middle" fontSize="10" fill="#6B7280">
          meetings
        </text>
      </svg>
      <div className="mt-3.5 flex flex-col gap-1.5 text-[11.5px] text-dim">
        {segs.map((s) => (
          <div key={s.order} className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5">
              <i className={`inline-block size-2.5 rounded-sm ${s.swatch}`} />
              {s.label}
            </span>
            <b className="font-semibold text-ink tabular-nums">{s.booked}</b>
          </div>
        ))}
        {segs.length === 0 && (
          <p className="text-dim">No meetings booked in this period.</p>
        )}
      </div>
    </div>
  )
}
