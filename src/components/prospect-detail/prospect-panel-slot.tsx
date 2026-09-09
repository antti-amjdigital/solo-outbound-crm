import { ProspectDetailSheet } from "@/components/prospect-detail/prospect-detail-sheet"
import { getProspectDetail } from "@/lib/prospect-detail-query"
import { parseProspectPanelId } from "@/lib/prospect-href"

/** Renders the prospect sidebar when `?p=` is present on the current page. */
export async function ProspectPanelSlot({
  raw,
}: {
  raw: Record<string, string | string[] | undefined>
}) {
  const id = parseProspectPanelId(raw)
  if (!id) return null
  const data = await getProspectDetail(id, raw)
  return <ProspectDetailSheet data={data} />
}
