import { redirect } from "next/navigation"
import { prospectPanelRedirectHref } from "@/lib/prospect-href"

export default async function ProspectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const raw = await searchParams
  redirect(prospectPanelRedirectHref(id, raw))
}
