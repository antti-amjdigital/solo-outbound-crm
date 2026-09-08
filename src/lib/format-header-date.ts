import { TZDate } from "@date-fns/tz"
import { APP_TZ } from "@/lib/dates"

/** e.g. "Sunday 30 Aug" in APP_TZ. */
export function formatHeaderDate(now: Date = new Date()): string {
  const zoned = new TZDate(now, APP_TZ)
  const weekday = zoned.toLocaleDateString("en-GB", {
    weekday: "long",
    timeZone: APP_TZ,
  })
  const dayMonth = zoned.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: APP_TZ,
  })
  return `${weekday} ${dayMonth}`
}
