import { Suspense } from "react"
import { ProspectPanelSlot } from "@/components/prospect-detail/prospect-panel-slot"
import { ImportWizard } from "@/components/import/import-wizard"

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const raw = await searchParams
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <ImportWizard />
      <Suspense fallback={null}>
        <ProspectPanelSlot raw={raw} />
      </Suspense>
    </div>
  )
}
