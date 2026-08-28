import { Suspense } from "react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ProspectFilters } from "@/components/prospects/prospect-filters"
import { ProspectsTable } from "@/components/prospects/prospects-table"
import { getProspectList } from "@/lib/prospect-queries"

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const raw = await searchParams

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3.5 border-b border-border px-4 py-3">
        <h1 className="text-xl font-bold tracking-tight">Prospects</h1>
        <form action="/prospects" method="get" className="mx-auto w-full max-w-md">
          <Input
            name="q"
            defaultValue={typeof raw.q === "string" ? raw.q : ""}
            placeholder="Search prospects, companies, numbers…"
            className="h-8 bg-surface text-xs"
          />
        </form>
      </div>

      <Suspense fallback={<ListSkeleton />}>
        <ProspectsBody raw={raw} />
      </Suspense>
    </div>
  )
}

async function ProspectsBody({
  raw,
}: {
  raw: Record<string, string | string[] | undefined>
}) {
  const data = await getProspectList(raw)

  return (
    <>
      <ProspectFilters
        filters={data.filters}
        sequences={data.sequences}
        sources={data.sources}
        matchCount={data.total}
        totalUnfiltered={data.totalUnfiltered}
      />
      <ProspectsTable
        rows={data.rows}
        filters={data.filters}
        sequences={data.sequences}
        total={data.total}
      />
    </>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}
