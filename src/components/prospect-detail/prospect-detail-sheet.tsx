"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { X } from "lucide-react"
import { ProspectDetailView } from "@/components/prospect-detail/prospect-detail-view"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import { prospectDisplayName } from "@/components/today/labels"
import { closeProspectPanelHref } from "@/lib/prospect-href"
import type { ProspectDetail } from "@/lib/prospect-detail-query"

export function ProspectDetailSheet({
  data,
}: {
  data: ProspectDetail | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function close() {
    router.push(
      closeProspectPanelHref({ pathname, search: searchParams }),
      { scroll: false },
    )
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <SheetContent
        showCloseButton={false}
        className="p-0"
        aria-describedby={undefined}
      >
        {/* Pipedrive-style round close on the panel’s left edge */}
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          data-sheet-close
          className="absolute top-4 -left-12 z-10 flex size-10 items-center justify-center rounded-full bg-white text-[#475569] shadow-[0_2px_8px_rgba(15,23,42,0.18)] ring-1 ring-[#e2e8f0] focus-visible:ring-2 focus-visible:ring-[#4f46e5]/40 focus-visible:outline-none"
        >
          <X className="size-4" strokeWidth={2.25} data-sheet-close-icon />
        </button>

        {data ? (
          <>
            <SheetTitle className="sr-only">
              {prospectDisplayName(data.prospect)}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Prospect detail
            </SheetDescription>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-none">
              <ProspectDetailView data={data} />
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
            <SheetTitle className="text-[16px] font-semibold text-[#0f172a]">
              Prospect not found
            </SheetTitle>
            <SheetDescription className="text-[13px] text-[#64748b]">
              It may have been deleted.
            </SheetDescription>
            <button
              type="button"
              onClick={close}
              className="mt-2 text-[13px] font-semibold text-[#4f46e5] hover:underline"
            >
              Close
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
