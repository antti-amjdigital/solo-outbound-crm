type Point = { i: number; v: number }

const COLORS = {
  primary: "var(--accent-brand)",
  good: "var(--good)",
  warn: "var(--warn)",
  soft: "var(--accent-hi)",
} as const

export function Sparkline({
  points,
  color = "primary",
}: {
  points: Point[]
  color?: keyof typeof COLORS
}) {
  const stroke = COLORS[color]
  const w = 130
  const h = 38
  const vals = points.map((p) => p.v)
  const max = Math.max(...vals, 0.0001)
  const min = Math.min(...vals, 0)
  const span = max - min || 1
  const coords = points.map((p, idx) => {
    const x = points.length <= 1 ? 0 : (idx / (points.length - 1)) * w
    const y = h - 8 - ((p.v - min) / span) * (h - 16)
    return { x, y }
  })
  if (coords.length === 0) return null
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ")
  const area = `${line} L${w},${h} L0,${h} Z`
  const gid = `sg-${color}-${points.length}`

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="mt-2 h-[38px] w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={stroke} stopOpacity={0.26} />
          <stop offset="1" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
