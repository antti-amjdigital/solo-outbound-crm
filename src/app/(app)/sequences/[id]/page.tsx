import { redirect } from "next/navigation"
import { SequenceEditor } from "@/components/sequence/sequence-editor"
import {
  getSequenceEditorData,
  resolveSequenceId,
} from "@/lib/sequence-queries"

export default async function SequencePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: rawId } = await params
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
    <SequenceEditor
      key={data.steps.map((s) => s.id).join("-")}
      data={data}
    />
  )
}
