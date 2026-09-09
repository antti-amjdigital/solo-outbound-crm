import { Suspense } from "react"
import { GlobalSearch } from "@/components/global-search/global-search"
import { ProspectPanelSlot } from "@/components/prospect-detail/prospect-panel-slot"
import { Skeleton } from "@/components/ui/skeleton"
import { ProspectsList } from "@/components/prospects/prospects-list"
import { parseProspectPanelId } from "@/lib/prospect-href"
import { getProspectList } from "@/lib/prospect-queries"

export const runtime = "nodejs"

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const raw = await searchParams
  const panelId = parseProspectPanelId(raw)

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-stats-canvas">
      <header className="flex shrink-0 items-center gap-6 border-b border-stats-card-line bg-white px-8 py-5">
        <h1 className="shrink-0 text-[22px] font-bold tracking-[-0.3px] text-stats-ink">
          Prospects
        </h1>
        <div className="mx-auto flex w-full max-w-[520px] justify-center">
          <GlobalSearch
            className="w-full"
            defaultQuery={typeof raw.q === "string" ? raw.q : ""}
          />
        </div>
        <Suspense fallback={<Skeleton className="h-4 w-24 shrink-0" />}>
          <HeaderCount raw={raw} />
        </Suspense>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-4 py-6 sm:px-0">
          <Suspense fallback={<ListSkeleton />}>
            <ProspectsBody raw={raw} openId={panelId} />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={<ProspectPanelFallback />}>
        <ProspectPanelSlot raw={raw} />
      </Suspense>
    </div>
  )
}

async function HeaderCount({
  raw,
}: {
  raw: Record<string, string | string[] | undefined>
}) {
  const data = await getProspectList(raw)
  const label =
    data.totalUnfiltered === 1
      ? "1 prospect"
      : `${data.totalUnfiltered} prospects`
  return (
    <span className="shrink-0 text-[13px] whitespace-nowrap text-stats-muted">
      {label}
    </span>
  )
}

async function ProspectsBody({
  raw,
  openId,
}: {
  raw: Record<string, string | string[] | undefined>
  openId?: string
}) {
  const data = await getProspectList(raw)

  return (
    <ProspectsList
      rows={data.rows}
      filters={data.filters}
      sequences={data.sequences}
      sources={data.sources}
      total={data.total}
      totalUnfiltered={data.totalUnfiltered}
      openId={openId}
    />
  )
}

function ProspectPanelFallback() {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/20"
      aria-busy
      aria-label="Loading prospect"
    >
      <div className="absolute inset-y-0 right-0 flex h-dvh w-full max-w-[min(1100px,calc(100vw-2.5rem))] flex-col bg-white shadow-[-8px_0_40px_rgba(15,23,42,0.12)]">
        <div className="border-b border-[#e8edf4] px-8 py-4">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex flex-1 gap-6 p-8">
          <Skeleton className="h-64 w-[330px] shrink-0 rounded-xl" />
          <Skeleton className="h-full min-w-0 flex-1 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[38px] w-72" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}
