"use client"

import { useId, useState } from "react"
import { appToday } from "@/lib/dates"
import { addCalendarDays, mondayOf } from "@/lib/queue-filters"
import { WEEKLY_DIAL_TARGET } from "@/lib/stats-constants"
import type { WeekPoint } from "@/lib/stats"

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

function formatDayMonth(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

function weekRanges(weeks: number, endDay: Date) {
  const startMon = addCalendarDays(mondayOf(endDay), -(weeks - 1) * 7)
  return Array.from({ length: weeks }, (_, i) => {
    const from = addCalendarDays(startMon, i * 7)
    const to = addCalendarDays(from, 6)
    return { from, to, label: `${formatDayMonth(from)} – ${formatDayMonth(to)}` }
  })
}

function niceMax(raw: number): number {
  if (raw <= 0) return 40
  const padded = raw * 1.1
  const step = padded <= 20 ? 5 : padded <= 50 ? 10 : 20
  return Math.ceil(padded / step) * step
}

/** Bar with only the top corners rounded (sits flush on the baseline). */
function topRoundedBar(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): string {
  if (h <= 0) return ""
  const rr = Math.min(r, h, w / 2)
  return [
    `M${x},${y + h}`,
    `L${x},${y + rr}`,
    `Q${x},${y} ${x + rr},${y}`,
    `L${x + w - rr},${y}`,
    `Q${x + w},${y} ${x + w},${y + rr}`,
    `L${x + w},${y + h}`,
    "Z",
  ].join(" ")
}

export function WeeklyDialsChart({ weekly }: { weekly: WeekPoint[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const gid = useId()
  const target = WEEKLY_DIAL_TARGET
  const ranges = weekRanges(weekly.length, appToday())
  const maxDials = Math.max(...weekly.map((w) => w.dials), target)
  const yMax = niceMax(maxDials)
  const ticks = Array.from({ length: 5 }, (_, i) => (yMax / 4) * i)

  const W = 640
  const H = 220
  const padL = 32
  const padR = 48
  const padT = 18
  const padB = 28
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const n = weekly.length
  const gap = plotW / n
  const barW = Math.min(28, gap * 0.55)
  const targetY = padT + plotH * (1 - target / yMax)

  const aria = weekly
    .map(
      (w, i) =>
        `${w.label} (${ranges[i]?.label}): ${w.dials} dials, ${w.connects} connects`,
    )
    .join("; ")

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Weekly dials and connects for the last 12 weeks. Target ${target} dials per week. ${aria}`}
      >
        {ticks.map((t) => {
          const y = padT + plotH * (1 - t / yMax)
          return (
            <g key={t}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y}
                y2={y}
                stroke={t === 0 ? "var(--stats-zero)" : "var(--stats-grid)"}
                strokeWidth={1}
              />
              <text
                x={padL - 8}
                y={y + 4}
                textAnchor="end"
                fill="var(--stats-muted)"
                fontSize={11}
                className="tabular-nums"
              >
                {t}
              </text>
            </g>
          )
        })}

        <line
          x1={padL}
          x2={W - padR}
          y1={targetY}
          y2={targetY}
          stroke="var(--stats-indigo-400)"
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />
        <text
          x={W - padR}
          y={targetY - 6}
          textAnchor="end"
          fill="var(--stats-indigo-600)"
          fontSize={11}
        >
          target {target}
        </text>

        {weekly.map((w, i) => {
          const cx = padL + gap * i + gap / 2
          const dialH = (w.dials / yMax) * plotH
          const connH = (Math.min(w.connects, w.dials) / yMax) * plotH
          const dialY = padT + plotH - dialH
          const connY = padT + plotH - connH
          const x = cx - barW / 2
          return (
            <g
              key={w.label}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <rect
                x={x - 4}
                y={padT}
                width={barW + 8}
                height={plotH}
                fill="transparent"
              />
              {w.dials > 0 && (
                <path
                  d={topRoundedBar(x, dialY, barW, dialH, 4)}
                  fill="var(--stats-indigo-200)"
                />
              )}
              {w.connects > 0 && (
                <>
                  <rect
                    x={x}
                    y={connY}
                    width={barW}
                    height={connH}
                    fill="var(--stats-indigo-700)"
                  />
                  <rect
                    x={x}
                    y={connY}
                    width={barW}
                    height={2}
                    fill="var(--background)"
                  />
                </>
              )}
              <text
                x={cx}
                y={H - 8}
                textAnchor="middle"
                fill="var(--stats-muted)"
                fontSize={11}
              >
                {w.label}
              </text>
            </g>
          )
        })}

        {hover != null && weekly[hover] && (
          <foreignObject
            x={Math.min(
              Math.max(padL + gap * hover + gap / 2 - 80, padL),
              W - padR - 160,
            )}
            y={4}
            width={160}
            height={52}
          >
            <div
              id={gid}
              className="rounded-lg border border-stats-card-line bg-white px-3 py-2 text-xs shadow-sm"
            >
              <div className="font-semibold text-stats-ink">
                {ranges[hover]?.label}
              </div>
              <div className="mt-1 text-stats-secondary tabular-nums">
                {weekly[hover].dials} dials · {weekly[hover].connects}{" "}
                connects ·{" "}
                {weekly[hover].dials === 0
                  ? "0%"
                  : `${Math.round((weekly[hover].connects / weekly[hover].dials) * 100)}%`}
              </div>
            </div>
          </foreignObject>
        )}
      </svg>
    </div>
  )
}
