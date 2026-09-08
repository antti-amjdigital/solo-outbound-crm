import { Info } from "lucide-react"
import type { CallRates, PickupBuckets } from "@/lib/stats"
import {
  MetricNum,
  StatsCard,
  StatsEmptyBody,
} from "@/components/stats/stats-card"
import { cn } from "@/lib/utils"

const OUTCOME_ROWS: {
  key: keyof PickupBuckets
  label: string
  fill: string
}[] = [
  { key: "spoke", label: "Spoke to them", fill: "var(--stats-indigo-900)" },
  { key: "gatekeeper", label: "Gatekeeper", fill: "var(--stats-indigo-600)" },
  { key: "voicemail", label: "Voicemail", fill: "var(--stats-indigo-300)" },
  { key: "noAnswer", label: "No answer", fill: "var(--stats-indigo-200)" },
]

type Props = {
  pickup: PickupBuckets
  rates: CallRates
  meetingsByStep: { order: number; label: string; booked: number }[]
}

export function OutcomesMeetingsCard({
  pickup,
  rates,
  meetingsByStep,
}: Props) {
  const empty = rates.dials === 0
  const dials = rates.dials
  const meetingsEmpty = rates.meetingsBooked === 0
  const maxSource = Math.max(...meetingsByStep.map((s) => s.booked), 1)

  return (
    <StatsCard className="flex flex-col p-0">
      <div className="px-6 py-[22px]">
        <h2 className="text-base font-bold text-stats-ink">Call outcomes</h2>
        <p className="mt-0.5 text-[13px] text-stats-muted">
          This period · {dials} dials
        </p>

        {empty ? (
          <StatsEmptyBody>Outcomes appear once you log calls</StatsEmptyBody>
        ) : (
          <>
            <div
              className="mt-5 flex flex-col gap-3"
              role="img"
              aria-label={OUTCOME_ROWS.map((r) => {
                const n = pickup[r.key]
                const pct = dials === 0 ? 0 : Math.round((n / dials) * 100)
                return `${r.label}: ${n} (${pct}%)`
              }).join(", ")}
            >
              {OUTCOME_ROWS.map((r) => {
                const n = pickup[r.key]
                const pct = dials === 0 ? 0 : (n / dials) * 100
                return (
                  <HBarRow
                    key={r.key}
                    label={r.label}
                    fill={r.fill}
                    widthPct={pct}
                    value={
                      <>
                        <MetricNum
                          value={String(n)}
                          empty={n === 0}
                          className="font-bold"
                        />{" "}
                        <span
                          className={cn(
                            "tabular-nums",
                            n === 0 ? "text-stats-zero" : "text-stats-muted",
                          )}
                        >
                          {Math.round(pct)}%
                        </span>
                      </>
                    }
                  />
                )
              })}
            </div>

            <div className="mt-5 flex gap-2.5 rounded-lg bg-stats-canvas px-3 py-2.5 text-xs leading-snug text-stats-secondary">
              <Info
                className="mt-0.5 size-3.5 shrink-0 text-stats-muted"
                aria-hidden
              />
              <p>
                A connect is any call where you reached your prospect — they
                answered, called back, booked, or said no.
              </p>
            </div>
          </>
        )}
      </div>

      <div className="border-t border-stats-card-line px-6 py-[22px]">
        <h2 className="text-base font-bold text-stats-ink">Meetings</h2>
        <p className="mt-0.5 text-[13px] text-stats-muted">This period</p>

        <div className="mt-4 flex flex-wrap items-baseline gap-9">
          <div className="flex items-baseline gap-2">
            <MetricNum
              value={String(rates.meetingsBooked)}
              empty={meetingsEmpty}
              className="text-[30px] leading-none font-bold"
            />
            <span
              className={cn(
                "text-[30px] leading-none font-bold",
                meetingsEmpty ? "text-stats-zero" : "text-stats-ink",
              )}
            >
              Booked
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <MetricNum
              value={
                rates.dialsPerMeeting == null
                  ? "~—"
                  : `~${Math.round(rates.dialsPerMeeting)}`
              }
              empty={meetingsEmpty}
              className="text-xl leading-none font-semibold"
            />
            <span className="text-xs text-stats-secondary">
              Dials per meeting
            </span>
          </div>
        </div>

        {meetingsByStep.length > 0 && (
          <div
            className="mt-5 flex flex-col gap-3"
            role="img"
            aria-label={meetingsByStep
              .map((s) => `${s.label}: ${s.booked}`)
              .join(", ")}
          >
            {meetingsByStep.map((s) => (
              <HBarRow
                key={s.order}
                label={s.label}
                fill="var(--stats-indigo-700)"
                widthPct={(s.booked / maxSource) * 100}
                value={
                  <MetricNum
                    value={String(s.booked)}
                    empty={s.booked === 0}
                    className="font-bold"
                  />
                }
              />
            ))}
          </div>
        )}
      </div>
    </StatsCard>
  )
}

function HBarRow({
  label,
  fill,
  widthPct,
  value,
}: {
  label: string
  fill: string
  widthPct: number
  value: React.ReactNode
}) {
  const w = Math.min(100, Math.max(0, widthPct))
  return (
    <div className="grid grid-cols-[110px_1fr_auto] items-center gap-3">
      <span className="truncate text-[13px] text-stats-secondary">{label}</span>
      <svg
        className="h-2.5 w-full"
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        aria-hidden
      >
        <rect width="100" height="10" rx="5" fill="var(--stats-track)" />
        <rect width={w} height="10" rx="5" fill={fill} />
      </svg>
      <span className="min-w-[3.25rem] text-right text-[13px] tabular-nums">
        {value}
      </span>
    </div>
  )
}
