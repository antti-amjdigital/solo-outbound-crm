import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { QueueFilters } from "@/components/today/queue-filters"
import { TodayQueue } from "@/components/today/today-queue"
import { getTodayQueue } from "@/lib/queries"

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const raw = await searchParams
  const { open, done, counts, filters } = await getTodayQueue(raw)
  const totalVisible = open.length

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3.5 border-b border-border px-4 py-3">
        <h1 className="text-xl font-bold tracking-tight">Activities</h1>
        <form action="/" method="get" className="mx-auto w-full max-w-md">
          {filters.type !== "all" && (
            <input type="hidden" name="type" value={filters.type} />
          )}
          {filters.range !== "today" && (
            <input type="hidden" name="range" value={filters.range} />
          )}
          <Input
            id="today-search"
            name="q"
            defaultValue={filters.q}
            placeholder="Search prospects, companies, numbers…  (/)"
            className="h-8 bg-surface text-xs"
          />
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
        <Button size="sm" nativeButton={false} render={<Link href="/prospects" />}>
          Enroll prospects
        </Button>
        <span className="ml-auto text-xs text-dim">
          {totalVisible} {totalVisible === 1 ? "activity" : "activities"}
        </span>
      </div>

      <QueueFilters filters={filters} counts={counts} />

      <div className="min-h-0 flex-1 overflow-auto">
        <TodayQueue open={open} done={done} />
      </div>
    </div>
  )
}
