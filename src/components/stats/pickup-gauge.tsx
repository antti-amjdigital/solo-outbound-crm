import type { CallRates, PickupBuckets } from "@/lib/stats"

/** Semicircle gauge — SVG copied from wireframes.html id="s-stats". */
export function PickupGauge({
  pickup,
  rates,
}: {
  pickup: PickupBuckets
  rates: CallRates
}) {
  const total = rates.dials || 1
  // Arc length of semicircle path ≈ π * 82 ≈ 257.6
  const ARC = 257.6
  const segs = [
    { n: pickup.spoke, color: "var(--good)" },
    { n: pickup.gatekeeper, color: "var(--accent-hi)" },
    { n: pickup.voicemail, color: "var(--accent-line)" },
    { n: pickup.noAnswer, color: "var(--line)" },
  ]
  let offset = 0
  const arcs = segs.map((s) => {
    const len = (s.n / total) * ARC
    const dash = { color: s.color, len, offset }
    offset += len
    return dash
  })
  const pct =
    rates.connectRate == null ? "—" : `${(rates.connectRate * 100).toFixed(1)}%`

  return (
    <div className="flex flex-col rounded-xl border border-border bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(16,23,42,0.04)]">
      <div className="mb-1">
        <h3 className="text-[13.5px] font-bold">Who picks up</h3>
        <div className="mt-0.5 text-[11.5px] text-dim">
          {rates.dials} dials this period
        </div>
      </div>
      <svg
        viewBox="0 0 200 118"
        className="mx-auto mt-1 w-full max-w-[230px]"
        aria-hidden
      >
        <g fill="none" strokeWidth={17} strokeLinecap="butt">
          <path d="M18,100 A82,82 0 0 1 182,100" stroke="#EFF1F4" />
          {arcs.map((a, i) => (
            <path
              key={i}
              d="M18,100 A82,82 0 0 1 182,100"
              stroke={a.color}
              strokeDasharray={`${a.len} ${ARC}`}
              strokeDashoffset={-a.offset}
            />
          ))}
        </g>
        <text
          x="100"
          y="88"
          textAnchor="middle"
          fontSize="30"
          fontWeight="700"
          fill="#1A1F28"
        >
          {pct}
        </text>
        <text x="100" y="106" textAnchor="middle" fontSize="11" fill="#6B7280">
          reached the target
        </text>
      </svg>
      <div className="mt-3.5 flex flex-col gap-1.5 text-[11.5px] text-dim">
        <LegendRow swatch="bg-good" label="Spoke to them" value={pickup.spoke} />
        <LegendRow swatch="bg-accent-hi" label="Gatekeeper" value={pickup.gatekeeper} />
        <LegendRow swatch="bg-accent-line" label="Voicemail" value={pickup.voicemail} />
        <LegendRow swatch="bg-line" label="No answer" value={pickup.noAnswer} />
      </div>
      <div className="mt-3.5 inline-block rounded-md bg-rail px-2.5 py-1.5 font-mono text-[10.5px] leading-snug text-white">
        connect = connected + callback
        <br />+ booked + not_interested
      </div>
    </div>
  )
}

function LegendRow({
  swatch,
  label,
  value,
}: {
  swatch: string
  label: string
  value: number
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5">
        <i className={`inline-block size-2.5 rounded-sm ${swatch}`} />
        {label}
      </span>
      <b className="font-semibold text-ink tabular-nums">{value}</b>
    </div>
  )
}
