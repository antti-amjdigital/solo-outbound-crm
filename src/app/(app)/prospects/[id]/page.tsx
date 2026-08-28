import { notFound } from "next/navigation"
import { ProspectDetailView } from "@/components/prospect-detail/prospect-detail-view"
import { getProspectDetail } from "@/lib/prospect-detail-query"

export default async function ProspectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const raw = await searchParams
  const data = await getProspectDetail(id, raw)
  if (!data) notFound()
  return <ProspectDetailView data={data} />
}
