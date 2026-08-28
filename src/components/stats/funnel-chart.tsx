import type { FunnelStep } from "@/lib/stats"

/** Trapezoid funnel — geometry from wireframes.html id="s-stats". */
export function FunnelChart({
  funnel,
  sequenceName,
  enrolled,
}: {
  funnel: FunnelStep[]
  sequenceName: string | null
  enrolled: number
}) {
  const n = funnel.length
  if (n === 0) {
    return (
      <EmptyCard title="Sequence funnel" sub="No sequence selected" />
    )
  }

  const maxR = Math.max(...funnel.map((f) => f.reached), 1)
  const rowH = 44
  const gap = 6
  const height = n * rowH + (n - 1) * gap
  const W = 560
  const pad = 20

  const polys = funnel.map((step, i) => {
    const t = step.reached / maxR
    const nextT = i < n - 1 ? funnel[i + 1].reached / maxR : t * 0.85
    // Top width uses this step; bottom blends toward next for funnel shape
    const topInset = ((1 - t) * (W - pad * 2)) / 2
    const botInset = ((1 - nextT) * (W - pad * 2)) / 2
    const y0 = i * (rowH + gap)
    const y1 = y0 + rowH
    return {
      step,
      points: `${pad + topInset},${y0} ${W - pad - topInset},${y0} ${W - pad - botInset},${y1} ${pad + botInset},${y1}`,
      opacity: 1 - i * 0.12,
      midY: y0 + rowH / 2 + 4,
      leftX: pad + Math.max(topInset, botInset) + 24,
      rightX: W - pad - Math.max(topInset, botInset) - 24,
      dropX: W - 8,
    }
  })

  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(16,23,42,0.04)]">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[13.5px] font-bold">Sequence funnel</h3>
          <div className="mt-0.5 text-[11.5px] text-dim">
            {sequenceName ?? "Sequence"} · {enrolled} enrolled
          </div>
        </div>
        <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-dim">
          Reached each step
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="h-auto w-full"
        aria-hidden
      >
        <defs>
          <linearGradient id="fg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2F4BD9" />
            <stop offset="1" stopColor="#6B82F0" />
          </linearGradient>
        </defs>
        {polys.map((p, i) => (
          <g key={p.step.order}>
            <polygon
              points={p.points}
              fill="url(#fg)"
              opacity={p.opacity}
            />
            <text
              x={p.leftX}
              y={p.midY}
              fill="#fff"
              fontSize="12.5"
              fontWeight="600"
            >
              {p.step.label}
            </text>
            <text
              x={p.rightX}
              y={p.midY}
              textAnchor="end"
              fill="#fff"
              fontSize="12.5"
              fontWeight="600"
            >
              {p.step.reached}
            </text>
            {i > 0 && p.step.dropPct != null && (
              <text
                x={p.dropX}
                y={p.midY}
                textAnchor="end"
                fill="#98A0AC"
                fontSize="10.5"
              >
                −{Math.round(p.step.dropPct * 100)}%
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}

function EmptyCard({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3.5">
      <h3 className="text-[13.5px] font-bold">{title}</h3>
      <p className="mt-2 text-sm text-dim">{sub}</p>
    </div>
  )
}
