import { Suspense } from "react"
import { redirect } from "next/navigation"
import { ProspectPanelSlot } from "@/components/prospect-detail/prospect-panel-slot"
import { SequenceEditor } from "@/components/sequence/sequence-editor"
import {
  getSequenceEditorData,
  resolveSequenceId,
} from "@/lib/sequence-queries"

export default async function SequencePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id: rawId } = await params
  const raw = await searchParams
  const id = await resolveSequenceId(rawId)
  if (!id) {
    return (
      <div className="p-8 text-sm text-dim">
        No sequences yet. Seed the database to create Standard Outbound.
      </div>
    )
  }
  if (rawId === "default") redirect(`/sequences/${id}`)

  const data = await getSequenceEditorData(id)
  return (
    <>
      <SequenceEditor
        key={data.steps.map((s) => s.id).join("-")}
        data={data}
      />
      <Suspense fallback={null}>
        <ProspectPanelSlot raw={raw} />
      </Suspense>
    </>
  )
}
