import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Sparkline } from "@/components/stats/sparkline"
import { deltaPct, deltaPp, type CallRates, type SparkPoint } from "@/lib/stats"
import { cn } from "@/lib/utils"

type Props = {
  current: CallRates
  previous: CallRates
  weekdays: number
  dialSpark: SparkPoint[]
  connectSpark: SparkPoint[]
  meetingSpark: SparkPoint[]
  dialsPerMeetingSpark: SparkPoint[]
}

function fmtPct(n: number | null): string {
  if (n == null) return "—"
  return `${(n * 100).toFixed(1)}%`
}

function fmtNum(n: number | null, digits = 0): string {
  if (n == null) return "—"
  return digits === 0 ? String(Math.round(n)) : n.toFixed(digits)
}

function Delta({
  value,
  kind,
  invert,
}: {
  value: number | null
  kind: "pct" | "pp" | "abs"
  invert?: boolean
}) {
  if (value == null || Number.isNaN(value)) {
    return <span className="text-[11px] font-bold text-dim">—</span>
  }
  const improved = invert ? value < 0 : value > 0
  const worsened = invert ? value > 0 : value < 0
  const sign = value > 0 ? "+" : ""
  const text =
    kind === "pct"
      ? `${sign}${Math.round(value * 100)}%`
      : kind === "pp"
        ? `${sign}${(value * 100).toFixed(1)}pp`
        : `${sign}${Math.round(value)}`
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap",
        improved && "bg-good-soft text-good",
        worsened && "bg-bad-soft text-bad",
        !improved && !worsened && "bg-surface text-dim",
      )}
    >
      {text}
    </span>
  )
}

export function KpiRow({
  current,
  previous,
  weekdays,
  dialSpark,
  connectSpark,
  meetingSpark,
  dialsPerMeetingSpark,
}: Props) {
  const dialsPerDay = current.dials / weekdays

  return (
    <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        label="Dials"
        value={String(current.dials)}
        sub={`${dialsPerDay.toFixed(1)} per working day`}
        delta={
          <Delta value={deltaPct(current.dials, previous.dials)} kind="pct" />
        }
        tip="count(activities with a call outcome) — every dial, including wrong numbers"
        spark={<Sparkline points={dialSpark} color="primary" />}
      />
      <Card
        label="Connect rate"
        value={fmtPct(current.connectRate)}
        valueClass="text-primary"
        sub={`${current.connectedIsh} connects of ${current.dials} dials`}
        delta={
          <Delta
            value={deltaPp(current.connectRate, previous.connectRate)}
            kind="pp"
          />
        }
        tip="connect = connected + callback + booked + not_interested  ÷  dials"
        spark={<Sparkline points={connectSpark} color="good" />}
      />
      <Card
        label="Meetings booked"
        value={String(current.meetingsBooked)}
        valueClass="text-good"
        sub={
          current.meetingRate == null
            ? "no connects yet"
            : `${fmtPct(current.meetingRate)} of connects`
        }
        delta={
          <Delta
            value={current.meetingsBooked - previous.meetingsBooked}
            kind="abs"
          />
        }
        tip="outcome = MEETING_BOOKED"
        spark={<Sparkline points={meetingSpark} color="warn" />}
      />
      <Card
        label="Dials per meeting"
        value={fmtNum(current.dialsPerMeeting)}
        sub={
          previous.dialsPerMeeting == null
            ? "no prior meetings"
            : `was ${fmtNum(previous.dialsPerMeeting)} last period`
        }
        delta={
          <Delta
            value={
              current.dialsPerMeeting != null && previous.dialsPerMeeting != null
                ? current.dialsPerMeeting - previous.dialsPerMeeting
                : null
            }
            kind="abs"
            invert
          />
        }
        tip="dials ÷ meetings booked — lower is better"
        spark={<Sparkline points={dialsPerMeetingSpark} color="soft" />}
      />
    </div>
  )
}

function Card({
  label,
  value,
  valueClass,
  sub,
  delta,
  tip,
  spark,
}: {
  label: string
  value: string
  valueClass?: string
  sub: string
  delta: React.ReactNode
  tip: string
  spark: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(16,23,42,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <Tooltip>
          <TooltipTrigger className="cursor-help text-[11px] font-semibold tracking-wide text-dim uppercase">
            {label}
          </TooltipTrigger>
          <TooltipContent className="font-mono text-[11px]">{tip}</TooltipContent>
        </Tooltip>
        {delta}
      </div>
      <div
        className={cn(
          "mt-1.5 text-[27px] leading-none font-bold tracking-tight tabular-nums",
          valueClass,
        )}
      >
        {value}
      </div>
      <div className="mt-1 text-[11px] text-dim">{sub}</div>
      {spark}
    </div>
  )
}
