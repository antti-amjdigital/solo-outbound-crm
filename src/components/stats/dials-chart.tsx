"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { WeekPoint } from "@/lib/stats"

export function DialsConnectChart({ weekly }: { weekly: WeekPoint[] }) {
  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(16,23,42,0.04)]">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[13.5px] font-bold">Dials &amp; connects</h3>
          <div className="mt-0.5 text-[11.5px] text-dim">Last 12 weeks</div>
        </div>
        <div className="flex flex-wrap gap-3.5 text-[11.5px] text-dim">
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block size-2.5 rounded-sm bg-primary" />
            Dials
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block size-2.5 rounded-sm bg-accent-hi" />
            Connects
          </span>
        </div>
      </div>
      <div className="h-[232px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weekly} barGap={2} barCategoryGap="18%">
            <CartesianGrid vertical={false} stroke="var(--line-soft)" />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--dim)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--dim)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={28}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "var(--line-soft)", opacity: 0.6 }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--line)",
                fontSize: 12,
              }}
            />
            <Bar dataKey="dials" fill="var(--accent-brand)" radius={[3, 3, 0, 0]} maxBarSize={14} />
            <Bar dataKey="connects" fill="var(--accent-hi)" radius={[3, 3, 0, 0]} maxBarSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
